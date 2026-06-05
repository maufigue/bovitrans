import { badRequest } from "@/lib/http/errors";
import { isRecord, normalizePositiveInteger, normalizePositiveNumber, normalizeString } from "@/lib/validation/common";
import {
  axleConfigurations,
  axleConfigurationSpecs,
  truckStatuses,
  vehicleConfigurations,
  vehicleConfigurationSpecs,
  type AxleConfiguration,
  type TruckStatus,
  type VehicleConfiguration,
} from "@/lib/domain/types";

export type CreateTruckInput = {
  licensePlate: string;
  brand?: string;
  model?: string;
  enginePowerHp?: number | null;
  tareWeightTons?: number;
  emptyFuelConsumptionPerKm?: number;
  fuelConsumptionPerTonKm?: number;
  maxCapacity?: number;
  vehicleConfiguration?: VehicleConfiguration;
  axleConfiguration?: AxleConfiguration;
  lengthM?: number;
  maxWeightTons?: number;
  referenceCattleWeightKg?: number;
  fuelConsumptionPerKm?: number;
  status?: TruckStatus;
};

export type UpdateTruckInput = Partial<CreateTruckInput>;

const fleetEditableStatuses: TruckStatus[] = ["available", "maintenance"];

function normalizeTruckStatus(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  if (!truckStatuses.includes(value as TruckStatus)) {
    return null;
  }

  return value as TruckStatus;
}

function normalizeVehicleConfiguration(value: unknown) {
  return typeof value === "string" && vehicleConfigurations.includes(value as VehicleConfiguration)
    ? (value as VehicleConfiguration)
    : null;
}

function normalizeAxleConfiguration(value: unknown) {
  return typeof value === "string" && axleConfigurations.includes(value as AxleConfiguration)
    ? (value as AxleConfiguration)
    : null;
}

export function parseCreateTruckInput(payload: unknown): CreateTruckInput {
  if (!isRecord(payload)) {
    throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");
  }

  const licensePlate = normalizeString(payload.licensePlate)?.toUpperCase();
  const brand = normalizeString(payload.brand);
  const model = normalizeString(payload.model);
  const enginePowerHp =
    payload.enginePowerHp === null || payload.enginePowerHp === undefined
      ? null
      : normalizePositiveInteger(payload.enginePowerHp);
  const tareWeightTons =
    payload.tareWeightTons === undefined
      ? undefined
      : normalizePositiveNumber(payload.tareWeightTons);
  const emptyFuelConsumptionPerKm =
    payload.emptyFuelConsumptionPerKm === undefined
      ? undefined
      : normalizePositiveNumber(payload.emptyFuelConsumptionPerKm);
  const fuelConsumptionPerTonKm =
    payload.fuelConsumptionPerTonKm === undefined
      ? undefined
      : normalizePositiveNumber(payload.fuelConsumptionPerTonKm);
  const maxCapacity =
    payload.maxCapacity === undefined
      ? undefined
      : normalizePositiveInteger(payload.maxCapacity);
  const vehicleConfiguration =
    payload.vehicleConfiguration === undefined
      ? undefined
      : normalizeVehicleConfiguration(payload.vehicleConfiguration) ?? undefined;
  const axleConfiguration =
    payload.axleConfiguration === undefined
      ? undefined
      : normalizeAxleConfiguration(payload.axleConfiguration) ?? undefined;
  const lengthM =
    payload.lengthM === undefined
      ? vehicleConfiguration
        ? vehicleConfigurationSpecs[vehicleConfiguration].maxLengthM
        : undefined
      : normalizePositiveNumber(payload.lengthM);
  const maxWeightTons =
    payload.maxWeightTons === undefined
      ? axleConfiguration
        ? axleConfigurationSpecs[axleConfiguration].maxWeightTons
        : undefined
      : normalizePositiveNumber(payload.maxWeightTons);
  const referenceCattleWeightKg =
    payload.referenceCattleWeightKg === undefined
      ? undefined
      : normalizePositiveInteger(payload.referenceCattleWeightKg);
  const fuelConsumptionPerKm =
    payload.fuelConsumptionPerKm === undefined
      ? undefined
      : normalizePositiveNumber(payload.fuelConsumptionPerKm);
  const status =
    payload.status === undefined
      ? undefined
      : normalizeTruckStatus(payload.status) ?? undefined;

  const errors: Record<string, string> = {};

  if (!licensePlate) {
    errors.licensePlate = "La patente es requerida.";
  }

  if (payload.enginePowerHp !== undefined && payload.enginePowerHp !== null && !enginePowerHp) {
    errors.enginePowerHp = "La potencia debe ser un número entero positivo.";
  }

  if (payload.tareWeightTons !== undefined && !tareWeightTons) {
    errors.tareWeightTons = "La tara debe ser un número positivo.";
  }

  if (payload.emptyFuelConsumptionPerKm !== undefined && !emptyFuelConsumptionPerKm) {
    errors.emptyFuelConsumptionPerKm = "El consumo vacío debe ser un número positivo.";
  }

  if (payload.fuelConsumptionPerTonKm !== undefined && !fuelConsumptionPerTonKm) {
    errors.fuelConsumptionPerTonKm = "El factor de consumo debe ser un número positivo.";
  }

  if (payload.maxCapacity !== undefined && !maxCapacity) {
    errors.maxCapacity = "La capacidad máxima debe ser un número entero positivo.";
  }

  if (payload.vehicleConfiguration !== undefined && !vehicleConfiguration) {
    errors.vehicleConfiguration = "La configuración vehicular no es válida.";
  }

  if (payload.axleConfiguration !== undefined && !axleConfiguration) {
    errors.axleConfiguration = "La configuración de eje y rodado no es válida.";
  }

  if (payload.lengthM !== undefined && !lengthM) {
    errors.lengthM = "La longitud debe ser un número positivo.";
  }

  if (payload.maxWeightTons !== undefined && !maxWeightTons) {
    errors.maxWeightTons = "El peso máximo debe ser un número positivo.";
  }

  if (
    payload.referenceCattleWeightKg !== undefined &&
    !referenceCattleWeightKg
  ) {
    errors.referenceCattleWeightKg = "El peso referencial debe ser un número entero positivo.";
  }

  if (payload.fuelConsumptionPerKm !== undefined && !fuelConsumptionPerKm) {
    errors.fuelConsumptionPerKm = "El consumo de combustible debe ser un número positivo.";
  }

  if (payload.status !== undefined && !status) {
    errors.status = "El estado debe ser Disponible, Asignado o Mantenimiento.";
  } else if (status && !fleetEditableStatuses.includes(status)) {
    errors.status = "El estado Asignado solo puede gestionarse desde el Panel Logístico.";
  }

  if (Object.keys(errors).length > 0) {
    throw badRequest("Datos del camión no válidos.", errors);
  }

  return {
    licensePlate: licensePlate as string,
    brand: brand ?? undefined,
    model: model ?? undefined,
    enginePowerHp: enginePowerHp === null ? null : (enginePowerHp as number),
    tareWeightTons: tareWeightTons === undefined ? undefined : (tareWeightTons as number),
    emptyFuelConsumptionPerKm:
      emptyFuelConsumptionPerKm === undefined
        ? undefined
        : (emptyFuelConsumptionPerKm as number),
    fuelConsumptionPerTonKm:
      fuelConsumptionPerTonKm === undefined
        ? undefined
        : (fuelConsumptionPerTonKm as number),
    maxCapacity: maxCapacity === undefined ? undefined : (maxCapacity as number),
    vehicleConfiguration,
    axleConfiguration,
    lengthM: lengthM === undefined ? undefined : (lengthM as number),
    maxWeightTons: maxWeightTons === undefined ? undefined : (maxWeightTons as number),
    referenceCattleWeightKg:
      referenceCattleWeightKg === undefined
        ? undefined
        : (referenceCattleWeightKg as number),
    fuelConsumptionPerKm:
      fuelConsumptionPerKm === undefined ? undefined : (fuelConsumptionPerKm as number),
    status,
  };
}

export function parseUpdateTruckInput(payload: unknown): UpdateTruckInput {
  if (!isRecord(payload)) {
    throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");
  }

  const input: UpdateTruckInput = {};
  const errors: Record<string, string> = {};

  if (payload.licensePlate !== undefined) {
    const licensePlate = normalizeString(payload.licensePlate)?.toUpperCase();

    if (!licensePlate) {
      errors.licensePlate = "La patente no puede estar vacía.";
    } else {
      input.licensePlate = licensePlate;
    }
  }

  if (payload.brand !== undefined) {
    const brand = normalizeString(payload.brand);

    if (!brand) {
      errors.brand = "La marca no puede estar vacía.";
    } else {
      input.brand = brand;
    }
  }

  if (payload.model !== undefined) {
    const model = normalizeString(payload.model);

    if (!model) {
      errors.model = "El modelo no puede estar vacío.";
    } else {
      input.model = model;
    }
  }

  if (payload.enginePowerHp !== undefined) {
    if (payload.enginePowerHp === null) {
      input.enginePowerHp = null;
    } else {
      const enginePowerHp = normalizePositiveInteger(payload.enginePowerHp);

      if (!enginePowerHp) {
        errors.enginePowerHp = "La potencia debe ser un número entero positivo.";
      } else {
        input.enginePowerHp = enginePowerHp;
      }
    }
  }

  if (payload.tareWeightTons !== undefined) {
    const tareWeightTons = normalizePositiveNumber(payload.tareWeightTons);

    if (!tareWeightTons) {
      errors.tareWeightTons = "La tara debe ser un número positivo.";
    } else {
      input.tareWeightTons = tareWeightTons;
    }
  }

  if (payload.emptyFuelConsumptionPerKm !== undefined) {
    const emptyFuelConsumptionPerKm = normalizePositiveNumber(
      payload.emptyFuelConsumptionPerKm,
    );

    if (!emptyFuelConsumptionPerKm) {
      errors.emptyFuelConsumptionPerKm = "El consumo vacío debe ser un número positivo.";
    } else {
      input.emptyFuelConsumptionPerKm = emptyFuelConsumptionPerKm;
    }
  }

  if (payload.fuelConsumptionPerTonKm !== undefined) {
    const fuelConsumptionPerTonKm = normalizePositiveNumber(
      payload.fuelConsumptionPerTonKm,
    );

    if (!fuelConsumptionPerTonKm) {
      errors.fuelConsumptionPerTonKm = "El factor de consumo debe ser un número positivo.";
    } else {
      input.fuelConsumptionPerTonKm = fuelConsumptionPerTonKm;
    }
  }

  if (payload.maxCapacity !== undefined) {
    const maxCapacity = normalizePositiveInteger(payload.maxCapacity);

    if (!maxCapacity) {
      errors.maxCapacity = "La capacidad máxima debe ser un número entero positivo.";
    } else {
      input.maxCapacity = maxCapacity;
    }
  }

  if (payload.vehicleConfiguration !== undefined) {
    const vehicleConfiguration = normalizeVehicleConfiguration(payload.vehicleConfiguration);

    if (!vehicleConfiguration) {
      errors.vehicleConfiguration = "La configuración vehicular no es válida.";
    } else {
      input.vehicleConfiguration = vehicleConfiguration;
    }
  }

  if (payload.axleConfiguration !== undefined) {
    const axleConfiguration = normalizeAxleConfiguration(payload.axleConfiguration);

    if (!axleConfiguration) {
      errors.axleConfiguration = "La configuración de eje y rodado no es válida.";
    } else {
      input.axleConfiguration = axleConfiguration;
    }
  }

  if (payload.lengthM !== undefined) {
    const lengthM = normalizePositiveNumber(payload.lengthM);

    if (!lengthM) {
      errors.lengthM = "La longitud debe ser un número positivo.";
    } else {
      input.lengthM = lengthM;
    }
  }

  if (payload.maxWeightTons !== undefined) {
    const maxWeightTons = normalizePositiveNumber(payload.maxWeightTons);

    if (!maxWeightTons) {
      errors.maxWeightTons = "El peso máximo debe ser un número positivo.";
    } else {
      input.maxWeightTons = maxWeightTons;
    }
  }

  if (payload.referenceCattleWeightKg !== undefined) {
    const referenceCattleWeightKg = normalizePositiveInteger(
      payload.referenceCattleWeightKg,
    );

    if (!referenceCattleWeightKg) {
      errors.referenceCattleWeightKg = "El peso referencial debe ser un número entero positivo.";
    } else {
      input.referenceCattleWeightKg = referenceCattleWeightKg;
    }
  }

  if (payload.fuelConsumptionPerKm !== undefined) {
    const fuelConsumptionPerKm = normalizePositiveNumber(
      payload.fuelConsumptionPerKm,
    );

    if (!fuelConsumptionPerKm) {
      errors.fuelConsumptionPerKm = "El consumo de combustible debe ser un número positivo.";
    } else {
      input.fuelConsumptionPerKm = fuelConsumptionPerKm;
    }
  }

  if (payload.status !== undefined) {
    const status = normalizeTruckStatus(payload.status);

    if (!status) {
      errors.status = "El estado debe ser Disponible, Asignado o Mantenimiento.";
    } else if (!fleetEditableStatuses.includes(status)) {
      errors.status = "El estado Asignado solo puede gestionarse desde el Panel Logístico.";
    } else {
      input.status = status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw badRequest("Datos del camión no válidos.", errors);
  }

  if (Object.keys(input).length === 0) {
    throw badRequest("Debe informar al menos un campo para actualizar.");
  }

  return input;
}
