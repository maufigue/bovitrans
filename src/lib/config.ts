export const env = {
  databaseUrl: process.env.DATABASE_URL,
  fuelCostPerLiter: Number(process.env.FUEL_COST_PER_LITER ?? 1.45),
  fuelPriceProduct: process.env.FUEL_PRICE_PRODUCT ?? "Diésel Porã",
};

export function requireDatabaseUrl() {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL es requerida para conectar con PostgreSQL.");
  }

  return env.databaseUrl;
}

export function getFuelCostPerLiter() {
  if (!Number.isFinite(env.fuelCostPerLiter) || env.fuelCostPerLiter <= 0) {
    return 1.45;
  }

  return env.fuelCostPerLiter;
}

export function getFuelPriceProduct() {
  return env.fuelPriceProduct.trim() || "Diésel Porã";
}
