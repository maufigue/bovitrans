import { requestStatuses, type TransportRequestStatus } from "@/lib/domain/types";
import { badRequest } from "@/lib/http/errors";
import {
  isRecord,
  normalizePositiveInteger,
  normalizeString,
} from "@/lib/validation/common";

export type CreateTransportRequestInput = {
  clientId: string;
  clientName: string;
  cattleCount: number;
  cattleWeightMinKg: number;
  cattleWeightMaxKg: number;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  departureAt: Date;
  notes?: string | null;
  source?: "internal" | "external";
  routePending?: boolean;
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
  confirmAssignment: boolean;
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
    errors.destination = "El origen y el destino deben ser puntos diferentes.";
  }
}

export function parseCreateTransportRequestInput(
  payload: unknown,
): CreateTransportRequestInput {
  if (!isRecord(payload)) {
    throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");
  }

  const clientName = normalizeString(payload.clientName);
  const clientId = normalizeString(payload.clientId);
  const cattleCount = normalizePositiveInteger(payload.cattleCount);
  const cattleWeightMinKg =
    payload.cattleWeightMinKg === undefined
      ? 400
      : normalizePositiveInteger(payload.cattleWeightMinKg);
  const cattleWeightMaxKg =
    payload.cattleWeightMaxKg === undefined
      ? 500
      : normalizePositiveInteger(payload.cattleWeightMaxKg);
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
  const source =
    payload.source === "external" || payload.source === "internal"
      ? payload.source
      : undefined;
  const routePending =
    typeof payload.routePending === "boolean" ? payload.routePending : undefined;
  const departureAtValue = normalizeString(payload.departureAt);
  const departureAt = departureAtValue ? new Date(departureAtValue) : null;

  const errors: Record<string, string> = {};

  if (!clientName) {
    errors.clientName = "El nombre del cliente es requerido.";
  }
  if (!clientId) {
    errors.clientId = "Debe seleccionar un cliente.";
  }

  if (!cattleCount) {
    errors.cattleCount = "La cantidad de cabezas debe ser un número entero positivo.";
  }

  if (!cattleWeightMinKg) {
    errors.cattleWeightMinKg = "El peso mínimo debe ser un número entero positivo.";
  }

  if (!cattleWeightMaxKg) {
    errors.cattleWeightMaxKg = "El peso máximo debe ser un número entero positivo.";
  }

  if (
    cattleWeightMinKg &&
    cattleWeightMaxKg &&
    cattleWeightMinKg > cattleWeightMaxKg
  ) {
    errors.cattleWeightMaxKg = "El peso máximo debe ser mayor o igual al peso mínimo.";
  }

  if (!originName) {
    errors.originName = "El nombre del origen es requerido.";
  }

  if (originLat === null) {
    errors.originLat = "La latitud de origen debe estar entre -90 y 90.";
  }

  if (originLng === null) {
    errors.originLng = "La longitud de origen debe estar entre -180 y 180.";
  }

  if (!destinationName) {
    errors.destinationName = "El nombre del destino es requerido.";
  }
  if (!departureAt || Number.isNaN(departureAt.getTime()) || departureAt.getTime() < Date.now()) {
    errors.departureAt = "La fecha de salida debe ser futura.";
  }

  if (destinationLat === null) {
    errors.destinationLat = "La latitud de destino debe estar entre -90 y 90.";
  }

  if (destinationLng === null) {
    errors.destinationLng = "La longitud de destino debe estar entre -180 y 180.";
  }

  validateOriginDestination(
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    errors,
  );

  if (Object.keys(errors).length > 0) {
    throw badRequest("Datos de la solicitud logística no válidos.", errors);
  }

  return {
    clientId: clientId as string,
    clientName: clientName as string,
    cattleCount: cattleCount as number,
    cattleWeightMinKg: cattleWeightMinKg as number,
    cattleWeightMaxKg: cattleWeightMaxKg as number,
    originName: originName as string,
    originLat: originLat as number,
    originLng: originLng as number,
    destinationName: destinationName as string,
    destinationLat: destinationLat as number,
    destinationLng: destinationLng as number,
    departureAt: departureAt as Date,
    notes,
    source,
    routePending,
  };
}

export function parseUpdateTransportRequestInput(
  payload: unknown,
): UpdateTransportRequestInput {
  if (!isRecord(payload)) {
    throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");
  }

  const input: UpdateTransportRequestInput = {};
  const errors: Record<string, string> = {};

  if (payload.clientName !== undefined) {
    const clientName = normalizeString(payload.clientName);

    if (!clientName) {
      errors.clientName = "El nombre del cliente no puede estar vacío.";
    } else {
      input.clientName = clientName;
    }
  }

  if (payload.clientId !== undefined) {
    const clientId = normalizeString(payload.clientId);

    if (!clientId) {
      errors.clientId = "El identificador del cliente no puede estar vacío.";
    } else {
      input.clientId = clientId;
    }
  }

  if (payload.cattleCount !== undefined) {
    const cattleCount = normalizePositiveInteger(payload.cattleCount);

    if (!cattleCount) {
      errors.cattleCount = "La cantidad de cabezas debe ser un número entero positivo.";
    } else {
      input.cattleCount = cattleCount;
    }
  }

  if (payload.cattleWeightMinKg !== undefined) {
    const cattleWeightMinKg = normalizePositiveInteger(payload.cattleWeightMinKg);

    if (!cattleWeightMinKg) {
      errors.cattleWeightMinKg = "El peso mínimo debe ser un número entero positivo.";
    } else {
      input.cattleWeightMinKg = cattleWeightMinKg;
    }
  }

  if (payload.cattleWeightMaxKg !== undefined) {
    const cattleWeightMaxKg = normalizePositiveInteger(payload.cattleWeightMaxKg);

    if (!cattleWeightMaxKg) {
      errors.cattleWeightMaxKg = "El peso máximo debe ser un número entero positivo.";
    } else {
      input.cattleWeightMaxKg = cattleWeightMaxKg;
    }
  }

  if (payload.originName !== undefined) {
    const originName = normalizeString(payload.originName);

    if (!originName) {
      errors.originName = "El nombre del origen no puede estar vacío.";
    } else {
      input.originName = originName;
    }
  }

  if (payload.originLat !== undefined) {
    const originLat = normalizeCoordinate(payload.originLat, { min: -90, max: 90 });

    if (originLat === null) {
      errors.originLat = "La latitud de origen debe estar entre -90 y 90.";
    } else {
      input.originLat = originLat;
    }
  }

  if (payload.originLng !== undefined) {
    const originLng = normalizeCoordinate(payload.originLng, { min: -180, max: 180 });

    if (originLng === null) {
      errors.originLng = "La longitud de origen debe estar entre -180 y 180.";
    } else {
      input.originLng = originLng;
    }
  }

  if (payload.destinationName !== undefined) {
    const destinationName = normalizeString(payload.destinationName);

    if (!destinationName) {
      errors.destinationName = "El nombre del destino no puede estar vacío.";
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
      errors.destinationLat = "La latitud de destino debe estar entre -90 y 90.";
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
      errors.destinationLng = "La longitud de destino debe estar entre -180 y 180.";
    } else {
      input.destinationLng = destinationLng;
    }
  }

  if (payload.notes !== undefined) {
    input.notes = normalizeNullableText(payload.notes);
  }

  const minWeight =
    input.cattleWeightMinKg ??
    (typeof payload.cattleWeightMinKg === "number" ? payload.cattleWeightMinKg : undefined);
  const maxWeight =
    input.cattleWeightMaxKg ??
    (typeof payload.cattleWeightMaxKg === "number" ? payload.cattleWeightMaxKg : undefined);

  if (minWeight && maxWeight && minWeight > maxWeight) {
    errors.cattleWeightMaxKg = "El peso máximo debe ser mayor o igual al peso mínimo.";
  }

  if (payload.departureAt !== undefined) {
    const departureAtValue = normalizeString(payload.departureAt);
    const departureAt = departureAtValue ? new Date(departureAtValue) : null;

    if (!departureAt || Number.isNaN(departureAt.getTime())) {
      errors.departureAt = "La fecha de salida debe ser válida.";
    } else {
      input.departureAt = departureAt;
    }
  }

  if (payload.routePending !== undefined) {
    input.routePending = payload.routePending === true;
  }

  if (payload.status !== undefined) {
    const status = normalizeRequestStatus(payload.status);

    if (!status) {
      errors.status =
        "El estado debe ser Pendiente, Asignada, Confirmada, En tránsito, Completada o Anulada.";
    } else {
      input.status = status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw badRequest("Datos de la solicitud logística no válidos.", errors);
  }

  if (Object.keys(input).length === 0) {
    throw badRequest("Debe informar al menos un campo para actualizar.");
  }

  return input;
}

export function parseAssignTruckInput(payload: unknown): AssignTruckInput {
  if (!isRecord(payload)) {
    throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");
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
  const confirmAssignment = payload.confirmAssignment === true;

  if (truckIds.length === 0) {
    throw badRequest("Debe seleccionar al menos un camión.");
  }

  if (!fuelPriceId) {
    throw badRequest("Debe seleccionar un precio de combustible.");
  }

  if (departureAtValue && Number.isNaN(departureAt?.getTime())) {
    throw badRequest("La fecha de salida debe ser válida.");
  }

  if (departureAt && departureAt.getTime() < Date.now()) {
    throw badRequest("La fecha de salida no puede ser anterior a la fecha y hora actual.");
  }

  return {
    truckId: truckIds[0],
    truckIds,
    fuelPriceId,
    confirmAssignment,
    confirmCapacityOverflow,
    departureAt,
  };
}
