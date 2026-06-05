# Scraper de precios de combustible

Scraper multifuente de precios de diésel desde:

- PETROPAR (precios oficiales y vigencia):
  https://www.petropar.gov.py/?page_id=4460
- Combustibles.com.py (precios orientativos por emblema):
  https://combustibles.com.py/

## Ejecución local

```powershell
python -m pip install -r scripts\requirements.txt
python scripts\scrape_petropar_prices.py --dry-run
python scripts\scrape_petropar_prices.py --database-url "postgresql://bovitrans:bovitrans_pass@127.0.0.1:5432/bovitrans"
```

## Ejecución Docker one-shot

```powershell
docker compose --profile scraper build fuel-scraper
docker compose --profile scraper run --rm fuel-scraper python scripts/scrape_petropar_prices.py
```

## Ejecución diaria Docker

```powershell
docker compose --profile scraper up -d fuel-scraper
```

El servicio ejecuta el scraping cada 24 horas. La inserción es idempotente por
`brand`, `fuel_type`, `price_pyg`, `valid_from` y `source_url`, por lo que una
corrida sin cambios no duplica datos.

La API también permite ejecutar una actualización manual desde el dashboard
mediante `POST /api/fuel-prices`.
