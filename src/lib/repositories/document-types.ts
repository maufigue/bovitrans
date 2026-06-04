import { query } from "@/lib/db/pool";
import type { DocumentType } from "@/lib/domain/types";

type DocumentTypeRow = {
  id: number;
  document_type: string;
};

export async function listDocumentTypes(): Promise<DocumentType[]> {
  const result = await query<DocumentTypeRow>(
    "SELECT id, document_type FROM document_types ORDER BY id ASC",
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.document_type,
  }));
}
