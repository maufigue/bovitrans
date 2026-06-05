import { NextRequest } from "next/server";
import {
  requestStatuses,
  type TransportRequestStatus,
} from "@/lib/domain/types";
import { badRequest } from "@/lib/http/errors";
import { created, handleApiError, ok } from "@/lib/http/responses";
import {
  createTransportRequest,
  listTransportRequests,
} from "@/lib/repositories/transport-requests";
import { parseCreateTransportRequestInput } from "@/lib/validation/transport-requests";

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    let status: TransportRequestStatus | undefined;

    if (statusParam) {
      if (!requestStatuses.includes(statusParam as TransportRequestStatus)) {
        throw badRequest("El filtro de estado de la solicitud no es válido.");
      }

      status = statusParam as TransportRequestStatus;
    }

    const requests = await listTransportRequests({ status });

    return ok(requests);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const input = parseCreateTransportRequestInput(payload);
    const transportRequest = await createTransportRequest(input);

    return created(transportRequest);
  } catch (error) {
    return handleApiError(error);
  }
}
