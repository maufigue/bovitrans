import { NextRequest } from "next/server";
import { handleApiError, noContent, ok } from "@/lib/http/responses";
import {
  deleteClient,
  getClientById,
  updateClient,
} from "@/lib/repositories/clients";
import { parseUpdateClientInput } from "@/lib/validation/clients";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    return ok(await getClientById((await context.params).id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const client = await updateClient(
      (await context.params).id,
      parseUpdateClientInput(await request.json()),
    );
    return ok(client);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await deleteClient((await context.params).id);
    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
}
