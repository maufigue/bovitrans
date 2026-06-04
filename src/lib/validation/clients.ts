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

  for (const field of [
    "companyName",
    "businessName",
    "documentNumber",
    "phoneNumber",
  ] as const) {
    if (partial && payload[field] === undefined) continue;

    const value = normalizeString(payload[field]);

    if (!value) {
      errors[field] = `${field} is required.`;
    } else {
      input[field] = value;
    }
  }

  for (const field of ["documentTypeId", "cityId"] as const) {
    if (partial && payload[field] === undefined) continue;
    const value = Number(payload[field]);

    if (!Number.isInteger(value) || value <= 0) {
      errors[field] = `${field} must be a positive integer.`;
    } else {
      input[field] = value;
    }
  }

  if (!partial || payload.email !== undefined) {
    const email = normalizeString(payload.email);

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "email must be a valid email address.";
    } else {
      input.email = email || null;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw badRequest("Invalid client payload.", errors);
  }

  if (partial && Object.keys(input).length === 0) {
    throw badRequest("At least one field must be provided.");
  }

  return input;
}

export function parseCreateClientInput(payload: unknown): CreateClientInput {
  if (!isRecord(payload)) throw badRequest("Request body must be a JSON object.");

  return validateClientPayload(payload, false) as CreateClientInput;
}

export function parseUpdateClientInput(payload: unknown): UpdateClientInput {
  if (!isRecord(payload)) throw badRequest("Request body must be a JSON object.");

  return validateClientPayload(payload, true);
}
