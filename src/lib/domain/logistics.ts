import type { Coordinates, VehicleConfiguration } from "@/lib/domain/types";

const EARTH_RADIUS_KM = 6_371;
const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";
const BASE_FUEL_CONSUMPTION_BY_VEHICLE: Record<VehicleConfiguration, number> = {
  simple_truck: 0.28,
  truck_with_trailer: 0.36,
  trailer: 0.18,
  truck_semitrailer: 0.38,
  truck_semitrailer_trailer: 0.48,
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateHaversineDistanceKm(
  origin: Coordinates,
  destination: Coordinates,
) {
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(deltaLng / 2) ** 2;

  const distance = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));

  return Number(distance.toFixed(1));
}

export async function calculateRoadDistanceKm(
  origin: Coordinates,
  destination: Coordinates,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const routeUrl = `${OSRM_ROUTE_URL}/${coordinates}?overview=false&alternatives=false&steps=false`;

  try {
    const response = await fetch(routeUrl, { signal: controller.signal });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      routes?: Array<{
        distance?: number;
      }>;
    };
    const distanceMeters = payload.routes?.[0]?.distance;

    if (!Number.isFinite(distanceMeters)) {
      return null;
    }

    return Number(((distanceMeters ?? 0) / 1000).toFixed(1));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function calculateFuelCost(
  distanceKm: number,
  fuelConsumptionPerKm: number,
  fuelCostPerLiter: number,
  tripsNeeded = 1,
  emptyReturnFuelConsumptionPerKm = 0,
) {
  const operationalDistanceKm = Number(distanceKm.toFixed(1));
  const emptyReturnTrips = Math.max(tripsNeeded - 1, 0);
  const cost =
    operationalDistanceKm *
    fuelCostPerLiter *
    (fuelConsumptionPerKm * tripsNeeded +
      emptyReturnFuelConsumptionPerKm * emptyReturnTrips);

  return Math.round(cost);
}

export function calculateTripsNeeded(
  cattleCount: number,
  truckCapacity: number,
) {
  return Math.ceil(cattleCount / truckCapacity);
}

export function calculateAverageCattleWeightKg(
  minWeightKg: number,
  maxWeightKg: number,
) {
  return Math.round((minWeightKg + maxWeightKg) / 2);
}

export function calculateTruckWeightCapacity(
  maxWeightTons: number,
  averageCattleWeightKg: number,
) {
  if (averageCattleWeightKg <= 0) return 0;
  return Math.floor((maxWeightTons * 1000) / averageCattleWeightKg);
}

export function calculateEffectiveTruckCapacity({
  maxWeightTons,
  averageCattleWeightKg,
}: {
  maxWeightTons: number;
  averageCattleWeightKg: number;
}) {
  return Math.max(0, calculateTruckWeightCapacity(
    maxWeightTons,
    averageCattleWeightKg,
  ));
}

export function estimateFuelConsumptionPerKm({
  vehicleConfiguration,
  maxWeightTons,
  emptyFuelConsumptionPerKm,
  fuelConsumptionPerTonKm,
  cattleCount,
  averageCattleWeightKg,
}: {
  vehicleConfiguration: VehicleConfiguration;
  maxWeightTons: number;
  emptyFuelConsumptionPerKm?: number | null;
  fuelConsumptionPerTonKm?: number | null;
  cattleCount: number;
  averageCattleWeightKg: number;
}) {
  const cargoWeightTons = (cattleCount * averageCattleWeightKg) / 1000;

  if (
    emptyFuelConsumptionPerKm &&
    emptyFuelConsumptionPerKm > 0 &&
    fuelConsumptionPerTonKm &&
    fuelConsumptionPerTonKm > 0
  ) {
    return Number(
      (emptyFuelConsumptionPerKm + cargoWeightTons * fuelConsumptionPerTonKm).toFixed(3),
    );
  }

  const baseConsumption =
    BASE_FUEL_CONSUMPTION_BY_VEHICLE[vehicleConfiguration] ??
    BASE_FUEL_CONSUMPTION_BY_VEHICLE.truck_semitrailer;
  const legalWeightKg = maxWeightTons * 1000;
  const cargoWeightKg = cargoWeightTons * 1000;
  const loadRatio = legalWeightKg > 0 ? Math.min(cargoWeightKg / legalWeightKg, 1) : 0;
  const loadAdjustment = 1 + loadRatio * 0.28;

  return Number((baseConsumption * loadAdjustment).toFixed(3));
}

export function calculateEstimatedArrivalAt(
  departureAt: Date,
  distanceKm: number,
  tripsNeeded: number,
  averageSpeedKmH = 55,
) {
  const emptyReturnTrips = Math.max(tripsNeeded - 1, 0);
  const travelHours =
    (distanceKm * (tripsNeeded + emptyReturnTrips)) / averageSpeedKmH;
  const travelMilliseconds = Math.ceil(travelHours * 60 * 60 * 1000);

  return new Date(departureAt.getTime() + travelMilliseconds);
}

export function calculateCapacityWarning(
  cattleCount: number,
  truckCapacity: number,
) {
  if (cattleCount <= truckCapacity) {
    return null;
  }

  return {
    excessCattle: cattleCount - truckCapacity,
    tripsNeeded: calculateTripsNeeded(cattleCount, truckCapacity),
  };
}
