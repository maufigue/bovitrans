import { query } from "@/lib/db/pool";
import type {
  AxleConfiguration,
  Truck,
  TruckStatus,
  VehicleConfiguration,
} from "@/lib/domain/types";
import { conflict, notFound } from "@/lib/http/errors";
import type { CreateTruckInput, UpdateTruckInput } from "@/lib/validation/trucks";

type TruckRow = {
  id: string;
  license_plate: string;
  brand: string;
  model: string;
  engine_power_hp: number | null;
  tare_weight_tons: string;
  empty_fuel_consumption_per_km: string;
  fuel_consumption_per_ton_km: string;
  max_capacity: number;
  vehicle_configuration: VehicleConfiguration;
  axle_configuration: AxleConfiguration;
  length_m: string;
  max_weight_tons: string;
  reference_cattle_weight_kg: number;
  fuel_consumption_per_km: string;
  status: TruckStatus;
  created_at: Date;
  updated_at: Date;
};

function mapTruck(row: TruckRow): Truck {
  return {
    id: row.id,
    licensePlate: row.license_plate,
    brand: row.brand,
    model: row.model,
    enginePowerHp: row.engine_power_hp,
    tareWeightTons: Number(row.tare_weight_tons),
    emptyFuelConsumptionPerKm: Number(row.empty_fuel_consumption_per_km),
    fuelConsumptionPerTonKm: Number(row.fuel_consumption_per_ton_km),
    maxCapacity: row.max_capacity,
    vehicleConfiguration: row.vehicle_configuration,
    axleConfiguration: row.axle_configuration,
    lengthM: Number(row.length_m),
    maxWeightTons: Number(row.max_weight_tons),
    referenceCattleWeightKg: row.reference_cattle_weight_kg,
    fuelConsumptionPerKm: Number(row.fuel_consumption_per_km),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function isPgError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export async function listTrucks(options: {
  status?: TruckStatus;
  availableForCapacity?: number;
} = {}) {
  const filters: string[] = [];
  const values: unknown[] = [];

  if (options.status) {
    values.push(options.status);
    filters.push(`status = $${values.length}`);
  }

  if (options.availableForCapacity) {
    values.push(options.availableForCapacity);
    filters.push(`max_capacity >= $${values.length}`);
    filters.push("status = 'available'");
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  const result = await query<TruckRow>(
    `
      SELECT id, license_plate, brand, model, engine_power_hp, tare_weight_tons,
        empty_fuel_consumption_per_km, fuel_consumption_per_ton_km,
        max_capacity, vehicle_configuration, axle_configuration,
        length_m, max_weight_tons, reference_cattle_weight_kg,
        fuel_consumption_per_km, status, created_at, updated_at
      FROM trucks
      ${whereClause}
      ORDER BY created_at DESC
    `,
    values,
  );

  return result.rows.map(mapTruck);
}

export async function getTruckById(id: string) {
  const result = await query<TruckRow>(
    `
      SELECT id, license_plate, brand, model, engine_power_hp, tare_weight_tons,
        empty_fuel_consumption_per_km, fuel_consumption_per_ton_km,
        max_capacity, vehicle_configuration, axle_configuration,
        length_m, max_weight_tons, reference_cattle_weight_kg,
        fuel_consumption_per_km, status, created_at, updated_at
      FROM trucks
      WHERE id = $1
    `,
    [id],
  );

  const truck = result.rows[0];

  if (!truck) {
    throw notFound("Camión no encontrado.");
  }

  return mapTruck(truck);
}

export async function createTruck(input: CreateTruckInput) {
  try {
    const result = await query<TruckRow>(
      `
        INSERT INTO trucks (
          license_plate, max_capacity, vehicle_configuration, axle_configuration,
          brand, model, engine_power_hp, tare_weight_tons,
          empty_fuel_consumption_per_km, fuel_consumption_per_ton_km,
          length_m, max_weight_tons, reference_cattle_weight_kg,
          fuel_consumption_per_km, status
        )
        VALUES (
          $1, COALESCE($2, FLOOR(COALESCE($12, 18.00) * 1000 / COALESCE($13, 450))), COALESCE($3, 'truck_semitrailer'), COALESCE($4, 'double_dual'),
          COALESCE($5, 'Genérico'), COALESCE($6, 'Camión ganadero'), $7,
          COALESCE($8, 9.00), COALESCE($9, 0.3200), COALESCE($10, 0.0065),
          COALESCE($11, 22.40), COALESCE($12, 18.00), COALESCE($13, 450),
          COALESCE($14, 0.38), COALESCE($15::truck_status, 'available')
        )
        RETURNING id, license_plate, brand, model, engine_power_hp, tare_weight_tons,
          empty_fuel_consumption_per_km, fuel_consumption_per_ton_km,
          max_capacity, vehicle_configuration, axle_configuration,
          length_m, max_weight_tons, reference_cattle_weight_kg,
          fuel_consumption_per_km, status, created_at, updated_at
      `,
      [
        input.licensePlate,
        input.maxCapacity,
        input.vehicleConfiguration ?? null,
        input.axleConfiguration ?? null,
        input.brand ?? null,
        input.model ?? null,
        input.enginePowerHp ?? null,
        input.tareWeightTons ?? null,
        input.emptyFuelConsumptionPerKm ?? null,
        input.fuelConsumptionPerTonKm ?? null,
        input.lengthM ?? null,
        input.maxWeightTons ?? null,
        input.referenceCattleWeightKg ?? null,
        input.fuelConsumptionPerKm,
        input.status ?? null,
      ],
    );

    return mapTruck(result.rows[0]);
  } catch (error) {
    if (isPgError(error) && error.code === "23505") {
      throw conflict("Ya existe un camión con esta patente.");
    }

    throw error;
  }
}

export async function updateTruck(id: string, input: UpdateTruckInput) {
  const assignments: string[] = [];
  const values: unknown[] = [];

  if (input.licensePlate !== undefined) {
    values.push(input.licensePlate);
    assignments.push(`license_plate = $${values.length}`);
  }

  if (input.maxCapacity !== undefined) {
    values.push(input.maxCapacity);
    assignments.push(`max_capacity = $${values.length}`);
  }

  if (input.brand !== undefined) {
    values.push(input.brand);
    assignments.push(`brand = $${values.length}`);
  }

  if (input.model !== undefined) {
    values.push(input.model);
    assignments.push(`model = $${values.length}`);
  }

  if (input.enginePowerHp !== undefined) {
    values.push(input.enginePowerHp);
    assignments.push(`engine_power_hp = $${values.length}`);
  }

  if (input.tareWeightTons !== undefined) {
    values.push(input.tareWeightTons);
    assignments.push(`tare_weight_tons = $${values.length}`);
  }

  if (input.emptyFuelConsumptionPerKm !== undefined) {
    values.push(input.emptyFuelConsumptionPerKm);
    assignments.push(`empty_fuel_consumption_per_km = $${values.length}`);
  }

  if (input.fuelConsumptionPerTonKm !== undefined) {
    values.push(input.fuelConsumptionPerTonKm);
    assignments.push(`fuel_consumption_per_ton_km = $${values.length}`);
  }

  if (input.vehicleConfiguration !== undefined) {
    values.push(input.vehicleConfiguration);
    assignments.push(`vehicle_configuration = $${values.length}`);
  }

  if (input.axleConfiguration !== undefined) {
    values.push(input.axleConfiguration);
    assignments.push(`axle_configuration = $${values.length}`);
  }

  if (input.lengthM !== undefined) {
    values.push(input.lengthM);
    assignments.push(`length_m = $${values.length}`);
  }

  if (input.maxWeightTons !== undefined) {
    values.push(input.maxWeightTons);
    assignments.push(`max_weight_tons = $${values.length}`);
  }

  if (input.referenceCattleWeightKg !== undefined) {
    values.push(input.referenceCattleWeightKg);
    assignments.push(`reference_cattle_weight_kg = $${values.length}`);
  }

  if (input.fuelConsumptionPerKm !== undefined) {
    values.push(input.fuelConsumptionPerKm);
    assignments.push(`fuel_consumption_per_km = $${values.length}`);
  }

  if (input.status !== undefined) {
    values.push(input.status);
    assignments.push(`status = $${values.length}`);
  }

  values.push(id);

  try {
    const result = await query<TruckRow>(
      `
        UPDATE trucks
        SET ${assignments.join(", ")}
        WHERE id = $${values.length}
        RETURNING id, license_plate, brand, model, engine_power_hp, tare_weight_tons,
          empty_fuel_consumption_per_km, fuel_consumption_per_ton_km,
          max_capacity, vehicle_configuration, axle_configuration,
          length_m, max_weight_tons, reference_cattle_weight_kg,
          fuel_consumption_per_km, status, created_at, updated_at
      `,
      values,
    );

    const truck = result.rows[0];

    if (!truck) {
      throw notFound("Camión no encontrado.");
    }

    return mapTruck(truck);
  } catch (error) {
    if (isPgError(error) && error.code === "23505") {
      throw conflict("Ya existe un camión con esta patente.");
    }

    throw error;
  }
}

export async function deleteTruck(id: string) {
  try {
    const result = await query<{ id: string }>(
      "DELETE FROM trucks WHERE id = $1 RETURNING id",
      [id],
    );

    if (!result.rows[0]) {
      throw notFound("Camión no encontrado.");
    }
  } catch (error) {
    if (isPgError(error) && error.code === "23503") {
      throw conflict(
        "El camión no puede eliminarse porque está asignado a una solicitud logística.",
      );
    }

    throw error;
  }
}
