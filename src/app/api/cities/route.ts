import { handleApiError, ok } from "@/lib/http/responses";
import { listCities } from "@/lib/repositories/cities";

export async function GET() {
  try {
    return ok(await listCities());
  } catch (error) {
    return handleApiError(error);
  }
}
