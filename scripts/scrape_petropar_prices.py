from __future__ import annotations

import argparse
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser
from typing import Iterable
from urllib.request import Request, urlopen

SOURCE_URL = "https://www.petropar.gov.py/?page_id=4460"
COMPARISON_URL = "https://combustibles.com.py/"


@dataclass(frozen=True)
class FuelPrice:
    brand: str
    fuel_type: str
    product_name: str
    price_pyg: int
    valid_from: str | None


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._in_cell = False
        self._cell_parts: list[str] = []
        self._current_row: list[str] = []
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"td", "th"}:
            self._in_cell = True
            self._cell_parts = []

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._cell_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"td", "th"} and self._in_cell:
            text = normalize_text(" ".join(self._cell_parts))
            if text:
                self._current_row.append(text)
            self._in_cell = False
        elif tag == "tr" and self._current_row:
            self.rows.append(self._current_row)
            self._current_row = []


class TextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        value = normalize_text(data)
        if value:
            self.parts.append(value)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def parse_price(value: str) -> int:
    digits = re.sub(r"\D", "", value)
    if not digits:
        raise ValueError(f"Precio invalido: {value!r}")
    return int(digits)


def parse_date(value: str) -> str:
    return datetime.strptime(value, "%d/%m/%Y").date().isoformat()


def fetch_html(source_url: str, timeout: int) -> str:
    request = Request(
        source_url,
        headers={
            "User-Agent": "BoviTrans/1.0 (+https://localhost)",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        raw_html = response.read()

    if charset.lower() in {"iso-8859-2", "windows-1250"}:
        charset = "cp1252"

    return raw_html.decode(charset, errors="replace")


def extract_prices(html: str) -> list[FuelPrice]:
    parser = TableParser()
    parser.feed(html)

    prices: list[FuelPrice] = []
    for row in parser.rows:
        if len(row) < 3:
            continue

        product, price, valid_from = row[:3]
        if "producto" in product.lower() or not re.search(r"\d", price):
            continue
        if not re.search(r"di[eé]sel", product, re.IGNORECASE):
            continue

        try:
            prices.append(
                FuelPrice(
                    brand="Petropar",
                    fuel_type=(
                        "Diésel Premium"
                        if re.search(r"mbarete|premium", product, re.IGNORECASE)
                        else "Diésel Común"
                    ),
                    product_name=product,
                    price_pyg=parse_price(price),
                    valid_from=parse_date(valid_from),
                ),
            )
        except ValueError:
            continue

    if not prices:
        raise RuntimeError("No se encontraron precios de combustible en la pagina.")

    return prices


def extract_comparison_prices(html: str) -> list[FuelPrice]:
    parser = TextParser()
    parser.feed(html)
    text = " ".join(parser.parts)
    prices: list[FuelPrice] = []

    for fuel_type in ("Diésel Común", "Diésel Premium"):
        start = text.find(fuel_type)
        if start < 0:
            continue
        next_start = text.find("Diésel ", start + len(fuel_type))
        section = text[start : next_start if next_start >= 0 else None]

        for brand in ("Petropar", "Shell", "Petrobras", "Copetrol"):
            match = re.search(rf"{brand}\s+([\d.]+)", section)
            if match:
                prices.append(
                    FuelPrice(
                        brand=brand,
                        fuel_type=fuel_type,
                        product_name=fuel_type,
                        price_pyg=parse_price(match.group(1)),
                        valid_from=None,
                    ),
                )

    return prices


def insert_prices(database_url: str, prices: Iterable[FuelPrice], source_url: str) -> int:
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "Falta psycopg. Instala dependencias con: "
            "python -m pip install -r scripts/requirements.txt",
        ) from exc

    inserted = 0
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            for price in prices:
                cursor.execute(
                    """
                    INSERT INTO fuel_prices (
                      brand, fuel_type, product_name, price_pyg, valid_from, source_url
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (brand, fuel_type, price_pyg, valid_from, source_url)
                    DO NOTHING
                    """,
                    (
                        price.brand,
                        price.fuel_type,
                        price.product_name,
                        price.price_pyg,
                        price.valid_from,
                        source_url,
                    ),
                )
                inserted += cursor.rowcount
    return inserted


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Scrapea precios vigentes de Petropar e inserta snapshots en PostgreSQL.",
    )
    parser.add_argument("--source-url", default=SOURCE_URL)
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--timeout", default=20, type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--interval-hours",
        default=None,
        type=float,
        help="Si se define, ejecuta el scraping en bucle cada N horas.",
    )
    return parser


def scrape_once(args: argparse.Namespace) -> int:
    html = fetch_html(args.source_url, args.timeout)
    prices = extract_prices(html)
    comparison_prices = extract_comparison_prices(
        fetch_html(COMPARISON_URL, args.timeout),
    )

    for price in prices:
        print(f"{price.product_name} | G. {price.price_pyg:,} | {price.valid_from}")
    for price in comparison_prices:
        print(f"{price.brand} | {price.fuel_type} | G. {price.price_pyg:,}")

    if args.dry_run:
        print(
            f"Dry run: {len(prices) + len(comparison_prices)} precios detectados, "
            "sin insertar en DB.",
        )
        return 0

    if not args.database_url:
        print("DATABASE_URL es requerido para insertar en PostgreSQL.", file=sys.stderr)
        return 2

    inserted = insert_prices(args.database_url, prices, args.source_url)
    inserted += insert_prices(args.database_url, comparison_prices, COMPARISON_URL)
    skipped = len(prices) + len(comparison_prices) - inserted
    print(f"Insertados: {inserted}. Existentes/sin cambios: {skipped}.")
    return 0


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")

    args = build_parser().parse_args()

    if args.interval_hours is None:
        return scrape_once(args)

    if args.interval_hours <= 0:
        print("--interval-hours debe ser mayor a 0.", file=sys.stderr)
        return 2

    wait_seconds = int(args.interval_hours * 60 * 60)
    print(f"Scraper recurrente iniciado. Intervalo: {args.interval_hours:g} horas.")

    while True:
        try:
            scrape_once(args)
        except Exception as exc:
            print(f"Error durante scraping Petropar: {exc}", file=sys.stderr)

        print(f"Proxima ejecucion en {args.interval_hours:g} horas.", flush=True)
        time.sleep(wait_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
