import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/http/responses";
import {
  getTransportRequestById,
  updateTransportRequest,
} from "@/lib/repositories/transport-requests";
import { parseUpdateTransportRequestInput } from "@/lib/validation/transport-requests";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const transportRequest = await getTransportRequestById(id);

    return ok(transportRequest);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const input = parseUpdateTransportRequestInput(payload);
    const transportRequest = await updateTransportRequest(id, input);

    return ok(transportRequest);
  } catch (error) {
    return handleApiError(error);
  }
}
