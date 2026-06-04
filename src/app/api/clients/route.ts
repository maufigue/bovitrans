import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/lib/http/responses";
import { createClient, listClients } from "@/lib/repositories/clients";
import { parseCreateClientInput } from "@/lib/validation/clients";

export async function GET(request: NextRequest) {
  try {
    return ok(await listClients(request.nextUrl.searchParams.get("search") ?? undefined));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await createClient(parseCreateClientInput(await request.json()));
    return created(client);
  } catch (error) {
    return handleApiError(error);
  }
}
