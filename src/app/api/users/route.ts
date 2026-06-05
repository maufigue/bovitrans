import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/lib/http/responses";
import { createUser, listUsers } from "@/lib/repositories/users";
import { parseCreateUserInput } from "@/lib/validation/users";

export async function GET() {
  try {
    const users = await listUsers();

    return ok(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const input = parseCreateUserInput(payload);
    const user = await createUser(input);

    return created(user);
  } catch (error) {
    return handleApiError(error);
  }
}
