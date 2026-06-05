import { NextRequest } from "next/server";
import { deleteUser, getUserById, updateUser } from "@/lib/repositories/users";
import { handleApiError, noContent, ok } from "@/lib/http/responses";
import { parseUpdateUserInput } from "@/lib/validation/users";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserById(id);

    return ok(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const input = parseUpdateUserInput(payload);
    const user = await updateUser(id, input);

    return ok(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteUser(id);

    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
}
