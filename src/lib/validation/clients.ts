import { badRequest } from "@/lib/http/errors";
import { isRecord, normalizeString } from "@/lib/validation/common";

export type CreateClientInput = {
  companyName: string;
  businessName: string;
  documentNumber: string;
  documentTypeId: number;
  phoneNumber: string;
  cityId: number;
  email: string | null;
};

export type UpdateClientInput = Partial<CreateClientInput>;

function validateClientPayload(payload: Record<string, unknown>, partial: boolean) {
  const input: UpdateClientInput = {};
  const errors: Record<string, string> = {};
  const fieldLabels = {
    companyName: "Nombre de empresa",
    businessName: "Razón social",
    documentNumber: "Número de documento",
    phoneNumber: "Número de teléfono",
    documentTypeId: "Tipo de documento",
    cityId: "Ciudad",
  } as const;

  for (const field of [
    "companyName",
    "businessName",
    "documentNumber",
    "phoneNumber",
  ] as const) {
    if (partial && payload[field] === undefined) continue;

    const value = normalizeString(payload[field]);

    if (!value) {
      errors[field] = `${fieldLabels[field]} es requerido.`;
    } else {
      input[field] = value;
    }
  }

  for (const field of ["documentTypeId", "cityId"] as const) {
    if (partial && payload[field] === undefined) continue;
    const value = Number(payload[field]);

    if (!Number.isInteger(value) || value <= 0) {
      errors[field] = `${fieldLabels[field]} debe ser un número entero positivo.`;
    } else {
      input[field] = value;
    }
  }

  if (!partial || payload.email !== undefined) {
    const email = normalizeString(payload.email);

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "El correo debe tener un formato válido.";
    } else {
      input.email = email || null;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw badRequest("Datos del cliente no válidos.", errors);
  }

  if (partial && Object.keys(input).length === 0) {
    throw badRequest("Debe informar al menos un campo para actualizar.");
  }

  return input;
}

export function parseCreateClientInput(payload: unknown): CreateClientInput {
  if (!isRecord(payload)) throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");

  return validateClientPayload(payload, false) as CreateClientInput;
}

export function parseUpdateClientInput(payload: unknown): UpdateClientInput {
  if (!isRecord(payload)) throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");

  return validateClientPayload(payload, true);
}
