import { badRequest } from "@/lib/http/errors";
import { isRecord, normalizePositiveInteger, normalizePositiveNumber, normalizeString } from "@/lib/validation/common";
import { truckStatuses, type TruckStatus } from "@/lib/domain/types";

export type CreateTruckInput = {
  licensePlate: string;
  maxCapacity: number;
  fuelConsumptionPerKm: number;
  status?: TruckStatus;
};

export type UpdateTruckInput = Partial<CreateTruckInput>;

function normalizeTruckStatus(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  if (!truckStatuses.includes(value as TruckStatus)) {
    return null;
  }

  return value as TruckStatus;
}

export function parseCreateTruckInput(payload: unknown): CreateTruckInput {
  if (!isRecord(payload)) {
    throw badRequest("Request body must be a JSON object.");
  }

  const licensePlate = normalizeString(payload.licensePlate)?.toUpperCase();
  const maxCapacity = normalizePositiveInteger(payload.maxCapacity);
  const fuelConsumptionPerKm = normalizePositiveNumber(payload.fuelConsumptionPerKm);
  const status =
    payload.status === undefined
      ? undefined
      : normalizeTruckStatus(payload.status) ?? undefined;

  const errors: Record<string, string> = {};

  if (!licensePlate) {
    errors.licensePlate = "License plate is required.";
  }

  if (!maxCapacity) {
    errors.maxCapacity = "Max capacity must be a positive integer.";
  }

  if (!fuelConsumptionPerKm) {
    errors.fuelConsumptionPerKm = "Fuel consumption must be a positive number.";
  }

  if (payload.status !== undefined && !status) {
    errors.status = "Status must be available, assigned, or maintenance.";
  }

  if (Object.keys(errors).length > 0) {
    throw badRequest("Invalid truck payload.", errors);
  }

  return {
    licensePlate: licensePlate as string,
    maxCapacity: maxCapacity as number,
    fuelConsumptionPerKm: fuelConsumptionPerKm as number,
    status,
  };
}

export function parseUpdateTruckInput(payload: unknown): UpdateTruckInput {
  if (!isRecord(payload)) {
    throw badRequest("Request body must be a JSON object.");
  }

  const input: UpdateTruckInput = {};
  const errors: Record<string, string> = {};

  if (payload.licensePlate !== undefined) {
    const licensePlate = normalizeString(payload.licensePlate)?.toUpperCase();

    if (!licensePlate) {
      errors.licensePlate = "License plate cannot be empty.";
    } else {
      input.licensePlate = licensePlate;
    }
  }

  if (payload.maxCapacity !== undefined) {
    const maxCapacity = normalizePositiveInteger(payload.maxCapacity);

    if (!maxCapacity) {
      errors.maxCapacity = "Max capacity must be a positive integer.";
    } else {
      input.maxCapacity = maxCapacity;
    }
  }

  if (payload.fuelConsumptionPerKm !== undefined) {
    const fuelConsumptionPerKm = normalizePositiveNumber(
      payload.fuelConsumptionPerKm,
    );

    if (!fuelConsumptionPerKm) {
      errors.fuelConsumptionPerKm = "Fuel consumption must be a positive number.";
    } else {
      input.fuelConsumptionPerKm = fuelConsumptionPerKm;
    }
  }

  if (payload.status !== undefined) {
    const status = normalizeTruckStatus(payload.status);

    if (!status) {
      errors.status = "Status must be available, assigned, or maintenance.";
    } else {
      input.status = status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw badRequest("Invalid truck payload.", errors);
  }

  if (Object.keys(input).length === 0) {
    throw badRequest("At least one field must be provided.");
  }

  return input;
}
