import type { PoolClient, QueryResultRow } from "pg";
import { query } from "@/lib/db/pool";
import { notFound } from "@/lib/http/errors";

const PETROPAR_URL = "https://www.petropar.gov.py/?page_id=4460";
const COMPARISON_URL = "https://combustibles.com.py/";

type FuelPriceRow = QueryResultRow & {
  id: string;
  brand: string;
  fuel_type: string;
  product_name: string;
  price_pyg: number;
  valid_from: Date | null;
  source_url: string;
  scraped_at: Date;
  created_at: Date;
};

export type FuelPrice = {
  id: string;
  brand: string;
  fuelType: string;
  productName: string;
  pricePyg: number;
  validFrom: string | null;
  sourceUrl: string;
  scrapedAt: string;
  createdAt: string;
  official: boolean;
};

export type FuelPriceSource = {
  id: string;
  brand: string;
  fuelType: string;
  productName: string;
  pricePerLiter: number;
  currency: "PYG";
  validFrom: string | null;
  sourceUrl: string;
  scrapedAt: string;
  source: "petropar" | "comparison";
};

type ScrapedPrice = {
  brand: string;
  fuelType: string;
  productName: string;
  pricePyg: number;
  validFrom: string | null;
  sourceUrl: string;
};

function mapFuelPrice(row: FuelPriceRow): FuelPrice {
  return {
    id: row.id,
    brand: row.brand,
    fuelType: row.fuel_type,
    productName: row.product_name,
    pricePyg: Number(row.price_pyg),
    validFrom: row.valid_from?.toISOString().slice(0, 10) ?? null,
    sourceUrl: row.source_url,
    scrapedAt: row.scraped_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    official: row.brand === "Petropar" && row.source_url.includes("petropar.gov.py"),
  };
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&aacute;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(value: string) {
  return Number(value.replace(/\D/g, ""));
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "BoviTrans/1.0" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Fuel source returned ${response.status}.`);
  return response.text();
}

function extractComparisonPrices(html: string): ScrapedPrice[] {
  const text = decodeHtml(html);
  const prices: ScrapedPrice[] = [];

  for (const fuelType of ["Diésel Común", "Diésel Premium"]) {
    const start = text.indexOf(fuelType);
    if (start < 0) continue;
    const nextStart = text.indexOf("Diésel ", start + fuelType.length);
    const section = text.slice(start, nextStart < 0 ? undefined : nextStart);

    for (const brand of ["Petropar", "Shell", "Petrobras", "Copetrol"]) {
      const match = section.match(new RegExp(`${brand}\\s+([\\d.]+)`));
      if (!match) continue;
      prices.push({
        brand,
        fuelType,
        productName: fuelType,
        pricePyg: parsePrice(match[1]),
        validFrom: null,
        sourceUrl: COMPARISON_URL,
      });
    }
  }

  return prices;
}

function extractPetroparPrices(html: string): ScrapedPrice[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const prices: ScrapedPrice[] = [];

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
      (cell) => decodeHtml(cell[1]),
    );
    if (cells.length < 3 || !/di[eé]sel/i.test(cells[0])) continue;
    const fuelType = /mbarete|premium/i.test(cells[0])
      ? "Diésel Premium"
      : "Diésel Común";
    const [day, month, year] = cells[2].split("/");
    prices.push({
      brand: "Petropar",
      fuelType,
      productName: cells[0],
      pricePyg: parsePrice(cells[1]),
      validFrom: year && month && day ? `${year}-${month}-${day}` : null,
      sourceUrl: PETROPAR_URL,
    });
  }

  return prices;
}

async function insertScrapedPrices(prices: ScrapedPrice[]) {
  let inserted = 0;
  for (const price of prices) {
    const result = await query(
      `INSERT INTO fuel_prices (
        brand, fuel_type, product_name, price_pyg, valid_from, source_url
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (brand, fuel_type, price_pyg, valid_from, source_url) DO NOTHING`,
      [
        price.brand,
        price.fuelType,
        price.productName,
        price.pricePyg,
        price.validFrom,
        price.sourceUrl,
      ],
    );
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

export async function refreshFuelPrices() {
  const [comparisonResult, petroparResult] = await Promise.allSettled([
    fetchHtml(COMPARISON_URL).then(extractComparisonPrices),
    fetchHtml(PETROPAR_URL).then(extractPetroparPrices),
  ]);
  const comparison =
    comparisonResult.status === "fulfilled" ? comparisonResult.value : [];
  const petropar = petroparResult.status === "fulfilled" ? petroparResult.value : [];
  const prices = [...comparison, ...petropar];
  if (prices.length === 0) throw new Error("No fuel prices were found.");

  return {
    detected: prices.length,
    inserted: await insertScrapedPrices(prices),
    sources: {
      comparison: comparison.length,
      petropar: petropar.length,
    },
  };
}

export async function listFuelPrices(options: { limit?: number } = {}) {
  const limit = options.limit ?? 30;
  const result = await query<FuelPriceRow>(
    `SELECT DISTINCT ON (brand, fuel_type)
      id, brand, fuel_type, product_name, price_pyg, valid_from, source_url,
      scraped_at, created_at
     FROM fuel_prices
     ORDER BY brand, fuel_type, valid_from DESC NULLS LAST, scraped_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map(mapFuelPrice);
}

export async function getFuelPriceById(
  client: PoolClient,
  id: string,
): Promise<FuelPriceSource> {
  const result = await client.query<FuelPriceRow>(
    `SELECT id, brand, fuel_type, product_name, price_pyg, valid_from,
      source_url, scraped_at, created_at
     FROM fuel_prices WHERE id = $1`,
    [id],
  );
  const price = result.rows[0];
  if (!price) throw notFound("Precio de combustible no encontrado.");

  return {
    id: price.id,
    brand: price.brand,
    fuelType: price.fuel_type,
    productName: price.product_name,
    pricePerLiter: Number(price.price_pyg),
    currency: "PYG",
    validFrom: price.valid_from?.toISOString().slice(0, 10) ?? null,
    sourceUrl: price.source_url,
    scrapedAt: price.scraped_at.toISOString(),
    source: price.source_url.includes("petropar.gov.py") ? "petropar" : "comparison",
  };
}
