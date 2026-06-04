import { query } from "@/lib/db/pool";
import type { Truck, TruckStatus } from "@/lib/domain/types";
import { conflict, notFound } from "@/lib/http/errors";
import type { CreateTruckInput, UpdateTruckInput } from "@/lib/validation/trucks";

type TruckRow = {
  id: string;
  license_plate: string;
  max_capacity: number;
  fuel_consumption_per_km: string;
  status: TruckStatus;
  created_at: Date;
  updated_at: Date;
};

function mapTruck(row: TruckRow): Truck {
  return {
    id: row.id,
    licensePlate: row.license_plate,
    maxCapacity: row.max_capacity,
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
      SELECT id, license_plate, max_capacity, fuel_consumption_per_km, status, created_at, updated_at
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
      SELECT id, license_plate, max_capacity, fuel_consumption_per_km, status, created_at, updated_at
      FROM trucks
      WHERE id = $1
    `,
    [id],
  );

  const truck = result.rows[0];

  if (!truck) {
    throw notFound("Truck not found.");
  }

  return mapTruck(truck);
}

export async function createTruck(input: CreateTruckInput) {
  try {
    const result = await query<TruckRow>(
      `
        INSERT INTO trucks (license_plate, max_capacity, fuel_consumption_per_km, status)
        VALUES ($1, $2, $3, COALESCE($4::truck_status, 'available'))
        RETURNING id, license_plate, max_capacity, fuel_consumption_per_km, status, created_at, updated_at
      `,
      [
        input.licensePlate,
        input.maxCapacity,
        input.fuelConsumptionPerKm,
        input.status ?? null,
      ],
    );

    return mapTruck(result.rows[0]);
  } catch (error) {
    if (isPgError(error) && error.code === "23505") {
      throw conflict("A truck with this license plate already exists.");
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
        RETURNING id, license_plate, max_capacity, fuel_consumption_per_km, status, created_at, updated_at
      `,
      values,
    );

    const truck = result.rows[0];

    if (!truck) {
      throw notFound("Truck not found.");
    }

    return mapTruck(truck);
  } catch (error) {
    if (isPgError(error) && error.code === "23505") {
      throw conflict("A truck with this license plate already exists.");
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
      throw notFound("Truck not found.");
    }
  } catch (error) {
    if (isPgError(error) && error.code === "23503") {
      throw conflict(
        "Truck cannot be deleted because it is assigned to a transport request.",
      );
    }

    throw error;
  }
}
