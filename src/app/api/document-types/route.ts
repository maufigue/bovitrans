import { handleApiError, ok } from "@/lib/http/responses";
import { listDocumentTypes } from "@/lib/repositories/document-types";

export async function GET() {
  try {
    return ok(await listDocumentTypes());
  } catch (error) {
    return handleApiError(error);
  }
}
