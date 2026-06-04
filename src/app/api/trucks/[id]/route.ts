import { NextRequest } from "next/server";
import { deleteTruck, getTruckById, updateTruck } from "@/lib/repositories/trucks";
import { handleApiError, noContent, ok } from "@/lib/http/responses";
import { parseUpdateTruckInput } from "@/lib/validation/trucks";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const truck = await getTruckById(id);

    return ok(truck);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const input = parseUpdateTruckInput(payload);
    const truck = await updateTruck(id, input);

    return ok(truck);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteTruck(id);

    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
}
