"use client";

import { Pencil, Plus, Save, Trash2, Truck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ClientApiError,
  createTruck,
  deleteTruck,
  fetchTrucks,
  updateTruck,
} from "@/lib/client/api";
import {
  axleConfigurationSpecs as axleSpecs,
  vehicleConfigurationSpecs as vehicleSpecs,
  truckTechnicalPresets,
  type AxleConfiguration,
  type Truck as TruckEntity,
  type TruckStatus,
  type VehicleConfiguration,
} from "@/lib/domain/types";

type TruckForm = {
  licensePlate: string;
  brand: string;
  model: string;
  enginePowerHp: string;
  tareWeightTons: string;
  emptyFuelConsumptionPerKm: string;
  fuelConsumptionPerTonKm: string;
  vehicleConfiguration: VehicleConfiguration;
  axleConfiguration: AxleConfiguration;
  lengthM: string;
  maxWeightTons: string;
  status: TruckStatus;
};

const emptyForm: TruckForm = {
  licensePlate: "",
  brand: "Genérico",
  model: "Camión ganadero",
  enginePowerHp: "",
  tareWeightTons: "9",
  emptyFuelConsumptionPerKm: "0.32",
  fuelConsumptionPerTonKm: "0.0065",
  vehicleConfiguration: "truck_semitrailer",
  axleConfiguration: "double_dual",
  lengthM: "22.4",
  maxWeightTons: "18",
  status: "available",
};

const statusLabels: Record<TruckStatus, string> = {
  available: "Disponible",
  assigned: "Asignado",
  maintenance: "Mantenimiento",
};

function toForm(truck: TruckEntity): TruckForm {
  return {
    licensePlate: truck.licensePlate,
    brand: truck.brand,
    model: truck.model,
    enginePowerHp: truck.enginePowerHp ? String(truck.enginePowerHp) : "",
    tareWeightTons: String(truck.tareWeightTons),
    emptyFuelConsumptionPerKm: String(truck.emptyFuelConsumptionPerKm),
    fuelConsumptionPerTonKm: String(truck.fuelConsumptionPerTonKm),
    vehicleConfiguration: truck.vehicleConfiguration,
    axleConfiguration: truck.axleConfiguration,
    lengthM: String(truck.lengthM),
    maxWeightTons: String(truck.maxWeightTons),
    status: truck.status,
  };
}

function parseForm(form: TruckForm) {
  return {
    licensePlate: form.licensePlate.trim().toUpperCase(),
    brand: form.brand.trim(),
    model: form.model.trim(),
    enginePowerHp: form.enginePowerHp ? Number(form.enginePowerHp) : null,
    tareWeightTons: Number(form.tareWeightTons),
    emptyFuelConsumptionPerKm: Number(form.emptyFuelConsumptionPerKm),
    fuelConsumptionPerTonKm: Number(form.fuelConsumptionPerTonKm),
    vehicleConfiguration: form.vehicleConfiguration,
    axleConfiguration: form.axleConfiguration,
    lengthM: Number(form.lengthM),
    maxWeightTons: Number(form.maxWeightTons),
    status: form.status,
  };
}

export function FleetManagementView() {
  const [trucks, setTrucks] = useState<TruckEntity[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [form, setForm] = useState<TruckForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTruck = useMemo(
    () => trucks.find((truck) => truck.id === selectedTruckId) ?? null,
    [selectedTruckId, trucks],
  );
  const selectedTruckAssigned = selectedTruck?.status === "assigned";

  async function loadFleet() {
    setError(null);
    const nextTrucks = await fetchTrucks();
    setTrucks(nextTrucks);
    setSelectedTruckId((current) => current ?? nextTrucks[0]?.id ?? null);
  }

  useEffect(() => {
    loadFleet()
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la flota."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setForm(selectedTruck ? toForm(selectedTruck) : emptyForm);
  }, [selectedTruck]);

  async function handleCreate() {
    const input = parseForm(form);
    if (!input.licensePlate || !input.brand || !input.model || input.lengthM <= 0 || input.maxWeightTons <= 0 || input.tareWeightTons <= 0 || input.emptyFuelConsumptionPerKm <= 0 || input.fuelConsumptionPerTonKm <= 0) {
      setError("Completa patente, ficha técnica, dimensiones y límite de peso con valores válidos.");
      return;
    }
    if (input.status === "assigned") {
      setError("El estado Asignado solo se aplica desde el Panel Logístico.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const truck = await createTruck(input);
      await loadFleet();
      setSelectedTruckId(truck.id);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "No se pudo registrar el camión.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    if (!selectedTruck) return;
    const input = parseForm(form);
    if (!input.licensePlate || !input.brand || !input.model || input.lengthM <= 0 || input.maxWeightTons <= 0 || input.tareWeightTons <= 0 || input.emptyFuelConsumptionPerKm <= 0 || input.fuelConsumptionPerTonKm <= 0) {
      setError("Completa patente, ficha técnica, dimensiones y límite de peso con valores válidos.");
      return;
    }
    if (selectedTruckAssigned || input.status === "assigned") {
      setError("El estado Asignado solo se gestiona desde el Panel Logístico.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateTruck(selectedTruck.id, input);
      await loadFleet();
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "No se pudo actualizar el camión.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedTruck) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTruck(selectedTruck.id);
      setSelectedTruckId(null);
      await loadFleet();
    } catch (operationError) {
      if (operationError instanceof ClientApiError && operationError.status === 409) {
        setError("No se puede eliminar un camión vinculado a solicitudes logísticas.");
      } else {
        setError(operationError instanceof Error ? operationError.message : "No se pudo eliminar el camión.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-[1440px] p-5">
        <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Cargando administración de flotas...
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] p-5">
      {error ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <p className="text-sm font-semibold text-zinc-950">Camiones registrados</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Patente</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Normativa</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Actualización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {trucks.map((truck) => {
                  const active = truck.id === selectedTruckId;
                  return (
                    <tr
                      key={truck.id}
                      className={`cursor-pointer ${active ? "bg-zinc-950 text-white" : "hover:bg-zinc-50"}`}
                      onClick={() => setSelectedTruckId(truck.id)}
                    >
                      <td className="px-5 py-4 font-semibold">{truck.licensePlate}</td>
                      <td className="px-5 py-4">
                        <span className="font-semibold">{truck.brand}</span> {truck.model}
                      </td>
                      <td className="px-5 py-4">
                        {truck.lengthM} m / {truck.maxWeightTons} tn
                      </td>
                      <td className="px-5 py-4">{statusLabels[truck.status]}</td>
                      <td className="px-5 py-4">{new Date(truck.updatedAt).toLocaleDateString("es-PY")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Ficha técnica</p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-950">
                {selectedTruck ? selectedTruck.licensePlate : "Nuevo camión"}
              </h3>
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              title="Nuevo camión"
              type="button"
              onClick={() => {
                setSelectedTruckId(null);
                setForm(emptyForm);
                setError(null);
              }}
            >
              <Plus size={17} />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-zinc-700">
              Modelo frecuente
              <select
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                defaultValue=""
                onChange={(event) => {
                  const preset = truckTechnicalPresets.find(
                    (current) => current.id === event.target.value,
                  );
                  if (!preset) return;
                  setForm((current) => ({
                    ...current,
                    brand: preset.brand,
                    model: preset.model,
                    enginePowerHp: String(preset.enginePowerHp),
                    tareWeightTons: String(preset.tareWeightTons),
                    emptyFuelConsumptionPerKm: String(preset.emptyFuelConsumptionPerKm),
                    fuelConsumptionPerTonKm: String(preset.fuelConsumptionPerTonKm),
                    vehicleConfiguration: preset.vehicleConfiguration,
                    axleConfiguration: preset.axleConfiguration,
                    lengthM: String(vehicleSpecs[preset.vehicleConfiguration].maxLengthM),
                    maxWeightTons: String(axleSpecs[preset.axleConfiguration].maxWeightTons),
                  }));
                }}
              >
                <option value="">Personalizado</option>
                {truckTechnicalPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-zinc-700">
              Patente o matrícula
              <input
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                value={form.licensePlate}
                onChange={(event) => setForm((current) => ({ ...current, licensePlate: event.target.value }))}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-zinc-700">
                Marca
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  value={form.brand}
                  onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-semibold text-zinc-700">
                Modelo
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  value={form.model}
                  onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-zinc-700">
                Potencia HP
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  min={1}
                  type="number"
                  value={form.enginePowerHp}
                  onChange={(event) => setForm((current) => ({ ...current, enginePowerHp: event.target.value.replace(/^0+(?=\d)/, "") }))}
                />
              </label>
              <label className="block text-sm font-semibold text-zinc-700">
                Tara tn
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  min={1}
                  step={0.1}
                  type="number"
                  value={form.tareWeightTons}
                  onChange={(event) => setForm((current) => ({ ...current, tareWeightTons: event.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-zinc-700">
                Tipo de vehículo
                <select
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  value={form.vehicleConfiguration}
                  onChange={(event) => {
                    const vehicleConfiguration = event.target.value as VehicleConfiguration;
                    setForm((current) => ({
                      ...current,
                      vehicleConfiguration,
                      lengthM: String(vehicleSpecs[vehicleConfiguration].maxLengthM),
                    }));
                  }}
                >
                  {Object.entries(vehicleSpecs).map(([key, spec]) => (
                    <option key={key} value={key}>
                      {spec.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-zinc-700">
                Longitud máxima m
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  min={1}
                  step={0.1}
                  type="number"
                  value={form.lengthM}
                  onChange={(event) => setForm((current) => ({ ...current, lengthM: event.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-zinc-700">
                Eje / rodado
                <select
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  value={form.axleConfiguration}
                  onChange={(event) => {
                    const axleConfiguration = event.target.value as AxleConfiguration;
                    setForm((current) => ({
                      ...current,
                      axleConfiguration,
                      maxWeightTons: String(axleSpecs[axleConfiguration].maxWeightTons),
                    }));
                  }}
                >
                  {Object.entries(axleSpecs).map(([key, spec]) => (
                    <option key={key} value={key}>
                      {spec.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-zinc-700">
                Límite de peso tn
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  min={1}
                  step={0.1}
                  type="number"
                  value={form.maxWeightTons}
                  onChange={(event) => setForm((current) => ({ ...current, maxWeightTons: event.target.value }))}
                />
              </label>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="font-semibold">Consumo técnico estimado</p>
              <p className="mt-1">
                El L/km de cada viaje se calcula con consumo vacío, factor por tonelada y el rango kg/cabeza de la solicitud.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-zinc-700">
                Consumo vacío L/km
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  min={0.01}
                  step={0.001}
                  type="number"
                  value={form.emptyFuelConsumptionPerKm}
                  onChange={(event) => setForm((current) => ({ ...current, emptyFuelConsumptionPerKm: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-semibold text-zinc-700">
                Factor L/km/tn
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                  min={0.0001}
                  step={0.0001}
                  type="number"
                  value={form.fuelConsumptionPerTonKm}
                  onChange={(event) => setForm((current) => ({ ...current, fuelConsumptionPerTonKm: event.target.value }))}
                />
              </label>
            </div>
            <label className="block text-sm font-semibold text-zinc-700">
              Estado operativo
              <select
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                disabled={selectedTruckAssigned}
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TruckStatus }))}
              >
                {selectedTruckAssigned ? <option value="assigned">Asignado por logística</option> : null}
                <option value="available">Disponible</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
              {selectedTruckAssigned ? (
                <span className="mt-2 block text-xs font-semibold text-amber-700">
                  Este estado fue reservado desde el Panel Logístico.
                </span>
              ) : null}
            </label>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy || selectedTruckAssigned}
              type="button"
              onClick={() => void (selectedTruck ? handleUpdate() : handleCreate())}
            >
              {selectedTruck ? <Save size={18} /> : <Truck size={18} />}
              {busy ? "Guardando..." : selectedTruck ? "Guardar Cambios" : "Registrar Camión"}
            </button>
            {selectedTruck ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  type="button"
                  onClick={() => setForm(toForm(selectedTruck))}
                >
                  <Pencil size={17} />
                  Revertir
                </button>
                <button
                  className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                  disabled={busy}
                  type="button"
                  onClick={() => void handleDelete()}
                >
                  <Trash2 size={17} />
                  Eliminar
                </button>
              </div>
            ) : (
              <button
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                type="button"
                onClick={() => setForm(emptyForm)}
              >
                <X size={17} />
                Limpiar
              </button>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
