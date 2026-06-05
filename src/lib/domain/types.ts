export const truckStatuses = ["available", "assigned", "maintenance"] as const;
export type TruckStatus = (typeof truckStatuses)[number];

export const vehicleConfigurations = [
  "simple_truck",
  "truck_with_trailer",
  "trailer",
  "truck_semitrailer",
  "truck_semitrailer_trailer",
] as const;
export type VehicleConfiguration = (typeof vehicleConfigurations)[number];

export const axleConfigurations = [
  "single_single",
  "single_dual",
  "double_single",
  "double_dual_single",
  "double_dual",
  "triple_dual_single",
  "triple_dual",
] as const;
export type AxleConfiguration = (typeof axleConfigurations)[number];

export const vehicleConfigurationSpecs: Record<
  VehicleConfiguration,
  { label: string; maxLengthM: number }
> = {
  simple_truck: { label: "Camión simple", maxLengthM: 14 },
  truck_with_trailer: { label: "Camión con acoplado", maxLengthM: 20 },
  trailer: { label: "Acoplado", maxLengthM: 8.6 },
  truck_semitrailer: { label: "Camión semi-remolque", maxLengthM: 22.4 },
  truck_semitrailer_trailer: {
    label: "Camión con semi y acoplado",
    maxLengthM: 28,
  },
};

export const axleConfigurationSpecs: Record<
  AxleConfiguration,
  { label: string; maxWeightTons: number }
> = {
  single_single: { label: "Simple / Simple", maxWeightTons: 6 },
  single_dual: { label: "Simple / Doble", maxWeightTons: 10.5 },
  double_single: { label: "Doble / Simple", maxWeightTons: 10 },
  double_dual_single: { label: "Doble / Doble y Simple", maxWeightTons: 14 },
  double_dual: { label: "Doble / Doble", maxWeightTons: 18 },
  triple_dual_single: { label: "Triple / Doble y Simple", maxWeightTons: 21 },
  triple_dual: { label: "Triple / Doble", maxWeightTons: 25.5 },
};

export const truckTechnicalPresets = [
  {
    id: "scania-g-440",
    label: "Scania G 440",
    brand: "Scania",
    model: "G 440",
    vehicleConfiguration: "truck_semitrailer",
    axleConfiguration: "triple_dual",
    enginePowerHp: 440,
    tareWeightTons: 9.2,
    emptyFuelConsumptionPerKm: 0.32,
    fuelConsumptionPerTonKm: 0.0065,
  },
  {
    id: "scania-r-450",
    label: "Scania R 450",
    brand: "Scania",
    model: "R 450",
    vehicleConfiguration: "truck_semitrailer",
    axleConfiguration: "triple_dual",
    enginePowerHp: 450,
    tareWeightTons: 9.4,
    emptyFuelConsumptionPerKm: 0.31,
    fuelConsumptionPerTonKm: 0.0063,
  },
  {
    id: "volvo-fh-460",
    label: "Volvo FH 460",
    brand: "Volvo",
    model: "FH 460",
    vehicleConfiguration: "truck_semitrailer",
    axleConfiguration: "triple_dual",
    enginePowerHp: 460,
    tareWeightTons: 9.5,
    emptyFuelConsumptionPerKm: 0.32,
    fuelConsumptionPerTonKm: 0.0064,
  },
  {
    id: "mercedes-actros-2645",
    label: "Mercedes-Benz Actros 2645",
    brand: "Mercedes-Benz",
    model: "Actros 2645",
    vehicleConfiguration: "truck_semitrailer",
    axleConfiguration: "triple_dual",
    enginePowerHp: 450,
    tareWeightTons: 9.6,
    emptyFuelConsumptionPerKm: 0.33,
    fuelConsumptionPerTonKm: 0.0066,
  },
] as const satisfies Array<{
  id: string;
  label: string;
  brand: string;
  model: string;
  vehicleConfiguration: VehicleConfiguration;
  axleConfiguration: AxleConfiguration;
  enginePowerHp: number;
  tareWeightTons: number;
  emptyFuelConsumptionPerKm: number;
  fuelConsumptionPerTonKm: number;
}>;

export const requestStatuses = [
  "pending",
  "assigned",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TransportRequestStatus = (typeof requestStatuses)[number];

export type Truck = {
  id: string;
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
  status: TruckStatus;
  createdAt: string;
  updatedAt: string;
};

export const appModules = ["logistics", "fleet", "users"] as const;
export type AppModulePermission = (typeof appModules)[number];

export type AppUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  superuser: boolean;
  active: boolean;
  permissions: AppModulePermission[];
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
  cattleWeightMinKg: number;
  cattleWeightMaxKg: number;
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
  source: "internal" | "external";
  routePending: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Coordinates = {
  lat: number;
  lng: number;
};
