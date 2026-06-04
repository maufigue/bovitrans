import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/http/responses";
import { assignTruckToTransportRequest } from "@/lib/repositories/transport-requests";
import { parseAssignTruckInput } from "@/lib/validation/transport-requests";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const input = parseAssignTruckInput(payload);
    const assignment = await assignTruckToTransportRequest(id, input);

    return ok(assignment);
  } catch (error) {
    return handleApiError(error);
  }
}
