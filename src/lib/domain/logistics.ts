import type { Coordinates } from "@/lib/domain/types";

const EARTH_RADIUS_KM = 6_371;
const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";

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
) {
  const operationalDistanceKm = Number(distanceKm.toFixed(1));
  const cost =
    operationalDistanceKm * fuelConsumptionPerKm * fuelCostPerLiter * tripsNeeded;

  return Math.round(cost);
}

export function calculateTripsNeeded(
  cattleCount: number,
  truckCapacity: number,
) {
  return Math.ceil(cattleCount / truckCapacity);
}

export function calculateEstimatedArrivalAt(
  departureAt: Date,
  distanceKm: number,
  tripsNeeded: number,
  averageSpeedKmH = 55,
) {
  const travelHours = (distanceKm * tripsNeeded) / averageSpeedKmH;
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
