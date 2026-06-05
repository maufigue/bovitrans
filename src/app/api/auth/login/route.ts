import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/http/responses";
import { loginUser } from "@/lib/repositories/users";
import { parseLoginInput } from "@/lib/validation/users";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const input = parseLoginInput(payload);
    const user = await loginUser(input);

    return ok(user);
  } catch (error) {
    return handleApiError(error);
  }
}
