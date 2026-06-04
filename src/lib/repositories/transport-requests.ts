import type { PoolClient, QueryResultRow } from "pg";
import { query, withTransaction } from "@/lib/db/pool";
import {
  calculateCapacityWarning,
  calculateEstimatedArrivalAt,
  calculateFuelCost,
  calculateHaversineDistanceKm,
  calculateRoadDistanceKm,
  calculateTripsNeeded,
} from "@/lib/domain/logistics";
import type {
  TransportRequest,
  TransportRequestStatus,
  Truck,
  TruckStatus,
} from "@/lib/domain/types";
import { badRequest, conflict, notFound } from "@/lib/http/errors";
import { getFuelPriceById, type FuelPriceSource } from "@/lib/repositories/fuel-prices";
import type {
  AssignTruckInput,
  CreateTransportRequestInput,
  UpdateTransportRequestInput,
} from "@/lib/validation/transport-requests";

type TransportRequestRow = QueryResultRow & {
  id: string;
  client_id: string | null;
  client_company_name?: string | null;
  client_name: string;
  cattle_count: number;
  origin_name: string;
  origin_lat: string;
  origin_lng: string;
  destination_name: string;
  destination_lat: string;
  destination_lng: string;
  distance_km: string | null;
  fuel_cost: string | null;
  fuel_price_id?: string | null;
  trips_needed: number | null;
  departure_at: Date | null;
  estimated_arrival_at: Date | null;
  status: TransportRequestStatus;
  truck_id: string | null;
  assigned_truck_ids: string[] | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type TruckRow = QueryResultRow & {
  id: string;
  license_plate: string;
  max_capacity: number;
  fuel_consumption_per_km: string;
  status: TruckStatus;
  created_at: Date;
  updated_at: Date;
};

type AssignmentResult = {
  request: TransportRequest;
  truck: Truck;
  metrics: {
    distanceKm: number;
    fuelCost: number;
    fuelCostPerLiter: number;
    fuelPrice: FuelPriceSource;
    tripsNeeded: number;
  };
  capacityWarning: {
    excessCattle: number;
    tripsNeeded: number;
  } | null;
};

function mapTransportRequest(row: TransportRequestRow): TransportRequest {
  return {
    id: row.id,
    clientId: row.client_id,
    clientCompanyName: row.client_company_name ?? null,
    clientName: row.client_name,
    cattleCount: row.cattle_count,
    originName: row.origin_name,
    originLat: Number(row.origin_lat),
    originLng: Number(row.origin_lng),
    destinationName: row.destination_name,
    destinationLat: Number(row.destination_lat),
    destinationLng: Number(row.destination_lng),
    distanceKm: row.distance_km === null ? null : Number(row.distance_km),
    fuelCost: row.fuel_cost === null ? null : Number(row.fuel_cost),
    fuelPriceId: row.fuel_price_id ?? null,
    tripsNeeded: row.trips_needed,
    departureAt: row.departure_at?.toISOString() ?? null,
    estimatedArrivalAt: row.estimated_arrival_at?.toISOString() ?? null,
    status: row.status,
    truckId: row.truck_id,
    assignedTruckIds: row.assigned_truck_ids ?? (row.truck_id ? [row.truck_id] : []),
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

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

function buildTransportRequestSelect() {
  return `
    SELECT tr.id, tr.client_id,
      (SELECT c.company_name FROM clients c WHERE c.id = tr.client_id) AS client_company_name,
      tr.client_name, tr.cattle_count, tr.origin_name, tr.origin_lat,
      tr.origin_lng, tr.destination_name, tr.destination_lat, tr.destination_lng,
      tr.distance_km, tr.fuel_cost, tr.fuel_price_id, tr.trips_needed, tr.departure_at,
      tr.estimated_arrival_at, tr.status, tr.truck_id, tr.notes, tr.created_at,
      tr.updated_at,
      COALESCE(
        (
          SELECT ARRAY_AGG(trt.truck_id ORDER BY trt.sequence)
          FROM transport_request_trucks trt
          WHERE trt.transport_request_id = tr.id
        ),
        ARRAY[]::uuid[]
      ) AS assigned_truck_ids
    FROM transport_requests tr
  `;
}

function buildTruckSelect() {
  return `
    SELECT id, license_plate, max_capacity, fuel_consumption_per_km, status, created_at, updated_at
    FROM trucks
  `;
}

export async function listTransportRequests(options: {
  status?: TransportRequestStatus;
} = {}) {
  const values: unknown[] = [];
  const filters: string[] = [];

  if (options.status) {
    values.push(options.status);
    filters.push(`status = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  const result = await query<TransportRequestRow>(
    `
      ${buildTransportRequestSelect()}
      ${whereClause}
      ORDER BY tr.created_at DESC
    `,
    values,
  );

  return result.rows.map(mapTransportRequest);
}

export async function getTransportRequestById(id: string) {
  const result = await query<TransportRequestRow>(
    `
      ${buildTransportRequestSelect()}
      WHERE tr.id = $1
    `,
    [id],
  );

  const request = result.rows[0];

  if (!request) {
    throw notFound("Transport request not found.");
  }

  return mapTransportRequest(request);
}

export async function createTransportRequest(input: CreateTransportRequestInput) {
  const result = await query<TransportRequestRow>(
    `
      INSERT INTO transport_requests (
        client_name, cattle_count, origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, client_id, client_name, cattle_count, origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng, distance_km, fuel_cost,
        trips_needed, departure_at, estimated_arrival_at, status, truck_id,
        notes, created_at, updated_at,
        ARRAY[]::uuid[] AS assigned_truck_ids
    `,
    [
      input.clientName,
      input.cattleCount,
      input.originName,
      input.originLat,
      input.originLng,
      input.destinationName,
      input.destinationLat,
      input.destinationLng,
      input.notes ?? null,
    ],
  );

  return mapTransportRequest(result.rows[0]);
}

export async function updateTransportRequest(
  id: string,
  input: UpdateTransportRequestInput,
) {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const addAssignment = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (input.clientName !== undefined) addAssignment("client_name", input.clientName);
  if (input.clientId !== undefined) {
    const clientResult = await query<{ business_name: string }>(
      "SELECT business_name FROM clients WHERE id = $1",
      [input.clientId],
    );

    if (!clientResult.rows[0]) throw notFound("Client not found.");

    addAssignment("client_id", input.clientId);
    addAssignment("client_name", clientResult.rows[0].business_name);
  }
  if (input.cattleCount !== undefined) addAssignment("cattle_count", input.cattleCount);
  if (input.originName !== undefined) addAssignment("origin_name", input.originName);
  if (input.originLat !== undefined) addAssignment("origin_lat", input.originLat);
  if (input.originLng !== undefined) addAssignment("origin_lng", input.originLng);
  if (input.destinationName !== undefined) {
    addAssignment("destination_name", input.destinationName);
  }
  if (input.destinationLat !== undefined) {
    addAssignment("destination_lat", input.destinationLat);
  }
  if (input.destinationLng !== undefined) {
    addAssignment("destination_lng", input.destinationLng);
  }
  if (input.notes !== undefined) addAssignment("notes", input.notes);
  if (input.status !== undefined) addAssignment("status", input.status);

  values.push(id);

  const result = await query<TransportRequestRow>(
    `
      UPDATE transport_requests
      SET ${assignments.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, client_id, client_name, cattle_count, origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng, distance_km, fuel_cost,
        trips_needed, departure_at, estimated_arrival_at, status, truck_id,
        notes, created_at, updated_at,
        ARRAY[]::uuid[] AS assigned_truck_ids
    `,
    values,
  );

  const request = result.rows[0];

  if (!request) {
    throw notFound("Transport request not found.");
  }

  return mapTransportRequest(request);
}

async function findRequestForUpdate(client: PoolClient, id: string) {
  const result = await client.query<TransportRequestRow>(
    `
      ${buildTransportRequestSelect()}
      WHERE tr.id = $1
      FOR UPDATE
    `,
    [id],
  );

  const request = result.rows[0];

  if (!request) {
    throw notFound("Transport request not found.");
  }

  return request;
}

async function findTruckForUpdate(client: PoolClient, id: string) {
  const result = await client.query<TruckRow>(
    `
      ${buildTruckSelect()}
      WHERE id = $1
      FOR UPDATE
    `,
    [id],
  );

  const truck = result.rows[0];

  if (!truck) {
    throw notFound("Truck not found.");
  }

  return truck;
}

async function findTrucksForUpdate(client: PoolClient, ids: string[]) {
  const result = await client.query<TruckRow>(
    `
      ${buildTruckSelect()}
      WHERE id = ANY($1::uuid[])
      FOR UPDATE
    `,
    [ids],
  );

  const trucksById = new Map(result.rows.map((row) => [row.id, row]));

  return ids.map((id) => {
    const truck = trucksById.get(id);

    if (!truck) {
      throw notFound("Truck not found.");
    }

    return truck;
  });
}

async function ensureTruckCanBeAssigned(
  client: PoolClient,
  truckIds: string[],
  requestId: string,
  trucks: TruckRow[],
) {
  if (trucks.some((truck) => truck.status === "maintenance")) {
    throw badRequest("Truck is under maintenance and cannot be assigned.");
  }

  const result = await client.query<{ id: string }>(
    `
      SELECT tr.id
      FROM transport_requests tr
      LEFT JOIN transport_request_trucks trt ON trt.transport_request_id = tr.id
      WHERE (tr.truck_id = ANY($1::uuid[]) OR trt.truck_id = ANY($1::uuid[]))
        AND tr.id <> $2
        AND tr.status IN ('assigned', 'in_progress')
      LIMIT 1
    `,
    [truckIds, requestId],
  );

  if (result.rows[0]) {
    throw conflict("Truck is already assigned to another active request.");
  }
}

async function releasePreviousTruckIfUnused(
  client: PoolClient,
  previousTruckIds: string[],
  requestId: string,
) {
  if (previousTruckIds.length === 0) {
    return;
  }

  const result = await client.query<{ truck_id: string }>(
    `
      SELECT candidate.truck_id
      FROM UNNEST($1::uuid[]) AS candidate(truck_id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM transport_requests tr
        LEFT JOIN transport_request_trucks trt ON trt.transport_request_id = tr.id
        WHERE (tr.truck_id = candidate.truck_id OR trt.truck_id = candidate.truck_id)
          AND tr.id <> $2
          AND tr.status IN ('assigned', 'in_progress')
      )
    `,
    [previousTruckIds, requestId],
  );

  const unusedTruckIds = result.rows.map((row) => row.truck_id);

  if (unusedTruckIds.length > 0) {
    await client.query("UPDATE trucks SET status = 'available' WHERE id = ANY($1::uuid[])", [
      unusedTruckIds,
    ]);
  }
}

export async function assignTruckToTransportRequest(
  requestId: string,
  input: AssignTruckInput,
): Promise<AssignmentResult> {
  return withTransaction(async (client) => {
    const requestRow = await findRequestForUpdate(client, requestId);
    const truckRows = await findTrucksForUpdate(client, input.truckIds);

    await ensureTruckCanBeAssigned(
      client,
      input.truckIds,
      requestRow.id,
      truckRows,
    );

    const request = mapTransportRequest(requestRow);
    const trucks = truckRows.map(mapTruck);
    const primaryTruck = trucks[0];
    const totalCapacity = trucks.reduce((sum, truck) => sum + truck.maxCapacity, 0);
    const totalFuelConsumptionPerKm = trucks.reduce(
      (sum, truck) => sum + truck.fuelConsumptionPerKm,
      0,
    );
    const capacityWarning = calculateCapacityWarning(
      request.cattleCount,
      totalCapacity,
    );

    if (capacityWarning && !input.confirmCapacityOverflow) {
      throw conflict("Truck capacity is exceeded. Explicit confirmation is required.", {
        excessCattle: capacityWarning.excessCattle,
        tripsNeeded: capacityWarning.tripsNeeded,
      });
    }

    const origin = { lat: request.originLat, lng: request.originLng };
    const destination = {
      lat: request.destinationLat,
      lng: request.destinationLng,
    };
    const distanceKm = Number(
      (
        (await calculateRoadDistanceKm(origin, destination)) ??
        calculateHaversineDistanceKm(origin, destination)
      ).toFixed(1),
    );
    const fuelPrice = await getFuelPriceById(client, input.fuelPriceId);
    const fuelCostPerLiter = fuelPrice.pricePerLiter;
    const tripsNeeded = calculateTripsNeeded(
      request.cattleCount,
      totalCapacity,
    );
    const fuelCost = calculateFuelCost(
      distanceKm,
      totalFuelConsumptionPerKm,
      fuelCostPerLiter,
      tripsNeeded,
    );
    const estimatedArrivalAt = input.departureAt
      ? calculateEstimatedArrivalAt(input.departureAt, distanceKm, tripsNeeded)
      : null;

    await client.query(
      "DELETE FROM transport_request_trucks WHERE transport_request_id = $1",
      [request.id],
    );
    await releasePreviousTruckIfUnused(client, request.assignedTruckIds, request.id);

    const updatedRequestResult = await client.query<TransportRequestRow>(
      `
        UPDATE transport_requests
        SET truck_id = $1,
          status = 'assigned',
          distance_km = $2,
          fuel_cost = $3,
          fuel_price_id = $9,
          trips_needed = $4,
          departure_at = $5,
          estimated_arrival_at = $6
        WHERE id = $7
        RETURNING id, client_id, client_name, cattle_count, origin_name, origin_lat, origin_lng,
          destination_name, destination_lat, destination_lng, distance_km, fuel_cost, fuel_price_id,
          trips_needed, departure_at, estimated_arrival_at, status, truck_id,
          notes, created_at, updated_at,
          $8::uuid[] AS assigned_truck_ids
      `,
      [
        primaryTruck.id,
        distanceKm,
        fuelCost,
        tripsNeeded,
        input.departureAt,
        estimatedArrivalAt,
        request.id,
        input.truckIds,
        input.fuelPriceId,
      ],
    );

    await Promise.all(
      input.truckIds.map((truckId, index) =>
        client.query(
          `
            INSERT INTO transport_request_trucks (
              transport_request_id, truck_id, sequence
            )
            VALUES ($1, $2, $3)
          `,
          [request.id, truckId, index + 1],
        ),
      ),
    );

    const updatedTruckResult = await client.query<TruckRow>(
      `
        UPDATE trucks
        SET status = 'assigned'
        WHERE id = ANY($1::uuid[])
        RETURNING id, license_plate, max_capacity, fuel_consumption_per_km, status, created_at, updated_at
      `,
      [input.truckIds],
    );
    const updatedTrucksById = new Map(
      updatedTruckResult.rows.map((row) => [row.id, mapTruck(row)]),
    );
    const updatedTrucks = input.truckIds.map((id) => updatedTrucksById.get(id) as Truck);

    return {
      request: mapTransportRequest(updatedRequestResult.rows[0]),
      truck: updatedTrucks[0],
      trucks: updatedTrucks,
      metrics: {
        distanceKm,
        fuelCost,
        fuelCostPerLiter,
        fuelPrice,
        tripsNeeded,
      },
      capacityWarning,
    };
  });
}

export async function unassignTruckFromTransportRequest(requestId: string) {
  return withTransaction(async (client) => {
    const requestRow = await findRequestForUpdate(client, requestId);
    const request = mapTransportRequest(requestRow);

    if (request.assignedTruckIds.length === 0) {
      throw badRequest("Transport request does not have an assigned truck.");
    }

    await client.query(
      "DELETE FROM transport_request_trucks WHERE transport_request_id = $1",
      [request.id],
    );
    await releasePreviousTruckIfUnused(client, request.assignedTruckIds, request.id);

    const updatedRequestResult = await client.query<TransportRequestRow>(
      `
        UPDATE transport_requests
        SET truck_id = NULL,
          status = 'pending',
          distance_km = NULL,
          fuel_cost = NULL,
          fuel_price_id = NULL,
          trips_needed = 1,
          departure_at = NULL,
          estimated_arrival_at = NULL
        WHERE id = $1
        RETURNING id, client_id, client_name, cattle_count, origin_name, origin_lat, origin_lng,
          destination_name, destination_lat, destination_lng, distance_km, fuel_cost,
          trips_needed, departure_at, estimated_arrival_at, status, truck_id,
          notes, created_at, updated_at,
          ARRAY[]::uuid[] AS assigned_truck_ids
      `,
      [request.id],
    );

    return mapTransportRequest(updatedRequestResult.rows[0]);
  });
}
