import { NextRequest } from "next/server";
import { badRequest } from "@/lib/http/errors";
import { handleApiError, ok } from "@/lib/http/responses";
import { listFuelPrices, refreshFuelPrices } from "@/lib/repositories/fuel-prices";

export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 20;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw badRequest("El límite debe ser un número entero entre 1 y 100.");
    }

    const fuelPrices = await listFuelPrices({ limit });

    return ok(fuelPrices);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST() {
  try {
    return ok(await refreshFuelPrices());
  } catch (error) {
    return handleApiError(error);
  }
}
