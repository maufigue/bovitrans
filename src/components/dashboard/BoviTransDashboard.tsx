"use client";

import Image from "next/image";
import { Moon, Pencil, Plus, RefreshCw, Sun, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  assignTruck,
  ClientApiError,
  createClient,
  deleteClient,
  fetchCities,
  fetchClients,
  fetchDocumentTypes,
  fetchFuelPrices,
  refreshFuelPrices,
  fetchTransportRequests,
  fetchTrucks,
  selectRequestClient,
  unassignTruck,
  updateClient,
  type AssignmentResponse,
  type FuelPrice,
} from "@/lib/client/api";
import type {
  Client,
  City,
  DocumentType,
  TransportRequest,
  Truck,
} from "@/lib/domain/types";
import { RouteMapClient } from "@/components/map/RouteMapClient";

type CapacityWarningDetails = {
  excessCattle: number;
  tripsNeeded: number;
};

type ClientForm = {
  companyName: string;
  businessName: string;
  documentNumber: string;
  documentTypeId: number;
  phoneNumber: string;
  cityId: number;
  email: string;
};

const emptyClientForm: ClientForm = {
  companyName: "",
  businessName: "",
  documentNumber: "",
  documentTypeId: 0,
  phoneNumber: "",
  cityId: 1,
  email: "",
};

const statusLabels = {
  pending: "Pendiente",
  assigned: "Asignada",
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

function getTotalCapacity(trucks: Truck[]) {
  return trucks.reduce((total, truck) => total + truck.maxCapacity, 0);
}

function getCapacityWarning(
  request: TransportRequest | null,
  selectedTrucks: Truck[],
) {
  const totalCapacity = getTotalCapacity(selectedTrucks);

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
  if (request.status === "in_progress") return 1;
  return 0;
}

function StatusBadge({ status }: { status: TransportRequest["status"] }) {
  const tone =
    status === "pending"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : status === "assigned"
        ? "bg-sky-50 text-sky-700 ring-sky-200"
        : status === "completed"
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
  onSelect,
}: {
  requests: TransportRequest[];
  selectedRequestId: string | null;
  onSelect: (requestId: string) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
          Solicitudes
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-950">
          Bandeja Operacional
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {requests.map((request) => {
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
            <input
              className="h-11 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950 sm:col-span-2"
              placeholder="Número de teléfono"
              value={form.phoneNumber}
              onChange={(event) =>
                onFormChange({ ...form, phoneNumber: event.target.value })
              }
            />
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
  onAssign: (confirmOverflow: boolean) => void;
  onUnassign: () => void;
  assigning: boolean;
  unassigning: boolean;
  error: string | null;
}) {
  const minimumDepartureAt = toDateTimeInputValue(
    new Date(Date.now() + 60 * 1000),
  );
  const selectedTrucks = getSelectedTrucks(trucks, selectedTruckIds);
  const selectedTruckCapacity = getTotalCapacity(selectedTrucks);
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
                      {truck.licensePlate} - {truck.maxCapacity} cabezas -{" "}
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
          {selectedTrucks.map((truck) => (
            <div
              key={truck.id}
              className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-2 first:border-t-0 first:pt-0"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  {truck.licensePlate}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {truck.maxCapacity} cabezas, {" "}
                  {formatNumber(truck.fuelConsumptionPerKm, 3)} l/km
                </p>
              </div>
              <TruckStatusBadge status={truck.status} />
            </div>
          ))}
        </div>
      ) : null}

      {warning ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Capacidad excedida</p>
          <p className="mt-1">
            La solicitud excede la capacidad por {warning.excessCattle} cabezas.
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
        <button
          className="min-h-11 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold leading-snug text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          type="button"
          disabled={!canAssign}
          onClick={() => onAssign(false)}
        >
          {assigning ? "Asignando..." : "Asignar Camión"}
        </button>
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
            onClick={() => onAssign(true)}
          >
            Asignar Múltiples Viajes
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function BoviTransDashboard() {
  const [darkTheme, setDarkTheme] = useState(false);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [selectedFuelPriceId, setSelectedFuelPriceId] = useState("");
  const [refreshingFuelPrices, setRefreshingFuelPrices] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
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
  }, []);

  function toggleTheme() {
    const nextDarkTheme = !darkTheme;
    document.documentElement.classList.toggle("dark", nextDarkTheme);
    localStorage.setItem("bovitrans-theme", nextDarkTheme ? "dark" : "light");
    setDarkTheme(nextDarkTheme);
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

  const selectedRequest = useMemo(
    () =>
      requests.find((request) => request.id === selectedRequestId) ??
      requests[0] ??
      null,
    [requests, selectedRequestId],
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

  async function handleCreateClient() {
    setClientBusy(true);
    setClientError(null);

    try {
      const client = await createClient(clientForm);
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
      await updateClient(selectedClientId, clientForm);
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
        phoneNumber: client.phoneNumber,
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

  async function handleAssign(confirmCapacityOverflow: boolean) {
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
      });

      setAssignment(nextAssignment);
      await loadDashboard();
      setSelectedRequestId(nextAssignment.request.id);
      setSelectedTruckIds(nextAssignment.request.assignedTruckIds);
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

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const availableTruckCount = trucks.filter((truck) => truck.status === "available").length;

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
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Image
              alt="Logo BoviTrans"
              className="h-20 w-20 shrink-0 object-contain"
              height={80}
              priority
              src="/bovitrans-logo-transparent.png"
              width={80}
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

      {error && !selectedRequest ? (
        <div className="mx-auto mt-6 max-w-[1440px] px-5">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-[1440px] gap-0 lg:grid-cols-[380px_1fr]">
        <RequestList
          requests={requests}
          selectedRequestId={selectedRequest?.id ?? null}
          onSelect={handleRequestSelect}
        />

        <section className="min-h-[calc(100vh-105px)] p-5">
          {selectedRequest ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
              <div className="space-y-5">
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
                <RoutePanel request={selectedRequest} />
              </div>

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
                assigning={assigning}
                unassigning={unassigning}
                error={error}
              />
            </div>
          ) : (
            <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              No hay solicitudes para operar.
            </div>
          )}
        </section>
      </div>

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
    </main>
  );
}
