export const truckStatuses = ["available", "assigned", "maintenance"] as const;
export type TruckStatus = (typeof truckStatuses)[number];

export const requestStatuses = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TransportRequestStatus = (typeof requestStatuses)[number];

export type Truck = {
  id: string;
  licensePlate: string;
  maxCapacity: number;
  fuelConsumptionPerKm: number;
  status: TruckStatus;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  companyName: string;
  businessName: string;
  documentNumber: string;
  documentTypeId: number;
  documentTypeName: string;
  phoneNumber: string;
  cityId: number;
  cityName: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentType = {
  id: number;
  name: string;
};

export type City = {
  id: number;
  name: string;
};

export type TransportRequest = {
  id: string;
  clientId: string | null;
  clientCompanyName: string | null;
  clientName: string;
  cattleCount: number;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number | null;
  fuelCost: number | null;
  fuelPriceId: string | null;
  tripsNeeded: number | null;
  departureAt: string | null;
  estimatedArrivalAt: string | null;
  status: TransportRequestStatus;
  truckId: string | null;
  assignedTruckIds: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Coordinates = {
  lat: number;
  lng: number;
};
