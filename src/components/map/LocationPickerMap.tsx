"use client";

import { useMemo } from "react";
import { DivIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, useMapEvents } from "react-leaflet";

export type PickedLocation = { name: string; lat: number; lng: number };

function ClickPicker({
  onPick,
}: {
  onPick: (location: PickedLocation) => void;
}) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      )
        .then((response) => response.json())
        .then((result: { display_name?: string }) =>
          onPick({ name: result.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng }),
        )
        .catch(() => onPick({ name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng }));
    },
  });
  return null;
}

function icon(label: string, background: string) {
  return new DivIcon({
    className: "",
    html: `<div style="display:flex;width:32px;height:32px;align-items:center;justify-content:center;border-radius:50%;border:2px solid white;background:${background};color:white;font-weight:700;box-shadow:0 6px 16px #0004">${label}</div>`,
    iconAnchor: [16, 16],
  });
}

export function LocationPickerMap({
  origin,
  destination,
  onPick,
}: {
  origin: PickedLocation | null;
  destination: PickedLocation | null;
  onPick: (location: PickedLocation) => void;
}) {
  const originIcon = useMemo(() => icon("O", "#0f766e"), []);
  const destinationIcon = useMemo(() => icon("D", "#b45309"), []);
  return (
    <div className="h-[380px] overflow-hidden rounded-md border border-zinc-200">
      <MapContainer
        attributionControl={false}
        center={[-25.3, -57.6]}
        className="h-full w-full"
        scrollWheelZoom
        zoom={7}
        zoomControl
      >
        <TileLayer url={process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
        <ClickPicker onPick={onPick} />
        {origin ? <Marker icon={originIcon} position={[origin.lat, origin.lng]}><Tooltip permanent>{origin.name}</Tooltip></Marker> : null}
        {destination ? <Marker icon={destinationIcon} position={[destination.lat, destination.lng]}><Tooltip permanent>{destination.name}</Tooltip></Marker> : null}
      </MapContainer>
    </div>
  );
}
