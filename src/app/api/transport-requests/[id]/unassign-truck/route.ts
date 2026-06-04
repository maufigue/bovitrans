import { handleApiError, ok } from "@/lib/http/responses";
import { unassignTruckFromTransportRequest } from "@/lib/repositories/transport-requests";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const request = await unassignTruckFromTransportRequest(id);

    return ok(request);
  } catch (error) {
    return handleApiError(error);
  }
}
