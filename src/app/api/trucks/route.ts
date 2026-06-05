import { NextRequest } from "next/server";
import { truckStatuses, type TruckStatus } from "@/lib/domain/types";
import { badRequest } from "@/lib/http/errors";
import { created, handleApiError, ok } from "@/lib/http/responses";
import { createTruck, listTrucks } from "@/lib/repositories/trucks";
import { parseCreateTruckInput } from "@/lib/validation/trucks";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get("status");
    const capacityParam = searchParams.get("available_for_capacity");

    let status: TruckStatus | undefined;
    let availableForCapacity: number | undefined;

    if (statusParam) {
      if (!truckStatuses.includes(statusParam as TruckStatus)) {
        throw badRequest("El filtro de estado del camión no es válido.");
      }

      status = statusParam as TruckStatus;
    }

    if (capacityParam) {
      const parsedCapacity = Number(capacityParam);

      if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
        throw badRequest("La capacidad requerida debe ser un número entero positivo.");
      }

      availableForCapacity = parsedCapacity;
    }

    const trucks = await listTrucks({ status, availableForCapacity });

    return ok(trucks);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const input = parseCreateTruckInput(payload);
    const truck = await createTruck(input);

    return created(truck);
  } catch (error) {
    return handleApiError(error);
  }
}
