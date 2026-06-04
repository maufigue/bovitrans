import { requestStatuses, type TransportRequestStatus } from "@/lib/domain/types";
import { badRequest } from "@/lib/http/errors";
import {
  isRecord,
  normalizePositiveInteger,
  normalizeString,
} from "@/lib/validation/common";

export type CreateTransportRequestInput = {
  clientName: string;
  cattleCount: number;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  notes?: string | null;
};

export type UpdateTransportRequestInput = Partial<
  CreateTransportRequestInput & {
    status: TransportRequestStatus;
    clientId: string;
  }
>;

export type AssignTruckInput = {
  truckId: string;
  truckIds: string[];
  fuelPriceId: string;
  confirmCapacityOverflow: boolean;
  departureAt: Date | null;
};

function normalizeCoordinate(value: unknown, range: { min: number; max: number }) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < range.min ||
    value > range.max
  ) {
    return null;
  }

  return value;
}

function normalizeRequestStatus(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  if (!requestStatuses.includes(value as TransportRequestStatus)) {
    return null;
  }

  return value as TransportRequestStatus;
}

function normalizeNullableText(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeString(value);
}

function validateOriginDestination(
  originLat: number | null,
  originLng: number | null,
  destinationLat: number | null,
  destinationLng: number | null,
  errors: Record<string, string>,
) {
  if (
    originLat !== null &&
    originLng !== null &&
    destinationLat !== null &&
    destinationLng !== null &&
    originLat === destinationLat &&
    originLng === destinationLng
  ) {
    errors.destination = "Origin and destination must be different.";
  }
}

export function parseCreateTransportRequestInput(
  payload: unknown,
): CreateTransportRequestInput {
  if (!isRecord(payload)) {
    throw badRequest("Request body must be a JSON object.");
  }

  const clientName = normalizeString(payload.clientName);
  const cattleCount = normalizePositiveInteger(payload.cattleCount);
  const originName = normalizeString(payload.originName);
  const originLat = normalizeCoordinate(payload.originLat, { min: -90, max: 90 });
  const originLng = normalizeCoordinate(payload.originLng, { min: -180, max: 180 });
  const destinationName = normalizeString(payload.destinationName);
  const destinationLat = normalizeCoordinate(payload.destinationLat, {
    min: -90,
    max: 90,
  });
  const destinationLng = normalizeCoordinate(payload.destinationLng, {
    min: -180,
    max: 180,
  });
  const notes = normalizeNullableText(payload.notes);

  const errors: Record<string, string> = {};

  if (!clientName) {
    errors.clientName = "Client name is required.";
  }

  if (!cattleCount) {
    errors.cattleCount = "Cattle count must be a positive integer.";
  }

  if (!originName) {
    errors.originName = "Origin name is required.";
  }

  if (originLat === null) {
    errors.originLat = "Origin latitude must be between -90 and 90.";
  }

  if (originLng === null) {
    errors.originLng = "Origin longitude must be between -180 and 180.";
  }

  if (!destinationName) {
    errors.destinationName = "Destination name is required.";
  }

  if (destinationLat === null) {
    errors.destinationLat = "Destination latitude must be between -90 and 90.";
  }

  if (destinationLng === null) {
    errors.destinationLng = "Destination longitude must be between -180 and 180.";
  }

  validateOriginDestination(
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    errors,
  );

  if (Object.keys(errors).length > 0) {
    throw badRequest("Invalid transport request payload.", errors);
  }

  return {
    clientName: clientName as string,
    cattleCount: cattleCount as number,
    originName: originName as string,
    originLat: originLat as number,
    originLng: originLng as number,
    destinationName: destinationName as string,
    destinationLat: destinationLat as number,
    destinationLng: destinationLng as number,
    notes,
  };
}

export function parseUpdateTransportRequestInput(
  payload: unknown,
): UpdateTransportRequestInput {
  if (!isRecord(payload)) {
    throw badRequest("Request body must be a JSON object.");
  }

  const input: UpdateTransportRequestInput = {};
  const errors: Record<string, string> = {};

  if (payload.clientName !== undefined) {
    const clientName = normalizeString(payload.clientName);

    if (!clientName) {
      errors.clientName = "Client name cannot be empty.";
    } else {
      input.clientName = clientName;
    }
  }

  if (payload.clientId !== undefined) {
    const clientId = normalizeString(payload.clientId);

    if (!clientId) {
      errors.clientId = "Client id cannot be empty.";
    } else {
      input.clientId = clientId;
    }
  }

  if (payload.cattleCount !== undefined) {
    const cattleCount = normalizePositiveInteger(payload.cattleCount);

    if (!cattleCount) {
      errors.cattleCount = "Cattle count must be a positive integer.";
    } else {
      input.cattleCount = cattleCount;
    }
  }

  if (payload.originName !== undefined) {
    const originName = normalizeString(payload.originName);

    if (!originName) {
      errors.originName = "Origin name cannot be empty.";
    } else {
      input.originName = originName;
    }
  }

  if (payload.originLat !== undefined) {
    const originLat = normalizeCoordinate(payload.originLat, { min: -90, max: 90 });

    if (originLat === null) {
      errors.originLat = "Origin latitude must be between -90 and 90.";
    } else {
      input.originLat = originLat;
    }
  }

  if (payload.originLng !== undefined) {
    const originLng = normalizeCoordinate(payload.originLng, { min: -180, max: 180 });

    if (originLng === null) {
      errors.originLng = "Origin longitude must be between -180 and 180.";
    } else {
      input.originLng = originLng;
    }
  }

  if (payload.destinationName !== undefined) {
    const destinationName = normalizeString(payload.destinationName);

    if (!destinationName) {
      errors.destinationName = "Destination name cannot be empty.";
    } else {
      input.destinationName = destinationName;
    }
  }

  if (payload.destinationLat !== undefined) {
    const destinationLat = normalizeCoordinate(payload.destinationLat, {
      min: -90,
      max: 90,
    });

    if (destinationLat === null) {
      errors.destinationLat = "Destination latitude must be between -90 and 90.";
    } else {
      input.destinationLat = destinationLat;
    }
  }

  if (payload.destinationLng !== undefined) {
    const destinationLng = normalizeCoordinate(payload.destinationLng, {
      min: -180,
      max: 180,
    });

    if (destinationLng === null) {
      errors.destinationLng = "Destination longitude must be between -180 and 180.";
    } else {
      input.destinationLng = destinationLng;
    }
  }

  if (payload.notes !== undefined) {
    input.notes = normalizeNullableText(payload.notes);
  }

  if (payload.status !== undefined) {
    const status = normalizeRequestStatus(payload.status);

    if (!status) {
      errors.status =
        "Status must be pending, assigned, in_progress, completed, or cancelled.";
    } else {
      input.status = status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw badRequest("Invalid transport request payload.", errors);
  }

  if (Object.keys(input).length === 0) {
    throw badRequest("At least one field must be provided.");
  }

  return input;
}

export function parseAssignTruckInput(payload: unknown): AssignTruckInput {
  if (!isRecord(payload)) {
    throw badRequest("Request body must be a JSON object.");
  }

  const truckId = normalizeString(payload.truckId);
  const truckIdsPayload = Array.isArray(payload.truckIds) ? payload.truckIds : [];
  const truckIds = [
    ...(truckId ? [truckId] : []),
    ...truckIdsPayload
      .map((value) => normalizeString(value))
      .filter((value): value is string => Boolean(value)),
  ].filter((value, index, values) => values.indexOf(value) === index);
  const confirmCapacityOverflow =
    typeof payload.confirmCapacityOverflow === "boolean"
      ? payload.confirmCapacityOverflow
      : false;
  const departureAtValue = normalizeString(payload.departureAt);
  const departureAt = departureAtValue ? new Date(departureAtValue) : null;
  const fuelPriceId = normalizeString(payload.fuelPriceId);

  if (truckIds.length === 0) {
    throw badRequest("At least one truck is required.");
  }

  if (!fuelPriceId) {
    throw badRequest("fuelPriceId is required.");
  }

  if (departureAtValue && Number.isNaN(departureAt?.getTime())) {
    throw badRequest("departureAt must be a valid date.");
  }

  if (departureAt && departureAt.getTime() < Date.now()) {
    throw badRequest("departureAt cannot be earlier than the current date and time.");
  }

  return {
    truckId: truckIds[0],
    truckIds,
    fuelPriceId,
    confirmCapacityOverflow,
    departureAt,
  };
}
