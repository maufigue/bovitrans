"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  CheckCheck,
  ChevronLeft,
  ClipboardCheck,
  ClipboardPlus,
  Copyright,
  Home,
  Info,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  PanelLeftClose,
  Pencil,
  Plus,
  RefreshCw,
  Sun,
  Trash2,
  Truck as TruckIcon,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  assignTruck,
  ClientApiError,
  createClient,
  createTransportRequest,
  deleteTransportRequest,
  deleteClient,
  fetchCities,
  fetchClients,
  fetchDocumentTypes,
  fetchFuelPrices,
  login,
  refreshFuelPrices,
  fetchTransportRequests,
  fetchTrucks,
  selectRequestClient,
  unassignTruck,
  updateClient,
  updateTransportRequestDetails,
  updateTransportRequestStatus,
  type AssignmentResponse,
  type FuelPrice,
} from "@/lib/client/api";
import type {
  AppModulePermission,
  AppUser,
  Client,
  City,
  DocumentType,
  TransportRequest,
  Truck,
} from "@/lib/domain/types";
import { RouteMapClient } from "@/components/map/RouteMapClient";
import { LocationPickerMapClient } from "@/components/map/LocationPickerMapClient";
import { FleetManagementView } from "@/components/fleet/FleetManagementView";
import { UserManagementView } from "@/components/users/UserManagementView";

type CapacityWarningDetails = {
  excessCattle: number;
  tripsNeeded: number;
};

type DashboardView = "create" | "pending" | "assigned" | "confirmed" | "completed" | "cancelled";
type AppModule = "home" | AppModulePermission;
type ConfirmationAction = "confirm" | "complete" | "cancel" | "delete" | "void" | null;

type RouteLocation = {
  name: string;
  lat: number;
  lng: number;
};

type ClientForm = {
  companyName: string;
  businessName: string;
  documentNumber: string;
  documentTypeId: number;
  phoneCountryCode: string;
  phoneNumber: string;
  cityId: number;
  email: string;
};

const emptyClientForm: ClientForm = {
  companyName: "",
  businessName: "",
  documentNumber: "",
  documentTypeId: 0,
  phoneCountryCode: "+595",
  phoneNumber: "",
  cityId: 1,
  email: "",
};

const companyWhatsAppNumber = "+595971897622";
const countryDialCodes = [
  { code: "+595", label: "Paraguay +595" },
  { code: "+54", label: "Argentina +54" },
  { code: "+55", label: "Brasil +55" },
  { code: "+598", label: "Uruguay +598" },
  { code: "+56", label: "Chile +56" },
  { code: "+591", label: "Bolivia +591" },
];

const statusLabels = {
  pending: "Pendiente",
  assigned: "Asignada",
  confirmed: "Confirmada",
  in_progress: "En ruta",
  completed: "Completada",
  cancelled: "Cancelada",
};

const truckStatusLabels = {
  available: "Disponible",
  assigned: "Asignado",
  maintenance: "Mantenimiento",
};

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("es-PY", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(value: number, currency: "PYG" | "USD" = "USD") {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PYG" ? 0 : 2,
  }).format(value);
}

function formatGuaraniCost(value: number) {
  return `Gs. ${new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value)}`;
}

function formatGuaraniFuelPrice(value: number) {
  return `Gs. ${Math.round(value)}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatOptionalDateTime(value: string | null) {
  return value ? formatDateTime(value) : "Pendiente";
}

function formatPhoneForStorage(countryCode: string, phoneNumber: string) {
  const trimmed = phoneNumber.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.replace(/\D/g, "")}`;
  }

  const localNumber = trimmed.replace(/\D/g, "").replace(/^0+/, "");
  const cleanCountryCode = countryCode.replace(/\D/g, "");

  return `+${cleanCountryCode}${localNumber}`;
}

function splitPhoneNumber(phoneNumber: string) {
  const normalized = phoneNumber.trim();
  const compact = normalized.replace(/\s/g, "");
  const match = countryDialCodes.find((country) => compact.startsWith(country.code));

  if (!match) {
    return { phoneCountryCode: "+595", phoneNumber: normalized.replace(/^\+595/, "") };
  }

  return {
    phoneCountryCode: match.code,
    phoneNumber: compact.replace(match.code, ""),
  };
}

function toWhatsAppNumber(phoneNumber: string) {
  return phoneNumber.replace(/\D/g, "");
}

function buildBudgetMessage({
  client,
  request,
}: {
  client: Client | null;
  request: TransportRequest;
}) {
  const clientName = client?.companyName || request.clientCompanyName || request.clientName;

  return [
    "Le compartimos el presupuesto logístico solicitado:",
    "",
    `Cliente: ${clientName}`,
    `Ruta: ${request.originName} -> ${request.destinationName}`,
    `Cabezas de ganado: ${formatNumber(request.cattleCount, 0)}`,
    `Rango de peso: ${formatNumber(request.cattleWeightMinKg, 0)} a ${formatNumber(request.cattleWeightMaxKg, 0)} kg/cabeza`,
    `Distancia estimada: ${request.distanceKm ? `${formatNumber(request.distanceKm, 1)} km` : "Pendiente"}`,
    `Camiones asignados: ${formatNumber(request.assignedTruckIds.length, 0)}`,
    `Viajes estimados: ${formatNumber(request.tripsNeeded ?? 1, 0)}`,
    `Salida: ${formatOptionalDateTime(request.departureAt)}`,
    `Llegada estimada: ${formatOptionalDateTime(request.estimatedArrivalAt)}`,
    `Costo estimado de combustible: ${request.fuelCost ? formatGuaraniCost(request.fuelCost) : "Pendiente"}`,
    "",
    "Para confirmar el presupuesto, responda este mensaje con: Ok",
    "Luego adjunte la imagen del comprobante de transferencia bancaria por el costo total de la operación.",
    "",
    "Datos para transferencia:",
    "Alias: RUC 5378130-9",
    "",
    "Si no acepta el presupuesto, responda este mensaje con: No",
    "",
    `Contacto BOVITRANS: ${companyWhatsAppNumber}`,
  ].join("\n");
}

function buildWhatsAppUrl(client: Client | null, request: TransportRequest) {
  if (!client?.phoneNumber) return null;
  const number = toWhatsAppNumber(client.phoneNumber);
  if (!number) return null;

  return `https://wa.me/${number}?text=${encodeURIComponent(
    buildBudgetMessage({ client, request }),
  )}`;
}

function buildExternalInquiryUrl(client: Client | null, request: TransportRequest) {
  if (!client?.phoneNumber) return null;
  const number = toWhatsAppNumber(client.phoneNumber);
  if (!number) return null;
  const name = client.companyName || request.clientCompanyName || request.clientName;
  const message = [
    `Hola ${name}, le saluda el equipo de BOVITRANS.`,
    "",
    "Recibimos su solicitud de presupuesto de logística ganadera desde nuestra web.",
    "Para evaluarla correctamente, por favor indíquenos:",
    "",
    "1. Punto de origen",
    "2. Punto de destino",
    "3. Fecha y horario deseados de salida",
    "4. Cantidad de cabezas de ganado",
    "",
    "Con esos datos prepararemos el presupuesto correspondiente.",
  ].join("\n");

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function toDateTimeInputValue(value: Date) {
  const offsetMs = value.getTimezoneOffset() * 60 * 1000;

  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getInitialDepartureAt(request: TransportRequest | null) {
  if (
    request?.departureAt &&
    new Date(request.departureAt).getTime() >= Date.now()
  ) {
    return toDateTimeInputValue(new Date(request.departureAt));
  }

  return toDateTimeInputValue(new Date(Date.now() + 5 * 60 * 1000));
}

function formatFuelPrice(assignment: AssignmentResponse) {
  const { fuelPrice } = assignment.metrics;
  const price =
    fuelPrice.currency === "PYG"
      ? formatGuaraniFuelPrice(fuelPrice.pricePerLiter)
      : formatCurrency(fuelPrice.pricePerLiter, fuelPrice.currency);
  return `${price} - ${fuelPrice.brand}`;
}

function getSelectedTrucks(trucks: Truck[], truckIds: string[]) {
  return truckIds
    .map((truckId) => trucks.find((truck) => truck.id === truckId))
    .filter((truck): truck is Truck => Boolean(truck));
}

function getAverageCattleWeight(request: TransportRequest | null) {
  if (!request) return 450;
  return Math.round((request.cattleWeightMinKg + request.cattleWeightMaxKg) / 2);
}

function getTruckEffectiveCapacity(truck: Truck, averageCattleWeightKg: number) {
  return Math.floor(
    (truck.maxWeightTons * 1000) / Math.max(averageCattleWeightKg, 1),
  );
}

function getEstimatedFuelConsumptionPerKm(
  truck: Truck,
  averageCattleWeightKg: number,
  cattleCount: number,
) {
  const cargoWeightTons = (cattleCount * averageCattleWeightKg) / 1000;

  if (truck.emptyFuelConsumptionPerKm > 0 && truck.fuelConsumptionPerTonKm > 0) {
    return Number(
      (
        truck.emptyFuelConsumptionPerKm +
        cargoWeightTons * truck.fuelConsumptionPerTonKm
      ).toFixed(3),
    );
  }

  const baseConsumption = {
    simple_truck: 0.28,
    truck_with_trailer: 0.36,
    trailer: 0.18,
    truck_semitrailer: 0.38,
    truck_semitrailer_trailer: 0.48,
  }[truck.vehicleConfiguration];
  const loadRatio = Math.min(cargoWeightTons / truck.maxWeightTons, 1);

  return Number((baseConsumption * (1 + loadRatio * 0.28)).toFixed(3));
}

function getTotalCapacity(trucks: Truck[], averageCattleWeightKg: number) {
  return trucks.reduce(
    (total, truck) => total + getTruckEffectiveCapacity(truck, averageCattleWeightKg),
    0,
  );
}

function getCapacityWarning(
  request: TransportRequest | null,
  selectedTrucks: Truck[],
) {
  const totalCapacity = getTotalCapacity(
    selectedTrucks,
    getAverageCattleWeight(request),
  );

  if (!request || selectedTrucks.length === 0 || request.cattleCount <= totalCapacity) {
    return null;
  }

  return {
    excessCattle: request.cattleCount - totalCapacity,
    tripsNeeded: Math.ceil(request.cattleCount / totalCapacity),
  };
}

function getRequestScore(request: TransportRequest) {
  if (request.status === "pending") return 3;
  if (request.status === "assigned") return 2;
  if (request.status === "confirmed") return 1;
  if (request.status === "in_progress") return 1;
  return 0;
}

function StatusBadge({ status }: { status: TransportRequest["status"] }) {
  const tone =
    status === "pending"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : status === "assigned"
        ? "bg-sky-50 text-sky-700 ring-sky-200"
        : status === "confirmed" || status === "completed"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-zinc-100 text-zinc-600 ring-zinc-200";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {statusLabels[status]}
    </span>
  );
}

function TruckStatusBadge({ status }: { status: Truck["status"] }) {
  const tone =
    status === "available"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "assigned"
        ? "bg-sky-50 text-sky-700 ring-sky-200"
        : "bg-zinc-100 text-zinc-600 ring-zinc-200";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {truckStatusLabels[status]}
    </span>
  );
}

function Metric({
  label,
  value,
  helper,
  align = "left",
  compact = false,
  wrapValue = false,
  className = "",
}: {
  label: string;
  value: string;
  helper?: string;
  align?: "left" | "center";
  compact?: boolean;
  wrapValue?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col rounded-md border border-zinc-200 bg-white p-3 ${
        compact ? "min-h-20 justify-between" : ""
      } ${align === "center" ? "items-center text-center" : ""} ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold leading-tight text-zinc-950 ${
          wrapValue
            ? "break-words text-sm sm:text-base"
            : "whitespace-nowrap text-base sm:text-lg"
        }`}
      >
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-zinc-500">{helper}</p> : null}
    </div>
  );
}

function RequestList({
  requests,
  selectedRequestId,
  title,
  onSelect,
}: {
  requests: TransportRequest[];
  selectedRequestId: string | null;
  title: string;
  onSelect: (requestId: string) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
          Solicitudes
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-950">
          {title}
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {requests.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500">
              No hay solicitudes en esta bandeja.
            </div>
          ) : requests.map((request) => {
            const selected = request.id === selectedRequestId;

            return (
              <button
                key={request.id}
                className={`w-full rounded-md border p-4 text-left transition ${
                  selected
                    ? "operational-request-selected border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                }`}
                type="button"
                onClick={() => onSelect(request.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {request.clientCompanyName || request.clientName}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        selected ? "selected-request-muted text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {request.originName} hacia {request.destinationName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      selected
                        ? "selected-request-count bg-white/10 text-white"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {request.cattleCount}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span
                    className={`text-xs ${
                      selected ? "selected-request-muted text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    {request.distanceKm
                      ? `${formatNumber(request.distanceKm, 1)} km`
                      : "Sin calcular"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selected
                        ? "selected-request-status bg-white text-zinc-950"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {statusLabels[request.status]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function RoutePanel({ request }: { request: TransportRequest }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
            Ruta
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">
            {request.originName} a {request.destinationName}
          </h3>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
              Origen
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">
              {request.originName}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {request.originLat}, {request.originLng}
            </p>
          </div>
          <div className="hidden h-px w-20 bg-zinc-300 md:block" />
          <div className="md:text-right">
            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
              Destino
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">
              {request.destinationName}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {request.destinationLat}, {request.destinationLng}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <RouteMapClient
          destination={{
            lat: request.destinationLat,
            lng: request.destinationLng,
            name: request.destinationName,
          }}
          distanceKm={request.distanceKm}
          origin={{
            lat: request.originLat,
            lng: request.originLng,
            name: request.originName,
          }}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[0.7fr_0.8fr_1.5fr]">
        <Metric
          align="center"
          label="Cabezas"
          value={formatNumber(request.cattleCount, 0)}
        />
        <Metric
          align="center"
          label="Peso"
          value={`${formatNumber(request.cattleWeightMinKg, 0)}-${formatNumber(request.cattleWeightMaxKg, 0)} kg`}
        />
        <Metric
          align="center"
          label="Distancia"
          value={
            request.distanceKm
              ? `${formatNumber(request.distanceKm, 1)} km`
              : "Pendiente"
          }
        />
        <Metric
          label="Costo"
          value={request.fuelCost ? formatGuaraniCost(request.fuelCost) : "Pendiente"}
        />
      </div>
      {request.departureAt || request.estimatedArrivalAt ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Metric
            label="Salida"
            wrapValue
            value={
              request.departureAt
                ? formatDateTime(request.departureAt)
                : "Sin programar"
            }
          />
          <Metric
            label="Llegada estimada"
            wrapValue
            value={
              request.estimatedArrivalAt
                ? formatDateTime(request.estimatedArrivalAt)
                : "Sin calcular"
            }
          />
        </div>
      ) : null}
      <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-semibold uppercase text-zinc-500">Observaciones</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
          {request.notes || "Sin observaciones registradas."}
        </p>
      </div>
    </section>
  );
}

function FuelPriceCard({ prices }: { prices: FuelPrice[] }) {
  const dieselPrice =
    prices.find((price) => price.productName === "Diésel Porã") ?? prices[0] ?? null;

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
            Combustible PETROPAR
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">
            {dieselPrice ? dieselPrice.productName : "Sin precio cargado"}
          </h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          Oficial
        </span>
      </div>

      {dieselPrice ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric
            compact
            label="Precio"
            value={formatGuaraniFuelPrice(dieselPrice.pricePyg)}
          />
          <Metric
            compact
            label="Vigencia"
            value={dieselPrice.validFrom ? formatDate(dieselPrice.validFrom) : "Sin vigencia"}
          />
          <Metric
            compact
            label="Última actualización"
            value={formatDate(dieselPrice.scrapedAt)}
          />
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ejecuta el scraper PETROPAR para cargar precios vigentes.
        </div>
      )}
    </section>
  );
}

function FuelSelectorCard({
  prices,
  selectedFuelPriceId,
  refreshing,
  onFuelPriceChange,
  onRefresh,
}: {
  prices: FuelPrice[];
  selectedFuelPriceId: string;
  refreshing: boolean;
  onFuelPriceChange: (id: string) => void;
  onRefresh: () => void;
}) {
  const selectedPrice =
    prices.find((price) => price.id === selectedFuelPriceId) ?? prices[0] ?? null;
  const fuelTypes = [...new Set(prices.map((price) => price.fuelType))];
  const selectedFuelType = selectedPrice?.fuelType ?? fuelTypes[0] ?? "";
  const brands = prices.filter((price) => price.fuelType === selectedFuelType);

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
            Combustible
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">
            {selectedPrice
              ? `${selectedPrice.brand} · ${selectedPrice.fuelType}`
              : "Sin precio cargado"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            {selectedPrice?.official ? "Oficial" : "Orientativo"}
          </span>
          <button
            aria-label="Actualizar precios"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            disabled={refreshing}
            title="Actualizar precios"
            type="button"
            onClick={onRefresh}
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} size={17} />
          </button>
        </div>
      </div>

      {selectedPrice ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm"
              value={selectedFuelType}
              onChange={(event) => {
                const first = prices.find(
                  (price) => price.fuelType === event.target.value,
                );
                if (first) onFuelPriceChange(first.id);
              }}
            >
              {fuelTypes.map((fuelType) => (
                <option key={fuelType} value={fuelType}>
                  {fuelType}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm"
              value={selectedPrice.id}
              onChange={(event) => onFuelPriceChange(event.target.value)}
            >
              {brands.map((price) => (
                <option key={price.id} value={price.id}>
                  {price.brand} - {formatGuaraniFuelPrice(price.pricePyg)}
                </option>
              ))}
            </select>
          </div>
          <div
            className={`mt-4 grid gap-3 ${
              selectedPrice.official ? "sm:grid-cols-3" : "sm:grid-cols-2"
            }`}
          >
            <Metric
              compact
              label="Precio"
              value={formatGuaraniFuelPrice(selectedPrice.pricePyg)}
            />
            {selectedPrice.official && selectedPrice.validFrom ? (
              <Metric
                compact
                label="Vigencia"
                value={formatDate(selectedPrice.validFrom)}
              />
            ) : null}
            <Metric
              compact
              label="Última actualización"
              value={formatDate(selectedPrice.scrapedAt)}
            />
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Actualiza los precios para cargar combustibles disponibles.
        </div>
      )}
    </section>
  );
}

function ClientPanel({
  request,
  clients,
  search,
  selectedClientId,
  busy,
  error,
  onSearchChange,
  onSelectedClientChange,
  onFormModeChange,
  onSelect,
}: {
  request: TransportRequest;
  clients: Client[];
  search: string;
  selectedClientId: string;
  busy: boolean;
  error: string | null;
  onSearchChange: (search: string) => void;
  onSelectedClientChange: (clientId: string) => void;
  onFormModeChange: (mode: "create" | "edit" | "delete") => void;
  onSelect: () => void;
}) {
  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ?? null;

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
            Cliente
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">
            {request.clientCompanyName || request.clientName}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label="Crear nuevo cliente"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            title="Crear nuevo cliente"
            type="button"
            onClick={() => onFormModeChange("create")}
          >
            <Plus size={18} />
          </button>
          {selectedClient ? (
            <button
              aria-label="Editar cliente"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
              title="Editar cliente"
              type="button"
              onClick={() => onFormModeChange("edit")}
            >
              <Pencil size={16} />
            </button>
          ) : null}
          <button
            aria-label="Eliminar cliente"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={busy || !selectedClient}
            title="Eliminar cliente"
            type="button"
            onClick={() => onFormModeChange("delete")}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr]">
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950"
          placeholder="Buscar por empresa, razón social, RUC o CI"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <select
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
          value={selectedClientId}
          onChange={(event) => onSelectedClientChange(event.target.value)}
        >
          <option value="">Seleccionar cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName} - {client.documentTypeName} {client.documentNumber}
            </option>
          ))}
        </select>
      </div>

      {selectedClient ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Razón social" value={selectedClient.businessName} wrapValue />
          <Metric label="Empresa" value={selectedClient.companyName} wrapValue />
          <Metric
            label={selectedClient.documentTypeName}
            value={selectedClient.documentNumber}
            wrapValue
          />
          <Metric label="Teléfono" value={selectedClient.phoneNumber} wrapValue />
          <Metric label="Ciudad" value={selectedClient.cityName} wrapValue />
          <Metric label="Correo" value={selectedClient.email || "Sin registrar"} wrapValue />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex justify-center">
        <button
          className="min-h-11 w-full max-w-xs rounded-md bg-zinc-950 px-8 py-2 text-sm font-semibold text-white disabled:bg-zinc-300"
          disabled={busy || !selectedClientId || selectedClientId === request.clientId}
          type="button"
          onClick={onSelect}
        >
          Seleccionar
        </button>
      </div>
    </section>
  );
}

function ClientModal({
  mode,
  client,
  form,
  documentTypes,
  cities,
  busy,
  error,
  onFormChange,
  onClose,
  onSave,
  onDelete,
}: {
  mode: "create" | "edit" | "delete";
  client: Client | null;
  form: ClientForm;
  documentTypes: DocumentType[];
  cities: City[];
  busy: boolean;
  error: string | null;
  onFormChange: (form: ClientForm) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const formIsComplete =
    form.companyName &&
    form.businessName &&
    form.documentNumber &&
    form.documentTypeId > 0 &&
    form.phoneNumber &&
    form.cityId > 0;
  const title =
    mode === "create"
      ? "Nuevo cliente"
      : mode === "edit"
        ? "Editar cliente"
        : "Eliminar cliente";

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
    >
      <section className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
              Gestión de clientes
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950">{title}</h2>
          </div>
          <button
            aria-label="Cerrar ventana"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            disabled={busy}
            title="Cerrar ventana"
            type="button"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        {mode === "delete" ? (
          <div className="p-5">
            <p className="text-sm leading-6 text-zinc-700">
              ¿Eliminar al cliente{" "}
              <strong>{client?.companyName || client?.businessName}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Los clientes vinculados a solicitudes operacionales no pueden
              eliminarse.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <input
              className="h-11 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950"
              placeholder="Nombre de empresa"
              value={form.companyName}
              onChange={(event) =>
                onFormChange({ ...form, companyName: event.target.value })
              }
            />
            <input
              className="h-11 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950"
              placeholder="Razón social"
              value={form.businessName}
              onChange={(event) =>
                onFormChange({ ...form, businessName: event.target.value })
              }
            />
            <select
              className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
              value={form.documentTypeId}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  documentTypeId: Number(event.target.value),
                })
              }
            >
              <option value={0}>Tipo de documento</option>
              {documentTypes.map((documentType) => (
                <option key={documentType.id} value={documentType.id}>
                  {documentType.name}
                </option>
              ))}
            </select>
            <input
              className="h-11 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950"
              placeholder="Número de documento"
              value={form.documentNumber}
              onChange={(event) =>
                onFormChange({ ...form, documentNumber: event.target.value })
              }
            />
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[180px_1fr]">
              <select
                className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
                value={form.phoneCountryCode}
                onChange={(event) =>
                  onFormChange({ ...form, phoneCountryCode: event.target.value })
                }
              >
                {countryDialCodes.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </select>
              <input
                className="h-11 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950"
                placeholder="Número de teléfono"
                value={form.phoneNumber}
                onChange={(event) =>
                  onFormChange({ ...form, phoneNumber: event.target.value })
                }
              />
            </div>
            <select
              className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
              value={form.cityId}
              onChange={(event) =>
                onFormChange({ ...form, cityId: Number(event.target.value) })
              }
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            <input
              className="h-11 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950"
              placeholder="Correo electrónico (opcional)"
              type="email"
              value={form.email}
              onChange={(event) =>
                onFormChange({ ...form, email: event.target.value })
              }
            />
          </div>
        )}

        {error ? (
          <div className="mx-5 mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <button
            className="min-h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            disabled={busy}
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className={`min-h-10 rounded-md px-5 text-sm font-semibold text-white disabled:bg-zinc-300 ${
              mode === "delete" ? "bg-red-700 hover:bg-red-800" : "bg-zinc-950"
            }`}
            disabled={busy || (mode !== "delete" && !formIsComplete)}
            type="button"
            onClick={mode === "delete" ? onDelete : onSave}
          >
            {mode === "delete"
              ? "Eliminar cliente"
              : mode === "edit"
                ? "Guardar cambios"
                : "Crear cliente"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AssignmentPanel({
  request,
  trucks,
  selectedTruckIds,
  onTruckChange,
  departureAt,
  onDepartureAtChange,
  warning,
  assignment,
  onAssign,
  onUnassign,
  onDelete,
  onClearPreview,
  assigning,
  unassigning,
  error,
}: {
  request: TransportRequest;
  trucks: Truck[];
  selectedTruckIds: string[];
  onTruckChange: (truckIds: string[]) => void;
  departureAt: string;
  onDepartureAtChange: (departureAt: string) => void;
  warning: CapacityWarningDetails | null;
  assignment: AssignmentResponse | null;
  onAssign: (confirmOverflow: boolean, confirmAssignment: boolean) => void;
  onUnassign: () => void;
  onDelete: () => void;
  onClearPreview: () => void;
  assigning: boolean;
  unassigning: boolean;
  error: string | null;
}) {
  const minimumDepartureAt = toDateTimeInputValue(
    new Date(Date.now() + 60 * 1000),
  );
  const selectedTrucks = getSelectedTrucks(trucks, selectedTruckIds);
  const averageCattleWeightKg = getAverageCattleWeight(request);
  const selectedTruckCapacity = getTotalCapacity(
    selectedTrucks,
    averageCattleWeightKg,
  );
  let remainingCattleForPreview = request.cattleCount;
  const needsMoreTrucks =
    selectedTruckIds.some(Boolean) && selectedTruckCapacity < request.cattleCount;
  const hasMoreAvailableTrucks = trucks.some(
    (truck) =>
      truck.status === "available" && !selectedTruckIds.includes(truck.id),
  );
  const selectorCount =
    needsMoreTrucks && hasMoreAvailableTrucks
      ? selectedTruckIds.length + 1
      : Math.max(selectedTruckIds.length, 1);
  const hasValidDepartureAt =
    Boolean(departureAt) && new Date(departureAt).getTime() >= Date.now();
  const canAssign =
    selectedTruckIds.some(Boolean) &&
    selectedTruckCapacity >= request.cattleCount &&
    hasValidDepartureAt &&
    !assigning;
  const canConfirmMultipleTrips =
    selectedTruckIds.some(Boolean) &&
    selectedTruckCapacity > 0 &&
    selectedTruckCapacity < request.cattleCount &&
    hasValidDepartureAt &&
    !assigning;
  const canUnassign =
    request.assignedTruckIds.length > 0 && !assigning && !unassigning;

  function updateTruckSelection(index: number, truckId: string) {
    const nextTruckIds = [...selectedTruckIds];

    nextTruckIds[index] = truckId;

    onTruckChange(
      nextTruckIds.filter((currentTruckId, currentIndex, truckIds) => {
        if (!currentTruckId) return false;
        return truckIds.indexOf(currentTruckId) === currentIndex;
      }),
    );
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
          Asignación
        </p>
        <h3 className="mt-1 text-lg font-semibold text-zinc-950">
          Camiones y cálculo logístico
        </h3>
      </div>

      <div className="mt-5 space-y-4">
        {Array.from({ length: selectorCount }).map((_, index) => {
          const selectedTruckId = selectedTruckIds[index] ?? "";

          return (
            <div key={`truck-selector-${index}`}>
              <label
                className="text-sm font-medium text-zinc-700"
                htmlFor={`truck-selector-${index}`}
              >
                {index === 0
                  ? "Camión disponible"
                  : `Camión adicional ${index + 1}`}
              </label>
              <select
                id={`truck-selector-${index}`}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
                value={selectedTruckId}
                onChange={(event) => updateTruckSelection(index, event.target.value)}
              >
                <option value="">Seleccionar camión</option>
                {trucks.map((truck) => {
                  const assignedToCurrentRequest =
                    request.assignedTruckIds.includes(truck.id) ||
                    truck.id === request.truckId;
                  const selectedInAnotherControl =
                    selectedTruckIds.includes(truck.id) && truck.id !== selectedTruckId;

                  return (
                    <option
                      key={truck.id}
                      value={truck.id}
                      disabled={
                        selectedInAnotherControl ||
                        (truck.status !== "available" && !assignedToCurrentRequest)
                      }
                    >
                      {truck.licensePlate} -{" "}
                      {getTruckEffectiveCapacity(truck, averageCattleWeightKg)} cabezas calc. -{" "}
                      {truckStatusLabels[truck.status]}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <label
          className="text-sm font-medium text-zinc-700"
          htmlFor="departure-at"
        >
          Fecha y hora de salida
        </label>
        <input
          id="departure-at"
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
          type="datetime-local"
          min={minimumDepartureAt}
          required
          value={departureAt}
          onChange={(event) => onDepartureAtChange(event.target.value)}
        />
      </div>
      {selectedTrucks.length > 0 ? (
        <div className="mt-4 space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
              Capacidad seleccionada
            </p>
            <p className="text-sm font-semibold text-zinc-950">
              {selectedTruckCapacity} / {request.cattleCount} cabezas
            </p>
          </div>
          {selectedTrucks.map((truck) => {
            const truckCapacity = getTruckEffectiveCapacity(truck, averageCattleWeightKg);
            const cattleOnTruck = Math.min(Math.max(remainingCattleForPreview, 0), truckCapacity);
            remainingCattleForPreview -= cattleOnTruck;
            const estimatedConsumption = getEstimatedFuelConsumptionPerKm(
              truck,
              averageCattleWeightKg,
              cattleOnTruck,
            );

            return (
              <div
                key={truck.id}
                className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-2 first:border-t-0 first:pt-0"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    {truck.licensePlate}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {truckCapacity} cabezas calc., {truck.maxWeightTons} tn,{" "}
                    {formatNumber(estimatedConsumption, 3)} l/km estimado
                  </p>
                </div>
                <TruckStatusBadge status={truck.status} />
              </div>
            );
          })}
        </div>
      ) : null}

      {warning ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Capacidad excedida</p>
          <p className="mt-1">
            La solicitud excede la capacidad técnica por {warning.excessCattle} cabezas.
            Se requieren al menos {warning.tripsNeeded} viajes con los camiones seleccionados.
          </p>
          <p className="mt-2">
            Puedes agregar otro camión disponible o confirmar múltiples viajes
            con la selección actual.
          </p>
        </div>
      ) : null}

      {assignment ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[0.75fr_1.7fr_0.65fr]">
          <Metric
            align="center"
            label="Distancia"
            value={`${formatNumber(assignment.metrics.distanceKm, 1)} km`}
          />
          <Metric
            label="Combustible"
            value={
              assignment.metrics.fuelPrice.currency === "PYG"
                ? formatGuaraniCost(assignment.metrics.fuelCost)
                : formatCurrency(
                    assignment.metrics.fuelCost,
                    assignment.metrics.fuelPrice.currency,
                  )
            }
            helper={formatFuelPrice(assignment)}
          />
          <Metric
            align="center"
            label="Viajes"
            value={formatNumber(assignment.metrics.tripsNeeded, 0)}
          />
          <Metric
            label="Salida"
            wrapValue
            className="md:col-span-3"
            value={
              assignment.request.departureAt
                ? formatDateTime(assignment.request.departureAt)
                : "Sin programar"
            }
          />
          <Metric
            label="Llegada estimada"
            wrapValue
            className="md:col-span-3"
            value={
              assignment.request.estimatedArrivalAt
                ? formatDateTime(assignment.request.estimatedArrivalAt)
                : "Sin calcular"
            }
          />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {assignment ? (
          <button
            className="min-h-11 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 sm:col-span-2"
            type="button"
            onClick={onClearPreview}
          >
            Desasignar Camión
          </button>
        ) : (
          <button
            className="min-h-11 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold leading-snug text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:col-span-2"
            type="button"
            disabled={!canAssign}
            onClick={() => onAssign(false, false)}
          >
            {assigning ? "Calculando..." : "Calcular Viaje"}
          </button>
        )}
        {assignment ? (
          <button
            className="min-h-11 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 sm:col-span-2"
            type="button"
            disabled={assigning}
            onClick={() => onAssign(Boolean(warning), true)}
          >
            {assigning ? "Confirmando..." : "Confirmar Asignación"}
          </button>
        ) : null}
        {request.assignedTruckIds.length > 0 ? (
          <button
            className="min-h-11 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold leading-snug text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={!canUnassign}
            onClick={onUnassign}
          >
            {unassigning ? "Desasignando..." : "Desasignar Camión"}
          </button>
        ) : null}
        {warning ? (
          <button
            className="min-h-11 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold leading-snug text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            type="button"
            disabled={!canConfirmMultipleTrips}
            onClick={() => onAssign(true, false)}
          >
            Calcular Múltiples Viajes
          </button>
        ) : null}
        <button
          className="min-h-11 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 sm:col-span-2"
          type="button"
          onClick={onDelete}
        >
          Eliminar Solicitud
        </button>
      </div>
    </section>
  );
}

function NavigationSidebar({
  collapsed,
  currentView,
  counts,
  onHome,
  onToggle,
  onViewChange,
}: {
  collapsed: boolean;
  currentView: DashboardView;
  counts: Record<Exclude<DashboardView, "create">, number>;
  onHome: () => void;
  onToggle: () => void;
  onViewChange: (view: DashboardView) => void;
}) {
  const items: Array<{
    view: DashboardView;
    label: string;
    icon: typeof TruckIcon;
    count?: number;
  }> = [
    { view: "create", label: "Nueva solicitud", icon: ClipboardPlus },
    { view: "pending", label: "Pendientes", icon: TruckIcon, count: counts.pending },
    { view: "assigned", label: "Asignadas", icon: ClipboardCheck, count: counts.assigned },
    { view: "confirmed", label: "Confirmadas", icon: BadgeCheck, count: counts.confirmed },
    { view: "completed", label: "Completadas", icon: CheckCheck, count: counts.completed },
    { view: "cancelled", label: "Anuladas", icon: X, count: counts.cancelled },
  ];

  return (
    <nav
      className={`sticky top-0 z-20 flex shrink-0 flex-col border-b border-zinc-200 bg-white transition-[width] lg:h-screen lg:border-b-0 lg:border-r ${
        collapsed ? "lg:w-[72px]" : "lg:w-60"
      }`}
    >
      <div className="flex h-16 items-center justify-center border-b border-zinc-200 lg:h-[105px]">
        <button
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          title={collapsed ? "Expandir menú" : "Contraer menú"}
          type="button"
          onClick={onToggle}
        >
          {collapsed ? <Menu size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-2 lg:overflow-visible">
        <button
          className={`flex h-12 shrink-0 items-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 ${
            collapsed ? "justify-center px-3 lg:px-0" : "gap-3 px-3"
          }`}
          title={collapsed ? "Inicio" : undefined}
          type="button"
          onClick={onHome}
        >
          <Home className="shrink-0" size={19} />
          {!collapsed ? (
            <span className="min-w-0 flex-1 text-left text-sm font-semibold">
              Inicio
            </span>
          ) : null}
        </button>
        {items.map(({ view, label, icon: Icon, count }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              className={`flex h-12 shrink-0 items-center rounded-md transition lg:w-full ${
                collapsed ? "justify-center px-3 lg:px-0" : "gap-3 px-3"
              } ${
                active
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
              title={collapsed ? label : undefined}
              type="button"
              onClick={() => onViewChange(view)}
            >
              <Icon className="shrink-0" size={19} />
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 text-left text-sm font-semibold">
                    {label}
                  </span>
                  {count !== undefined ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function NewRequestView({
  clients,
  selectedClientId,
  departureAt,
  busy,
  error,
  onClientChange,
  onDepartureAtChange,
  onCreateClient,
  onSubmit,
}: {
  clients: Client[];
  selectedClientId: string;
  departureAt: string;
  busy: boolean;
  error: string | null;
  onClientChange: (clientId: string) => void;
  onDepartureAtChange: (value: string) => void;
  onCreateClient: () => void;
  onSubmit: (input: {
    cattleCount: number;
    cattleWeightMinKg: number;
    cattleWeightMaxKg: number;
    origin: RouteLocation;
    destination: RouteLocation;
    notes: string;
  }) => void;
}) {
  const [origin, setOrigin] = useState<RouteLocation | null>(null);
  const [destination, setDestination] = useState<RouteLocation | null>(null);
  const [pickingStage, setPickingStage] = useState<"origin" | "destination" | "ready">("origin");
  const [cattleCount, setCattleCount] = useState("1");
  const [cattleWeightMinKg, setCattleWeightMinKg] = useState("400");
  const [cattleWeightMaxKg, setCattleWeightMaxKg] = useState("500");
  const [notes, setNotes] = useState("");
  const parsedCattleCount = Number(cattleCount);
  const parsedCattleWeightMinKg = Number(cattleWeightMinKg);
  const parsedCattleWeightMaxKg = Number(cattleWeightMaxKg);
  const routeIsValid = Boolean(
    origin &&
      destination &&
      (origin.lat !== destination.lat || origin.lng !== destination.lng),
  );

  function handleMapPick(location: RouteLocation) {
    if (pickingStage === "origin") setOrigin(location);
    if (pickingStage === "destination") setDestination(location);
  }

  return (
    <section className="mx-auto max-w-[1180px] p-5">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase text-zinc-500">Solicitudes</p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
          Crear nueva solicitud logística
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Registra el cliente, recorrido y programación inicial. La solicitud ingresará
          automáticamente a la bandeja de pendientes.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <section className="rounded-md border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Cliente</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-950">
                  Solicitante
                </h3>
              </div>
              <button
                aria-label="Crear cliente"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                title="Crear cliente"
                type="button"
                onClick={onCreateClient}
              >
                <Plus size={17} />
              </button>
            </div>
            <label className="mt-5 block text-sm font-semibold text-zinc-700">
              Cliente registrado
              <select
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                value={selectedClientId}
                onChange={(event) => onClientChange(event.target.value)}
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName || client.businessName}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold text-zinc-700">
              Cabezas de ganado
              <input
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                min={1}
                type="number"
                value={cattleCount}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setCattleCount(event.target.value.replace(/^0+(?=\d)/, ""))}
              />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-zinc-700">
                Peso mínimo kg/cabeza
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  min={1}
                  type="number"
                  value={cattleWeightMinKg}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setCattleWeightMinKg(event.target.value.replace(/^0+(?=\d)/, ""))}
                />
              </label>
              <label className="block text-sm font-semibold text-zinc-700">
                Peso máximo kg/cabeza
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  min={1}
                  type="number"
                  value={cattleWeightMaxKg}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setCattleWeightMaxKg(event.target.value.replace(/^0+(?=\d)/, ""))}
                />
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold text-zinc-700">
              Fecha y hora de salida
              <input
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                min={toDateTimeInputValue(new Date())}
                type="datetime-local"
                value={departureAt}
                onChange={(event) => onDepartureAtChange(event.target.value)}
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-zinc-700">
              Observaciones
              <textarea
                className="mt-2 min-h-24 w-full resize-y rounded-md border border-zinc-300 bg-white p-3 text-sm"
                placeholder="Indicaciones opcionales para la operación"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </section>
        </div>

        <section className="rounded-md border border-zinc-200 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">Ruta</p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-950">
              Recorrido solicitado
            </h3>
          </div>
          <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-950">
              {pickingStage === "origin"
                ? "Paso 1: selecciona el punto de origen"
                : pickingStage === "destination"
                  ? "Paso 2: selecciona el punto de destino"
                  : "Paso 3: confirma la solicitud"}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {pickingStage === "origin"
                ? "Haz clic sobre el mapa en el lugar donde debe iniciar el traslado."
                : pickingStage === "destination"
                  ? "Haz clic sobre el mapa en el lugar de entrega. Puedes volver a editar el origen si necesitas corregirlo."
                  : "Revisa el origen, destino, cliente, salida y cabezas de ganado antes de crear la solicitud."}
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-zinc-200 p-3">
              <p className="text-xs font-semibold uppercase text-zinc-500">Origen</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-950">
                {origin?.name ?? "Pendiente"}
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 p-3">
              <p className="text-xs font-semibold uppercase text-zinc-500">Destino</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-950">
                {destination?.name ?? "Pendiente"}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <LocationPickerMapClient origin={origin} destination={destination} onPick={handleMapPick} />
          </div>
          {pickingStage !== "origin" ? (
            <button
              className="mt-4 min-h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              type="button"
              onClick={() => {
                setPickingStage("origin");
                setDestination(null);
              }}
            >
              Modificar Punto de Origen
            </button>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <button
            className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !selectedClientId || (pickingStage === "origin" ? !origin : pickingStage === "destination" ? !destination || !routeIsValid : !routeIsValid || parsedCattleCount < 1 || parsedCattleWeightMinKg < 1 || parsedCattleWeightMaxKg < parsedCattleWeightMinKg)}
            type="button"
            onClick={() => {
              if (pickingStage === "origin") return setPickingStage("destination");
              if (pickingStage === "destination") return setPickingStage("ready");
              if (origin && destination) onSubmit({
                cattleCount: parsedCattleCount,
                cattleWeightMinKg: parsedCattleWeightMinKg,
                cattleWeightMaxKg: parsedCattleWeightMaxKg,
                origin,
                destination,
                notes,
              });
            }}
          >
            <ClipboardPlus size={18} />
            {busy ? "Creando solicitud..." : pickingStage === "origin" ? "Confirmar Punto de Origen" : pickingStage === "destination" ? "Confirmar Destino" : "Crear Solicitud"}
          </button>
        </section>
      </div>
    </section>
  );
}

function ExternalRequestCompletionPanel({
  request,
  client,
  busy,
  onSave,
}: {
  request: TransportRequest;
  client: Client | null;
  busy: boolean;
  onSave: (input: {
    cattleCount: number;
    cattleWeightMinKg: number;
    cattleWeightMaxKg: number;
    origin: RouteLocation;
    destination: RouteLocation;
    departureAt: string;
  }) => void;
}) {
  const [origin, setOrigin] = useState<RouteLocation | null>(
    request.routePending ? null : {
      name: request.originName,
      lat: request.originLat,
      lng: request.originLng,
    },
  );
  const [destination, setDestination] = useState<RouteLocation | null>(
    request.routePending ? null : {
      name: request.destinationName,
      lat: request.destinationLat,
      lng: request.destinationLng,
    },
  );
  const [pickingStage, setPickingStage] = useState<"origin" | "destination" | "ready">("origin");
  const [cattleCount, setCattleCount] = useState(String(request.cattleCount || 1));
  const [cattleWeightMinKg, setCattleWeightMinKg] = useState(String(request.cattleWeightMinKg || 400));
  const [cattleWeightMaxKg, setCattleWeightMaxKg] = useState(String(request.cattleWeightMaxKg || 500));
  const [departureAt, setDepartureAt] = useState(getInitialDepartureAt(request));
  const inquiryUrl = buildExternalInquiryUrl(client, request);
  const parsedCattleCount = Number(cattleCount);
  const parsedCattleWeightMinKg = Number(cattleWeightMinKg);
  const parsedCattleWeightMaxKg = Number(cattleWeightMaxKg);
  const routeIsValid = Boolean(
    origin &&
      destination &&
      (origin.lat !== destination.lat || origin.lng !== destination.lng),
  );

  function handleMapPick(location: RouteLocation) {
    if (pickingStage === "origin") setOrigin(location);
    if (pickingStage === "destination") setDestination(location);
  }

  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-amber-800">Solicitud externa</p>
          <h3 className="mt-1 text-lg font-semibold text-amber-900">Completar datos logísticos</h3>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Contacta al cliente y carga punto de origen, destino, fecha, hora y cantidad real de cabezas.
          </p>
        </div>
        {inquiryUrl ? (
          <a className="flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800" href={inquiryUrl} rel="noopener noreferrer" target="_blank">
            <MessageCircle size={17} />
            Consultar por WhatsApp
          </a>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-amber-900">
          Cabezas de ganado
          <input className="mt-2 h-11 w-full rounded-md border border-amber-300 bg-white px-3 text-sm" min={1} type="number" value={cattleCount} onChange={(event) => setCattleCount(event.target.value.replace(/^0+(?=\d)/, ""))} />
        </label>
        <label className="text-sm font-semibold text-amber-900">
          Fecha y hora de salida
          <input className="mt-2 h-11 w-full rounded-md border border-amber-300 bg-white px-3 text-sm" min={toDateTimeInputValue(new Date())} type="datetime-local" value={departureAt} onChange={(event) => setDepartureAt(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-amber-900">
          Peso mínimo kg/cabeza
          <input className="mt-2 h-11 w-full rounded-md border border-amber-300 bg-white px-3 text-sm" min={1} type="number" value={cattleWeightMinKg} onChange={(event) => setCattleWeightMinKg(event.target.value.replace(/^0+(?=\d)/, ""))} />
        </label>
        <label className="text-sm font-semibold text-amber-900">
          Peso máximo kg/cabeza
          <input className="mt-2 h-11 w-full rounded-md border border-amber-300 bg-white px-3 text-sm" min={1} type="number" value={cattleWeightMaxKg} onChange={(event) => setCattleWeightMaxKg(event.target.value.replace(/^0+(?=\d)/, ""))} />
        </label>
      </div>

      <div className="mt-4 rounded-md border border-amber-200 bg-white p-3 text-sm text-amber-900">
        {pickingStage === "origin"
          ? "Selecciona el punto de origen en el mapa."
          : pickingStage === "destination"
            ? "Selecciona el punto de destino en el mapa."
            : "Revisa la ruta y guarda los datos para habilitar el cálculo."}
      </div>

      <div className="mt-4">
        <LocationPickerMapClient origin={origin} destination={destination} onPick={handleMapPick} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {pickingStage !== "origin" ? (
          <button className="min-h-10 rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900" type="button" onClick={() => { setPickingStage("origin"); setDestination(null); }}>
            Modificar Origen
          </button>
        ) : null}
        <button
          className="min-h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
          disabled={
            busy ||
            (pickingStage === "origin"
              ? !origin
              : pickingStage === "destination"
                ? !destination || !routeIsValid
                : !routeIsValid || parsedCattleCount < 1 || parsedCattleWeightMinKg < 1 || parsedCattleWeightMaxKg < parsedCattleWeightMinKg || !departureAt)
          }
          type="button"
          onClick={() => {
            if (pickingStage === "origin") return setPickingStage("destination");
            if (pickingStage === "destination") return setPickingStage("ready");
            if (origin && destination) onSave({
              cattleCount: parsedCattleCount,
              cattleWeightMinKg: parsedCattleWeightMinKg,
              cattleWeightMaxKg: parsedCattleWeightMaxKg,
              origin,
              destination,
              departureAt,
            });
          }}
        >
          {pickingStage === "origin" ? "Confirmar Origen" : pickingStage === "destination" ? "Confirmar Destino" : busy ? "Guardando..." : "Guardar Datos Logísticos"}
        </button>
      </div>
    </section>
  );
}

function ConfirmLogisticsPanel({
  request,
  client,
  busy,
  onConfirm,
  onCancel,
  onDelete,
}: {
  request: TransportRequest;
  client: Client | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const whatsappUrl = buildWhatsAppUrl(client, request);

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase text-zinc-500">Presupuesto</p>
      <h3 className="mt-1 text-lg font-semibold text-zinc-950">
        Confirmación logística
      </h3>
      <div className="mt-5 space-y-3">
        <Metric label="Costo estimado" value={request.fuelCost ? formatGuaraniCost(request.fuelCost) : "Pendiente"} />
        <Metric label="Camiones asignados" value={formatNumber(request.assignedTruckIds.length, 0)} />
        <Metric label="Viajes estimados" value={formatNumber(request.tripsNeeded ?? 1, 0)} />
      </div>
      <button
        className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        disabled={busy}
        type="button"
        onClick={onConfirm}
      >
        <BadgeCheck size={18} />
        {busy ? "Confirmando..." : "Confirmar Logística"}
      </button>
      <div className="mt-3 grid gap-2">
        <a
          className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold ${
            whatsappUrl
              ? "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
              : "pointer-events-none border-zinc-200 bg-zinc-100 text-zinc-400"
          }`}
          href={whatsappUrl ?? undefined}
          rel="noopener noreferrer"
          target="_blank"
          title={
            whatsappUrl
              ? "Enviar presupuesto por WhatsApp"
              : "El cliente no tiene teléfono válido para WhatsApp"
          }
        >
          <MessageCircle size={18} />
          Enviar Presupuesto por WhatsApp
        </a>
        <button
          className="min-h-11 rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 hover:bg-amber-50"
          type="button"
          onClick={onCancel}
        >
          Cancelar Logística
        </button>
        <button
          className="min-h-11 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
          type="button"
          onClick={onDelete}
        >
          Eliminar Solicitud
        </button>
      </div>
    </section>
  );
}

function HistoricalFilters({
  title,
  company,
  document,
  phone,
  date,
  period,
  showPeriod,
  onCompanyChange,
  onDocumentChange,
  onPhoneChange,
  onDateChange,
  onPeriodChange,
}: {
  title: string;
  company: string;
  document: string;
  phone: string;
  date: string;
  period: string;
  showPeriod: boolean;
  onCompanyChange: (value: string) => void;
  onDocumentChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
}) {
  return (
    <div className="border-b border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{title}</p>
      <div className={`mt-3 grid gap-3 ${showPeriod ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
        <input className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" placeholder="Nombre de empresa" value={company} onChange={(event) => onCompanyChange(event.target.value)} />
        <input className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" placeholder="RUC o CI" value={document} onChange={(event) => onDocumentChange(event.target.value)} />
        <input className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" placeholder="Número de teléfono" value={phone} onChange={(event) => onPhoneChange(event.target.value)} />
        <input className="history-date-input h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-500" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        {showPeriod ? (
          <input className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" placeholder="Periodo 06-2026" value={period} onChange={(event) => onPeriodChange(event.target.value)} />
        ) : null}
      </div>
    </div>
  );
}

function ConfirmationModal({
  action,
  busy,
  onClose,
  onConfirm,
}: {
  action: Exclude<ConfirmationAction, null>;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const content = {
    confirm: ["Confirmar logística", "¿Confirmas que el cliente aceptó el presupuesto y deseas reservar definitivamente los camiones?", "Confirmar Logística"],
    complete: ["Completar viaje", "¿Confirmas que este viaje finalizó correctamente? El registro pasará al histórico, los camiones serán liberados y la acción no se podrá revertir.", "Completar Viaje"],
    cancel: ["Cancelar logística", "¿Deseas cancelar esta asignación y devolver la solicitud a Pendientes? Los camiones serán liberados.", "Cancelar Logística"],
    delete: ["Eliminar solicitud", "¿Deseas eliminar definitivamente esta solicitud? Esta acción no se puede revertir.", "Eliminar Solicitud"],
    void: ["Anular viaje", "¿Estás seguro de anular este viaje confirmado? El cambio no se podrá revertir y los camiones serán liberados.", "Anular Viaje"],
  }[action];
  const destructive = action === "delete" || action === "void";

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/55 p-4">
      <section className="w-full max-w-md rounded-md border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-zinc-950">{content[0]}</h3>
          <button aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-zinc-100" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="px-5 py-5 text-sm leading-6 text-zinc-600">{content[1]}</p>
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <button className="min-h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700" disabled={busy} type="button" onClick={onClose}>Volver</button>
          <button className={`min-h-10 rounded-md px-4 text-sm font-semibold text-white ${destructive ? "bg-red-700" : action === "cancel" ? "bg-amber-700" : "bg-emerald-700"}`} disabled={busy} type="button" onClick={onConfirm}>{busy ? "Procesando..." : content[2]}</button>
        </div>
      </section>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white px-5 py-5 text-sm text-zinc-600">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-2"><Mail size={16} /> soporte@bovitrans.com.py</span>
          <span className="flex items-center gap-2"><MapPin size={16} /> Asunción, Paraguay</span>
        </div>
        <p className="flex items-center gap-2 font-semibold text-zinc-700">
          <Copyright size={16} /> 2026 BOVITRANS - Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

function ManualButton() {
  return (
    <a
      aria-label="Abrir manual de uso"
      className="fixed bottom-5 right-5 z-[900] flex h-12 w-12 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-zinc-50"
      href="/manual-bovitrans.pdf"
      rel="noopener noreferrer"
      target="_blank"
      title="Manual de uso"
    >
      <Info size={22} />
    </a>
  );
}

function UserMenu({
  user,
  onLogout,
}: {
  user: AppUser;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
      <User size={17} />
      <span className="hidden max-w-[180px] truncate font-semibold sm:inline">
        {user.fullName || user.username}
      </span>
      <button
        aria-label="Cerrar sesión"
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-100"
        title="Cerrar sesión"
        type="button"
        onClick={onLogout}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}

function LoginScreen({
  onLogin,
}: {
  onLogin: (user: AppUser) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login({ identifier, password });
      onLogin(user);
    } catch {
      setError("Inserta las credenciales válidas de tu cuenta para ingresar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950">
      <section className="flex flex-1 items-center justify-center p-6">
        <form className="w-full max-w-xl rounded-md border border-zinc-200 bg-white p-8 shadow-sm" onSubmit={handleSubmit}>
          <Link
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
            href="/solicitar-presupuesto"
          >
            <ChevronLeft size={17} />
            Atrás
          </Link>
          <div className="flex flex-col items-center text-center">
            <Image alt="BoviTrans" className="h-32 w-32 object-contain" height={160} priority src="/bovitrans-logo-transparent.png" width={160} />
            <h1 className="mt-4 text-2xl font-semibold text-zinc-950">BOVITRANS</h1>
            <p className="mt-1 text-sm font-semibold text-zinc-600">Acceso interno</p>
          </div>
          <label className="mt-6 block text-sm font-semibold text-zinc-700">
            Correo/Usuario
            <input className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </label>
          <label className="mt-4 block text-sm font-semibold text-zinc-700">
            Contraseña
            <input className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <button className="mt-5 min-h-11 w-full rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} type="submit">
            {busy ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </section>
      <AppFooter />
    </main>
  );
}

function HomePortal({
  darkTheme,
  user,
  onOpenModule,
  onLogout,
  onToggleTheme,
}: {
  darkTheme: boolean;
  user: AppUser;
  onOpenModule: (module: AppModule) => void;
  onLogout: () => void;
  onToggleTheme: () => void;
}) {
  const hasAccess = (module: AppModulePermission) =>
    user.superuser || user.permissions.includes(module);

  return (
    <main className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950">
      <div className="flex justify-end gap-3 px-6 pt-6">
        <UserMenu user={user} onLogout={onLogout} />
        <button
          aria-label={darkTheme ? "Activar tema claro" : "Activar tema oscuro"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
          title={darkTheme ? "Activar tema claro" : "Activar tema oscuro"}
          type="button"
          onClick={onToggleTheme}
        >
          {darkTheme ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </div>
      <section className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          <div className="flex flex-col items-center text-center">
            <Image
              alt="BoviTrans"
              className="bovitrans-logo-dark h-52 w-52 object-contain sm:h-60 sm:w-60"
              height={240}
              priority
              src="/bovitrans-logo-transparent.png"
              width={240}
            />
            <h1 className="mt-5 text-3xl font-semibold text-zinc-950">BOVITRANS</h1>
            <p className="mt-3 max-w-2xl text-lg font-semibold leading-7 text-zinc-600 sm:text-xl">
              Gestión de Transporte Ganadero
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {hasAccess("logistics") ? (
            <button
              className="flex min-h-[230px] w-full flex-col items-center rounded-md border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
              type="button"
              onClick={() => onOpenModule("logistics")}
            >
              <div className="home-module-icon mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-zinc-950 text-white">
                <TruckIcon size={24} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-zinc-950">Panel Logístico</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Crear solicitudes, calcular viajes, asignar camiones y dar seguimiento a estados operativos.
              </p>
            </button>
            ) : null}

            {hasAccess("fleet") ? (
            <button
              className="flex min-h-[230px] w-full flex-col items-center rounded-md border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
              type="button"
              onClick={() => onOpenModule("fleet")}
            >
              <div className="home-module-icon mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-zinc-950 text-white">
                <ClipboardCheck size={24} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-zinc-950">Administración de Flotas</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Registrar camiones, controlar disponibilidad, capacidad máxima y consumo de combustible.
              </p>
            </button>
            ) : null}

            {hasAccess("users") ? (
            <button
              className="flex min-h-[230px] w-full flex-col items-center rounded-md border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
              type="button"
              onClick={() => onOpenModule("users")}
            >
              <div className="home-module-icon mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-zinc-950 text-white">
                <Users size={24} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-zinc-950">Usuarios</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Gestionar accesos internos, usuarios activos y permisos por módulo.
              </p>
            </button>
            ) : null}
          </div>
        </div>
      </section>
      <AppFooter />
      <ManualButton />
    </main>
  );
}

export function BoviTransDashboard() {
  const [darkTheme, setDarkTheme] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeModule, setActiveModule] = useState<AppModule>("home");
  const [currentView, setCurrentView] = useState<DashboardView>("pending");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [selectedFuelPriceId, setSelectedFuelPriceId] = useState("");
  const [refreshingFuelPrices, setRefreshingFuelPrices] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedTruckIds, setSelectedTruckIds] = useState<string[]>([]);
  const [departureAt, setDepartureAt] = useState(() =>
    getInitialDepartureAt(null),
  );
  const [assignment, setAssignment] = useState<AssignmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [savingRouteDetails, setSavingRouteDetails] = useState(false);
  const [confirmingLogistics, setConfirmingLogistics] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction>(null);
  const [historyCompanySearch, setHistoryCompanySearch] = useState("");
  const [historyDocumentSearch, setHistoryDocumentSearch] = useState("");
  const [historyPhoneSearch, setHistoryPhoneSearch] = useState("");
  const [historyDateSearch, setHistoryDateSearch] = useState("");
  const [historyPeriodSearch, setHistoryPeriodSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientFormMode, setClientFormMode] = useState<
    "create" | "edit" | "delete" | null
  >(null);
  const [clientBusy, setClientBusy] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);

  useEffect(() => {
    setDarkTheme(document.documentElement.classList.contains("dark"));
    const storedUser = window.localStorage.getItem("bovitrans-user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser) as AppUser);
      } catch {
        window.localStorage.removeItem("bovitrans-user");
      }
    }
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (currentUser) {
      document.documentElement.classList.toggle("dark", darkTheme);
    }
  }, [currentUser, darkTheme]);

  function toggleTheme() {
    const nextDarkTheme = !darkTheme;
    document.documentElement.classList.toggle("dark", nextDarkTheme);
    localStorage.setItem("bovitrans-theme", nextDarkTheme ? "dark" : "light");
    setDarkTheme(nextDarkTheme);
  }

  function handleLogin(user: AppUser) {
    setCurrentUser(user);
    window.localStorage.setItem("bovitrans-user", JSON.stringify(user));
    setActiveModule("home");
  }

  function handleLogout() {
    setCurrentUser(null);
    setActiveModule("home");
    setSelectedRequestId(null);
    window.localStorage.removeItem("bovitrans-user");
  }

  function hasModuleAccess(module: AppModulePermission) {
    return Boolean(currentUser?.superuser || currentUser?.permissions.includes(module));
  }

  function openModule(module: AppModule) {
    if (module !== "home" && !hasModuleAccess(module)) return;
    setActiveModule(module);
  }

  async function loadDashboard() {
    setError(null);
    const [
      nextRequests,
      nextTrucks,
      nextFuelPrices,
      nextClients,
      nextDocumentTypes,
      nextCities,
    ] =
      await Promise.all([
        fetchTransportRequests(),
        fetchTrucks(),
        fetchFuelPrices(8),
        fetchClients(),
        fetchDocumentTypes(),
        fetchCities(),
      ]);

    const sortedRequests = nextRequests.sort(
      (current, next) =>
        getRequestScore(next) - getRequestScore(current) ||
        Date.parse(next.createdAt) - Date.parse(current.createdAt),
    );

    setRequests(sortedRequests);
    setTrucks(nextTrucks);
    setFuelPrices(nextFuelPrices);
    setSelectedFuelPriceId((current) => current || nextFuelPrices[0]?.id || "");
    setClients(nextClients);
    setAllClients(nextClients);
    setDocumentTypes(nextDocumentTypes);
    setCities(nextCities);
    setSelectedRequestId((current) => current ?? sortedRequests[0]?.id ?? null);
  }

  useEffect(() => {
    // Initial API hydration for the operational dashboard.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard()
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el dashboard.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchClients(clientSearch)
        .then(setClients)
        .catch(() => setClientError("No se pudieron buscar los clientes."));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [clientSearch]);

  const visibleRequests = useMemo(
    () => {
      if (currentView === "create") return [];
      const statusRequests = requests.filter((request) => request.status === currentView);
      if (currentView !== "confirmed" && currentView !== "completed" && currentView !== "cancelled") return statusRequests;

      const normalize = (value: string) => value.trim().toLocaleLowerCase("es");
      const company = normalize(historyCompanySearch);
      const document = normalize(historyDocumentSearch);
      const phone = normalize(historyPhoneSearch);
      const date = historyDateSearch;
      const period =
        currentView === "completed" || currentView === "cancelled"
          ? normalize(historyPeriodSearch)
          : "";
      return statusRequests.filter((request) => {
        const client = allClients.find((item) => item.id === request.clientId);
        const departure = request.departureAt ? new Date(request.departureAt) : null;
        const requestDate = departure ? departure.toISOString().slice(0, 10) : "";
        const requestPeriod = departure
          ? `${String(departure.getMonth() + 1).padStart(2, "0")}-${departure.getFullYear()}`
          : "";

        return (
          (!company || normalize(client?.companyName || request.clientCompanyName || request.clientName).includes(company)) &&
          (!document || normalize(client?.documentNumber || "").includes(document)) &&
          (!phone || normalize(client?.phoneNumber || "").includes(phone)) &&
          (!date || requestDate === date) &&
          (!period || normalize(requestPeriod).includes(period))
        );
      });
    },
    [allClients, currentView, historyCompanySearch, historyDateSearch, historyDocumentSearch, historyPeriodSearch, historyPhoneSearch, requests],
  );

  const selectedRequest = useMemo(
    () =>
      visibleRequests.find((request) => request.id === selectedRequestId) ??
      visibleRequests[0] ??
      null,
    [selectedRequestId, visibleRequests],
  );

  const selectedRequestClient = useMemo(
    () =>
      selectedRequest?.clientId
        ? allClients.find((client) => client.id === selectedRequest.clientId) ?? null
        : null,
    [allClients, selectedRequest?.clientId],
  );

  useEffect(() => {
    if (selectedRequest?.assignedTruckIds.length) {
      setSelectedTruckIds(selectedRequest.assignedTruckIds);
    }
    setSelectedClientId(selectedRequest?.clientId ?? "");
    if (selectedRequest?.fuelPriceId) {
      setSelectedFuelPriceId(selectedRequest.fuelPriceId);
    }
    setClientError(null);
    setDepartureAt(getInitialDepartureAt(selectedRequest));
  }, [selectedRequest?.id]);

  const selectedTrucks = useMemo(
    () => getSelectedTrucks(trucks, selectedTruckIds),
    [selectedTruckIds, trucks],
  );

  const capacityWarning = useMemo(
    () => getCapacityWarning(selectedRequest, selectedTrucks),
    [selectedRequest, selectedTrucks],
  );

  function handleRequestSelect(requestId: string) {
    const request = requests.find((item) => item.id === requestId);

    setSelectedRequestId(requestId);
    setSelectedTruckIds(request?.assignedTruckIds ?? []);
    setSelectedClientId(request?.clientId ?? "");
    setDepartureAt(getInitialDepartureAt(request ?? null));
    setAssignment(null);
    setError(null);
  }

  function handleViewChange(view: DashboardView) {
    setCurrentView(view);
    setSelectedRequestId(null);
    setSelectedTruckIds([]);
    setAssignment(null);
    setError(null);
  }

  async function handleCreateClient() {
    setClientBusy(true);
    setClientError(null);

    try {
      const client = await createClient({
        ...clientForm,
        phoneNumber: formatPhoneForStorage(
          clientForm.phoneCountryCode,
          clientForm.phoneNumber,
        ),
      });
      setClients(await fetchClients(clientSearch));
      setSelectedClientId(client.id);
      setClientFormMode(null);
      setClientForm(emptyClientForm);
    } catch (clientOperationError) {
      setClientError(
        clientOperationError instanceof Error
          ? clientOperationError.message
          : "No se pudo crear el cliente.",
      );
    } finally {
      setClientBusy(false);
    }
  }

  async function handleUpdateClient() {
    if (!selectedClientId) return;

    setClientBusy(true);
    setClientError(null);

    try {
      await updateClient(selectedClientId, {
        ...clientForm,
        phoneNumber: formatPhoneForStorage(
          clientForm.phoneCountryCode,
          clientForm.phoneNumber,
        ),
      });
      setClients(await fetchClients(clientSearch));
      setClientFormMode(null);
      await loadDashboard();
    } catch (clientOperationError) {
      setClientError(
        clientOperationError instanceof Error
          ? clientOperationError.message
          : "No se pudo actualizar el cliente.",
      );
    } finally {
      setClientBusy(false);
    }
  }

  function handleClientFormModeChange(
    mode: "create" | "edit" | "delete" | null,
  ) {
    setClientError(null);
    setClientFormMode(mode);

    if (mode === "edit") {
      const client = clients.find((item) => item.id === selectedClientId);
      if (!client) return;
      setClientForm({
        companyName: client.companyName,
        businessName: client.businessName,
        documentNumber: client.documentNumber,
        documentTypeId: client.documentTypeId,
        ...splitPhoneNumber(client.phoneNumber),
        cityId: client.cityId,
        email: client.email ?? "",
      });
      return;
    }

    setClientForm(emptyClientForm);
  }

  async function handleSelectClient() {
    if (!selectedRequest || !selectedClientId) return;

    setClientBusy(true);
    setClientError(null);

    try {
      const request = await selectRequestClient(selectedRequest.id, selectedClientId);
      await loadDashboard();
      setSelectedRequestId(request.id);
    } catch (clientOperationError) {
      setClientError(
        clientOperationError instanceof Error
          ? clientOperationError.message
          : "No se pudo seleccionar el cliente.",
      );
    } finally {
      setClientBusy(false);
    }
  }

  async function handleDeleteClient() {
    if (!selectedClientId) return;

    setClientBusy(true);
    setClientError(null);

    try {
      await deleteClient(selectedClientId);
      setSelectedClientId("");
      setClients(await fetchClients(clientSearch));
      setClientFormMode(null);
    } catch (clientOperationError) {
      setClientError(
        clientOperationError instanceof Error
          ? clientOperationError.message
          : "No se pudo eliminar el cliente.",
      );
    } finally {
      setClientBusy(false);
    }
  }

  async function handleAssign(
    confirmCapacityOverflow: boolean,
    confirmAssignment: boolean,
  ) {
    if (!selectedRequest || selectedTruckIds.length === 0 || !selectedFuelPriceId) {
      return;
    }

    setAssigning(true);
    setError(null);

    try {
      const nextAssignment = await assignTruck({
        requestId: selectedRequest.id,
        truckId: selectedTruckIds[0],
        truckIds: selectedTruckIds,
        departureAt: departureAt ? new Date(departureAt).toISOString() : null,
        confirmCapacityOverflow,
        fuelPriceId: selectedFuelPriceId,
        confirmAssignment,
      });

      setAssignment(nextAssignment);
      if (confirmAssignment) {
        await loadDashboard();
        setSelectedRequestId(null);
      }
    } catch (assignError: unknown) {
      if (assignError instanceof ClientApiError) {
        setError(assignError.message);
        return;
      }

      setError("No se pudo asignar el camión.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRefreshFuelPrices() {
    setRefreshingFuelPrices(true);
    setError(null);
    try {
      await refreshFuelPrices();
      const nextPrices = await fetchFuelPrices(30);
      setFuelPrices(nextPrices);
      setSelectedFuelPriceId((current) =>
        nextPrices.some((price) => price.id === current)
          ? current
          : nextPrices[0]?.id ?? "",
      );
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "No se pudieron actualizar los precios.",
      );
    } finally {
      setRefreshingFuelPrices(false);
    }
  }

  async function handleUnassign() {
    if (!selectedRequest?.truckId) {
      return;
    }

    setUnassigning(true);
    setError(null);

    try {
      const nextRequest = await unassignTruck(selectedRequest.id);

      setAssignment(null);
      await loadDashboard();
      setSelectedRequestId(nextRequest.id);
      setSelectedTruckIds([]);
    } catch (unassignError: unknown) {
      if (unassignError instanceof ClientApiError) {
        setError(unassignError.message);
        return;
      }

      setError("No se pudo desasignar el camión.");
    } finally {
      setUnassigning(false);
    }
  }

  async function handleCreateRequest(input: {
    cattleCount: number;
    cattleWeightMinKg: number;
    cattleWeightMaxKg: number;
    origin: RouteLocation;
    destination: RouteLocation;
    notes: string;
  }) {
    const client = clients.find((item) => item.id === selectedClientId);
    if (!client) return;

    setCreatingRequest(true);
    setError(null);
    try {
      const request = await createTransportRequest({
        clientId: client.id,
        clientName: client.businessName,
        cattleCount: input.cattleCount,
        cattleWeightMinKg: input.cattleWeightMinKg,
        cattleWeightMaxKg: input.cattleWeightMaxKg,
        originName: input.origin.name,
        originLat: input.origin.lat,
        originLng: input.origin.lng,
        destinationName: input.destination.name,
        destinationLat: input.destination.lat,
        destinationLng: input.destination.lng,
        departureAt: new Date(departureAt).toISOString(),
        notes: input.notes.trim() || null,
      });
      await loadDashboard();
      setCurrentView("pending");
      setSelectedRequestId(request.id);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo crear la solicitud.",
      );
    } finally {
      setCreatingRequest(false);
    }
  }

  async function handleSaveExternalRoute(input: {
    cattleCount: number;
    cattleWeightMinKg: number;
    cattleWeightMaxKg: number;
    origin: RouteLocation;
    destination: RouteLocation;
    departureAt: string;
  }) {
    if (!selectedRequest) return;
    setSavingRouteDetails(true);
    setError(null);
    try {
      const updatedRequest = await updateTransportRequestDetails(selectedRequest.id, {
        cattleCount: input.cattleCount,
        cattleWeightMinKg: input.cattleWeightMinKg,
        cattleWeightMaxKg: input.cattleWeightMaxKg,
        originName: input.origin.name,
        originLat: input.origin.lat,
        originLng: input.origin.lng,
        destinationName: input.destination.name,
        destinationLat: input.destination.lat,
        destinationLng: input.destination.lng,
        departureAt: new Date(input.departureAt).toISOString(),
        routePending: false,
      });
      await loadDashboard();
      setSelectedRequestId(updatedRequest.id);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "No se pudieron guardar los datos logísticos.");
    } finally {
      setSavingRouteDetails(false);
    }
  }

  async function handleConfirmLogistics() {
    if (!selectedRequest || selectedRequest.status !== "assigned") return;
    setConfirmingLogistics(true);
    setError(null);
    try {
      await updateTransportRequestStatus(selectedRequest.id, "confirmed");
      await loadDashboard();
      setSelectedRequestId(null);
      setConfirmationAction(null);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "No se pudo confirmar la logística.",
      );
    } finally {
      setConfirmingLogistics(false);
    }
  }

  async function handleDeleteRequest() {
    if (!selectedRequest) return;
    setConfirmingLogistics(true);
    setError(null);
    try {
      await deleteTransportRequest(selectedRequest.id);
      await loadDashboard();
      setSelectedRequestId(null);
      setAssignment(null);
      setConfirmationAction(null);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "No se pudo eliminar la solicitud.");
    } finally {
      setConfirmingLogistics(false);
    }
  }

  async function handleCancelLogistics() {
    if (!selectedRequest) return;
    await handleUnassign();
    setCurrentView("pending");
    setConfirmationAction(null);
  }

  async function handleCancelConfirmedTrip() {
    if (!selectedRequest) return;
    setConfirmingLogistics(true);
    setError(null);
    try {
      await updateTransportRequestStatus(selectedRequest.id, "cancelled");
      await loadDashboard();
      setSelectedRequestId(null);
      setConfirmationAction(null);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "No se pudo anular el viaje.");
    } finally {
      setConfirmingLogistics(false);
    }
  }

  async function handleCompleteTrip() {
    if (!selectedRequest || selectedRequest.status !== "confirmed") return;
    setConfirmingLogistics(true);
    setError(null);
    try {
      await updateTransportRequestStatus(selectedRequest.id, "completed");
      await loadDashboard();
      setSelectedRequestId(null);
      setConfirmationAction(null);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "No se pudo completar el viaje.");
    } finally {
      setConfirmingLogistics(false);
    }
  }

  function clearAssignmentPreview() {
    setAssignment(null);
    setSelectedTruckIds([]);
    setError(null);
  }

  function canVoidTrip(request: TransportRequest) {
    if (!request.departureAt) return false;
    const departure = new Date(request.departureAt);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return departure.getTime() >= currentMonthStart.getTime();
  }

  async function executeConfirmationAction() {
    if (confirmationAction === "confirm") await handleConfirmLogistics();
    if (confirmationAction === "complete") await handleCompleteTrip();
    if (confirmationAction === "cancel") await handleCancelLogistics();
    if (confirmationAction === "delete") await handleDeleteRequest();
    if (confirmationAction === "void") await handleCancelConfirmedTrip();
  }

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const assignedCount = requests.filter((request) => request.status === "assigned").length;
  const confirmedCount = requests.filter((request) => request.status === "confirmed").length;
  const completedCount = requests.filter((request) => request.status === "completed").length;
  const cancelledCount = requests.filter((request) => request.status === "cancelled").length;
  const availableTruckCount = trucks.filter((truck) => truck.status === "available").length;

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6 text-zinc-950">
        <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm font-semibold text-zinc-600 shadow-sm">
          Cargando acceso interno...
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
      />
    );
  }

  if (activeModule === "home") {
    return (
      <HomePortal
        darkTheme={darkTheme}
        user={currentUser}
        onLogout={handleLogout}
        onOpenModule={openModule}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (activeModule === "fleet" && hasModuleAccess("fleet")) {
    return (
      <main className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950">
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Image
                alt="Logo BoviTrans"
                className="bovitrans-logo-dark h-28 w-28 shrink-0 object-contain"
                height={112}
                priority
                src="/bovitrans-logo-transparent.png"
                width={112}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
                  BoviTrans
                </p>
                <h1 className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">
                  Administración de Flotas
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UserMenu user={currentUser} onLogout={handleLogout} />
              <button
                className="flex min-h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                type="button"
                onClick={() => openModule("home")}
              >
                <Home size={17} />
                Inicio
              </button>
              <button
                className="flex min-h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                type="button"
                onClick={() => openModule("logistics")}
              >
                <TruckIcon size={17} />
                Panel Logístico
              </button>
              <button
                aria-label={darkTheme ? "Activar tema claro" : "Activar tema oscuro"}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                title={darkTheme ? "Activar tema claro" : "Activar tema oscuro"}
                type="button"
                onClick={toggleTheme}
              >
                {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <FleetManagementView />
        </div>
        <AppFooter />
        <ManualButton />
      </main>
    );
  }

  if (activeModule === "users" && hasModuleAccess("users")) {
    return (
      <main className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950">
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Image alt="Logo BoviTrans" className="bovitrans-logo-dark h-28 w-28 shrink-0 object-contain" height={112} priority src="/bovitrans-logo-transparent.png" width={112} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">BoviTrans</p>
                <h1 className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">Administración de Usuarios</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UserMenu user={currentUser} onLogout={handleLogout} />
              <button className="flex min-h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" type="button" onClick={() => openModule("home")}>
                <Home size={17} />
                Inicio
              </button>
              <button className="flex min-h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" type="button" onClick={() => openModule("logistics")}>
                <TruckIcon size={17} />
                Panel Logístico
              </button>
              <button aria-label={darkTheme ? "Activar tema claro" : "Activar tema oscuro"} className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50" title={darkTheme ? "Activar tema claro" : "Activar tema oscuro"} type="button" onClick={toggleTheme}>
                {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <UserManagementView currentUser={currentUser} />
        </div>
        <AppFooter />
        <ManualButton />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Cargando operación logística...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950 lg:flex-row">
      <NavigationSidebar
        collapsed={sidebarCollapsed}
        counts={{
          pending: pendingCount,
          assigned: assignedCount,
          confirmed: confirmedCount,
          completed: completedCount,
          cancelled: cancelledCount,
        }}
        currentView={currentView}
        onHome={() => setActiveModule("home")}
        onToggle={() => setSidebarCollapsed((current) => !current)}
        onViewChange={handleViewChange}
      />
      <div className="flex min-w-0 flex-1 flex-col">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Image
              alt="Logo BoviTrans"
              className="bovitrans-logo-dark h-28 w-28 shrink-0 object-contain"
              height={112}
              priority
              src="/bovitrans-logo-transparent.png"
              width={112}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
                BoviTrans
              </p>
              <h1 className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">
                Panel Logístico de Transporte Ganadero
              </h1>
            </div>
          </div>
          <div className="flex w-full items-center gap-3 lg:w-auto">
            <UserMenu user={currentUser} onLogout={handleLogout} />
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md border border-zinc-200 px-2 py-3 sm:px-4">
                <p className="text-xs text-zinc-500">Solicitudes</p>
                <p className="font-semibold">{requests.length}</p>
              </div>
              <div className="rounded-md border border-zinc-200 px-2 py-3 sm:px-4">
                <p className="text-xs text-zinc-500">Pendientes</p>
                <p className="font-semibold">{pendingCount}</p>
              </div>
              <div className="rounded-md border border-zinc-200 px-2 py-3 sm:px-4">
                <p className="text-xs text-zinc-500">Camiones Libres</p>
                <p className="font-semibold">{availableTruckCount}</p>
              </div>
            </div>
            <div className="flex shrink-0 justify-center lg:w-24">
              <button
                aria-label={darkTheme ? "Activar tema claro" : "Activar tema oscuro"}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                title={darkTheme ? "Activar tema claro" : "Activar tema oscuro"}
                type="button"
                onClick={toggleTheme}
              >
                {darkTheme ? <Sun size={19} /> : <Moon size={19} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && !selectedRequest && currentView !== "create" ? (
        <div className="mx-auto mt-6 max-w-[1440px] px-5">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      ) : null}

      {currentView === "create" ? (
        <NewRequestView
          busy={creatingRequest}
          clients={clients}
          departureAt={departureAt}
          error={error}
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
          onCreateClient={() => handleClientFormModeChange("create")}
          onDepartureAtChange={setDepartureAt}
          onSubmit={handleCreateRequest}
        />
      ) : (
        <div className="mx-auto max-w-[1440px]">
          {currentView === "confirmed" || currentView === "completed" || currentView === "cancelled" ? (
            <HistoricalFilters
              title={
                currentView === "confirmed"
                  ? "Búsqueda de viajes"
                  : currentView === "completed"
                    ? "Búsqueda histórica de viajes"
                    : "Búsqueda histórica de viajes anulados"
              }
              company={historyCompanySearch}
              date={historyDateSearch}
              document={historyDocumentSearch}
              phone={historyPhoneSearch}
              period={historyPeriodSearch}
              showPeriod={currentView === "completed" || currentView === "cancelled"}
              onCompanyChange={setHistoryCompanySearch}
              onDateChange={setHistoryDateSearch}
              onDocumentChange={setHistoryDocumentSearch}
              onPhoneChange={setHistoryPhoneSearch}
              onPeriodChange={setHistoryPeriodSearch}
            />
          ) : null}
        <div className="grid gap-0 lg:grid-cols-[380px_1fr]">
          <RequestList
            requests={visibleRequests}
            selectedRequestId={selectedRequest?.id ?? null}
            title={
              currentView === "pending"
                ? "Bandeja Operacional"
                : currentView === "assigned"
                  ? "Presupuestos Asignados"
                  : currentView === "confirmed"
                    ? "Logísticas Confirmadas"
                    : currentView === "completed"
                      ? "Viajes Completados"
                      : "Viajes Anulados"
            }
            onSelect={handleRequestSelect}
          />

          <section className="min-h-[calc(100vh-105px)] p-5">
            {selectedRequest ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
              <div className="space-y-5">
                {currentView === "pending" ? (
                  <>
                    {selectedRequest.source === "external" && selectedRequest.routePending ? (
                      <ExternalRequestCompletionPanel
                        request={selectedRequest}
                        client={selectedRequestClient}
                        busy={savingRouteDetails}
                        onSave={handleSaveExternalRoute}
                      />
                    ) : null}
                    <FuelSelectorCard
                      prices={fuelPrices}
                      selectedFuelPriceId={selectedFuelPriceId}
                      refreshing={refreshingFuelPrices}
                      onFuelPriceChange={(id) => {
                        setSelectedFuelPriceId(id);
                        setAssignment(null);
                      }}
                      onRefresh={handleRefreshFuelPrices}
                    />
                    <ClientPanel
                      request={selectedRequest}
                      clients={clients}
                      search={clientSearch}
                      selectedClientId={selectedClientId}
                      busy={clientBusy}
                      error={clientError}
                      onSearchChange={setClientSearch}
                      onSelectedClientChange={(clientId) => {
                        setSelectedClientId(clientId);
                        setClientFormMode(null);
                        setClientForm(emptyClientForm);
                      }}
                      onFormModeChange={handleClientFormModeChange}
                      onSelect={handleSelectClient}
                    />
                  </>
                ) : null}
                <RoutePanel request={selectedRequest} />
              </div>

              {currentView === "pending" && selectedRequest.routePending ? (
                <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  <div className="font-semibold">Datos logísticos pendientes</div>
                  <p className="mt-2 leading-6">
                    Completa origen, destino, fecha y cantidad de cabezas antes de calcular o asignar camiones.
                  </p>
                </section>
              ) : currentView === "pending" ? (
                <AssignmentPanel
                  request={selectedRequest}
                  trucks={trucks}
                  selectedTruckIds={selectedTruckIds}
                  onTruckChange={(truckIds) => {
                    setSelectedTruckIds(truckIds);
                    setAssignment(null);
                    setError(null);
                  }}
                  departureAt={departureAt}
                  onDepartureAtChange={(nextDepartureAt) => {
                    setDepartureAt(nextDepartureAt);
                    setAssignment(null);
                    setError(null);
                  }}
                  warning={capacityWarning}
                  assignment={assignment}
                  onAssign={handleAssign}
                  onUnassign={handleUnassign}
                  onDelete={() => setConfirmationAction("delete")}
                  onClearPreview={clearAssignmentPreview}
                  assigning={assigning}
                  unassigning={unassigning}
                  error={error}
                />
              ) : currentView === "assigned" ? (
                <ConfirmLogisticsPanel
                  client={selectedRequestClient}
                  busy={confirmingLogistics}
                  request={selectedRequest}
                  onConfirm={() => setConfirmationAction("confirm")}
                  onCancel={() => setConfirmationAction("cancel")}
                  onDelete={() => setConfirmationAction("delete")}
                />
              ) : currentView === "confirmed" ? (
                <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <BadgeCheck size={18} />
                    Logística confirmada
                  </div>
                  <p className="mt-2">
                    El presupuesto fue aceptado y los camiones permanecen reservados
                    para esta operación.
                  </p>
                  <button
                    className="mt-5 min-h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
                    type="button"
                    onClick={() => setConfirmationAction("complete")}
                  >
                    Completar Viaje
                  </button>
                  <button
                    className="mt-3 min-h-11 w-full rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                    type="button"
                    disabled={!canVoidTrip(selectedRequest)}
                    title={!canVoidTrip(selectedRequest) ? "No se pueden anular viajes de meses anteriores." : undefined}
                    onClick={() => setConfirmationAction("void")}
                  >
                    Anular Viaje
                  </button>
                  {!canVoidTrip(selectedRequest) ? (
                    <p className="mt-2 text-xs text-red-700">
                      Este viaje pertenece a un mes anterior y ya no puede ser anulado.
                    </p>
                  ) : null}
                </section>
              ) : currentView === "completed" ? (
                <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
                  <div className="flex items-center gap-2 font-semibold"><CheckCheck size={18} />Viaje completado</div>
                  <p className="mt-2">La operación finalizó y permanece disponible como registro histórico inmutable.</p>
                </section>
              ) : (
                <section className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                  <div className="flex items-center gap-2 font-semibold"><X size={18} />Viaje anulado</div>
                  <p className="mt-2">La operación permanece registrada como antecedente y sus camiones fueron liberados.</p>
                </section>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              No hay solicitudes en esta bandeja.
            </div>
          )}
          </section>
        </div>
        </div>
      )}

      <AppFooter />
      <ManualButton />

      {clientFormMode ? (
        <ClientModal
          mode={clientFormMode}
          client={
            clients.find((client) => client.id === selectedClientId) ?? null
          }
          form={clientForm}
          documentTypes={documentTypes}
          cities={cities}
          busy={clientBusy}
          error={clientError}
          onFormChange={setClientForm}
          onClose={() => handleClientFormModeChange(null)}
          onSave={
            clientFormMode === "edit"
              ? handleUpdateClient
              : handleCreateClient
          }
          onDelete={handleDeleteClient}
        />
      ) : null}
      {confirmationAction ? (
        <ConfirmationModal
          action={confirmationAction}
          busy={confirmingLogistics || unassigning}
          onClose={() => setConfirmationAction(null)}
          onConfirm={() => void executeConfirmationAction()}
        />
      ) : null}
      </div>
    </main>
  );
}
