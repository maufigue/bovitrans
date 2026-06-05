import { NextRequest } from "next/server";
import { query } from "@/lib/db/pool";
import { badRequest } from "@/lib/http/errors";
import { created, handleApiError } from "@/lib/http/responses";
import { createTransportRequest } from "@/lib/repositories/transport-requests";

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePhone(countryCode: string, phone: string) {
  const code = countryCode.replace(/\D/g, "") || "595";
  const local = phone.replace(/\D/g, "").replace(/^0+/, "");
  return `+${code}${local}`;
}

function detectDocumentType(documentNumber: string) {
  return /-\d$/.test(documentNumber.trim()) ? 1 : 2;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const name = normalizeText(payload.name);
    const documentNumber = normalizeText(payload.documentNumber);
    const phoneCountryCode = normalizeText(payload.phoneCountryCode) ?? "+595";
    const phoneNumber = normalizeText(payload.phoneNumber);
    const cityId = Number(payload.cityId);

    if (!name || !documentNumber || !phoneNumber || !Number.isInteger(cityId) || cityId <= 0) {
      throw badRequest("Todos los campos son requeridos.");
    }

    const documentTypeId = detectDocumentType(documentNumber);
    const cityResult = await query<{ id: number; city_name: string }>(
      "SELECT id, city_name FROM cities WHERE id = $1 LIMIT 1",
      [cityId],
    );
    const city = cityResult.rows[0];
    if (!city) {
      throw badRequest("Ciudad inválida.");
    }
    const phone = normalizePhone(phoneCountryCode, phoneNumber);

    const clientResult = await query<{ id: string; business_name: string }>(
      `
        INSERT INTO clients (
          company_name, business_name, document_number, document_type_id,
          phone_number, city_id
        )
        VALUES ($1, $1, $2, $3, $4, $5)
        ON CONFLICT (document_type_id, document_number)
        DO UPDATE SET
          phone_number = EXCLUDED.phone_number,
          city_id = EXCLUDED.city_id
        RETURNING id, business_name
      `,
      [name, documentNumber, documentTypeId, phone, city.id],
    );
    const client = clientResult.rows[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const notes = [
      "Solicitud externa creada desde la web pública.",
      `Ciudad informada: ${city.city_name}.`,
      "Pendiente consultar punto de origen, destino, fecha, hora y cantidad de cabezas.",
    ].join(" ");

    const transportRequest = await createTransportRequest({
      clientId: client.id,
      clientName: client.business_name,
      cattleCount: 1,
      cattleWeightMinKg: 400,
      cattleWeightMaxKg: 500,
      originName: "Origen pendiente",
      originLat: -25.2867,
      originLng: -57.647,
      destinationName: "Destino pendiente",
      destinationLat: -25.2967,
      destinationLng: -57.637,
      departureAt: tomorrow,
      notes,
      source: "external",
      routePending: true,
    });

    return created(transportRequest);
  } catch (error) {
    return handleApiError(error);
  }
}
