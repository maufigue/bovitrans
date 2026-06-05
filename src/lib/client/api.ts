import type {
  AxleConfiguration,
  Client,
  City,
  DocumentType,
  AppModulePermission,
  AppUser,
  TransportRequest,
  Truck,
  VehicleConfiguration,
} from "@/lib/domain/types";

type ApiResponse<T> = {
  data: T;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
    details?: unknown;
  };
};

export type AssignmentResponse = {
  request: TransportRequest;
  truck: Truck;
  trucks: Truck[];
  metrics: {
    distanceKm: number;
    fuelCost: number;
    fuelCostPerLiter: number;
    fuelPrice: {
      id: string;
      brand: string;
      fuelType: string;
      productName: string;
      pricePerLiter: number;
      currency: "PYG" | "USD";
      validFrom: string | null;
      sourceUrl: string | null;
      scrapedAt: string | null;
      source: "petropar" | "comparison";
    };
    tripsNeeded: number;
  };
  capacityWarning: {
    excessCattle: number;
    tripsNeeded: number;
  } | null;
};

export type FuelPrice = {
  id: string;
  brand: string;
  fuelType: string;
  productName: string;
  pricePyg: number;
  validFrom: string | null;
  sourceUrl: string;
  scrapedAt: string;
  createdAt: string;
  official: boolean;
};

export class ClientApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | null;

    throw new ClientApiError(
      response.status,
      errorPayload?.error?.message ?? "No se pudo completar la operacion.",
      errorPayload?.error?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (payload as ApiResponse<T>).data;
}

export function fetchTrucks() {
  return requestJson<Truck[]>("/api/trucks");
}

export function createTruck(input: {
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
  status?: Truck["status"];
}) {
  return requestJson<Truck>("/api/trucks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTruck(
  truckId: string,
  input: Partial<{
    licensePlate: string;
    brand: string;
    model: string;
    enginePowerHp: number | null;
    tareWeightTons: number;
    emptyFuelConsumptionPerKm: number;
    fuelConsumptionPerTonKm: number;
    maxCapacity: number;
    vehicleConfiguration: VehicleConfiguration;
    axleConfiguration: AxleConfiguration;
    lengthM: number;
    maxWeightTons: number;
    referenceCattleWeightKg: number;
    fuelConsumptionPerKm: number;
    status: Truck["status"];
  }>,
) {
  return requestJson<Truck>(`/api/trucks/${truckId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteTruck(truckId: string) {
  return requestJson<void>(`/api/trucks/${truckId}`, { method: "DELETE" });
}

export function login(input: { identifier: string; password: string }) {
  return requestJson<AppUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchAppUsers() {
  return requestJson<AppUser[]>("/api/users");
}

export function createAppUser(input: {
  username: string;
  email: string;
  fullName: string;
  password: string;
  active: boolean;
  permissions: AppModulePermission[];
}) {
  return requestJson<AppUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAppUser(
  userId: string,
  input: Partial<{
    username: string;
    email: string;
    fullName: string;
    password: string;
    active: boolean;
    permissions: AppModulePermission[];
  }>,
) {
  return requestJson<AppUser>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAppUser(userId: string) {
  return requestJson<void>(`/api/users/${userId}`, { method: "DELETE" });
}

export function fetchTransportRequests() {
  return requestJson<TransportRequest[]>("/api/transport-requests");
}

export function createTransportRequest(input: {
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
  departureAt: string;
  notes: string | null;
  source?: "internal" | "external";
  routePending?: boolean;
}) {
  return requestJson<TransportRequest>("/api/transport-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTransportRequestDetails(
  requestId: string,
  input: Partial<{
    cattleCount: number;
    cattleWeightMinKg: number;
    cattleWeightMaxKg: number;
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    departureAt: string;
    notes: string | null;
    routePending: boolean;
  }>,
) {
  return requestJson<TransportRequest>(`/api/transport-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateTransportRequestStatus(
  requestId: string,
  status: TransportRequest["status"],
) {
  return requestJson<TransportRequest>(`/api/transport-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function fetchClients(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return requestJson<Client[]>(`/api/clients${query}`);
}

export function fetchDocumentTypes() {
  return requestJson<DocumentType[]>("/api/document-types");
}

export function fetchCities() {
  return requestJson<City[]>("/api/cities");
}

export function createClient(input: {
  companyName: string;
  businessName: string;
  documentNumber: string;
  documentTypeId: number;
  phoneNumber: string;
  cityId: number;
  email: string | null;
}) {
  return requestJson<Client>("/api/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateClient(
  clientId: string,
  input: {
    companyName: string;
    businessName: string;
    documentNumber: string;
    documentTypeId: number;
    phoneNumber: string;
    cityId: number;
    email: string | null;
  },
) {
  return requestJson<Client>(`/api/clients/${clientId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteClient(clientId: string) {
  return requestJson<void>(`/api/clients/${clientId}`, { method: "DELETE" });
}

export function selectRequestClient(requestId: string, clientId: string) {
  return requestJson<TransportRequest>(`/api/transport-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ clientId }),
  });
}

export function fetchFuelPrices(limit = 20) {
  return requestJson<FuelPrice[]>(`/api/fuel-prices?limit=${limit}`);
}

export function refreshFuelPrices() {
  return requestJson<{
    detected: number;
    inserted: number;
    sources: { comparison: number; petropar: number };
  }>("/api/fuel-prices", { method: "POST", body: JSON.stringify({}) });
}

export function assignTruck(params: {
  requestId: string;
  truckId: string;
  truckIds?: string[];
  departureAt?: string | null;
  confirmCapacityOverflow?: boolean;
  fuelPriceId: string;
  confirmAssignment?: boolean;
}) {
  return requestJson<AssignmentResponse>(
    `/api/transport-requests/${params.requestId}/assign-truck`,
    {
      method: "POST",
      body: JSON.stringify({
        truckId: params.truckId,
        truckIds: params.truckIds ?? [params.truckId],
        departureAt: params.departureAt ?? null,
        confirmCapacityOverflow: params.confirmCapacityOverflow ?? false,
        fuelPriceId: params.fuelPriceId,
        confirmAssignment: params.confirmAssignment ?? false,
      }),
    },
  );
}

export function unassignTruck(requestId: string) {
  return requestJson<TransportRequest>(
    `/api/transport-requests/${requestId}/unassign-truck`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function deleteTransportRequest(requestId: string) {
  return requestJson<void>(`/api/transport-requests/${requestId}`, { method: "DELETE" });
}
