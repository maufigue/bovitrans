"use client";

import { useEffect, useMemo, useState } from "react";
import { DivIcon, LatLngBounds } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

type RouteMapProps = {
  origin: {
    name: string;
    lat: number;
    lng: number;
  };
  destination: {
    name: string;
    lat: number;
    lng: number;
  };
  distanceKm: number | null;
};

const routeColor = "#0f766e";
const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";

type RoutePosition = [number, number];
type RoadRoute = {
  positions: RoutePosition[];
  distanceKm: number | null;
  loaded: boolean;
};

function createMarkerIcon(label: string, tone: "origin" | "destination") {
  const background = tone === "origin" ? "#0f766e" : "#b45309";

  return new DivIcon({
    className: "",
    html: `
      <div style="
        display:flex;
        height:30px;
        width:30px;
        align-items:center;
        justify-content:center;
        border-radius:9999px;
        border:2px solid white;
        background:${background};
        color:white;
        font-size:12px;
        font-weight:700;
        box-shadow:0 8px 18px rgba(15, 23, 42, 0.28);
      ">${label}</div>
    `,
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function FitRouteBounds({ positions }: { positions: RoutePosition[] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = new LatLngBounds(positions);

    map.fitBounds(bounds, {
      padding: [36, 36],
      maxZoom: 8,
      animate: false,
    });
  }, [map, positions]);

  return null;
}

export function RouteMap({ origin, destination, distanceKm }: RouteMapProps) {
  const fallbackPositions = useMemo(
    () =>
      [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ] satisfies RoutePosition[],
    [destination.lat, destination.lng, origin.lat, origin.lng],
  );
  const [roadRoute, setRoadRoute] = useState<RoadRoute>({
    positions: fallbackPositions,
    distanceKm: null,
    loaded: false,
  });
  const center = useMemo(
    () =>
      [
        (origin.lat + destination.lat) / 2,
        (origin.lng + destination.lng) / 2,
      ] satisfies [number, number],
    [destination.lat, destination.lng, origin.lat, origin.lng],
  );
  const originIcon = useMemo(() => createMarkerIcon("O", "origin"), []);
  const destinationIcon = useMemo(
    () => createMarkerIcon("D", "destination"),
    [],
  );
  const displayDistanceKm = roadRoute.distanceKm ?? distanceKm;

  useEffect(() => {
    const controller = new AbortController();
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const routeUrl = `${OSRM_ROUTE_URL}/${coordinates}?overview=full&geometries=geojson&alternatives=false&steps=false`;

    setRoadRoute({
      positions: fallbackPositions,
      distanceKm: null,
      loaded: false,
    });

    fetch(routeUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Route service unavailable.");
        }

        return response.json() as Promise<{
          routes?: Array<{
            distance?: number;
            geometry?: {
              coordinates?: Array<[number, number]>;
            };
          }>;
        }>;
      })
      .then((payload) => {
        const route = payload.routes?.[0];
        const coordinates = route?.geometry?.coordinates ?? [];
        const positions = coordinates.map(
          ([lng, lat]) => [lat, lng] satisfies RoutePosition,
        );

        if (positions.length < 2) {
          throw new Error("Route geometry unavailable.");
        }

        setRoadRoute({
          positions,
          distanceKm:
            typeof route?.distance === "number"
              ? Number((route.distance / 1000).toFixed(1))
              : null,
          loaded: true,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRoadRoute({
            positions: fallbackPositions,
            distanceKm: null,
            loaded: true,
          });
        }
      });

    return () => controller.abort();
  }, [
    destination.lat,
    destination.lng,
    fallbackPositions,
    origin.lat,
    origin.lng,
  ]);

  return (
    <div className="relative h-[320px] overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
      <MapContainer
        attributionControl={false}
        center={center}
        className="h-full w-full"
        scrollWheelZoom={false}
        zoom={6}
        zoomControl
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url={
            process.env.NEXT_PUBLIC_MAP_TILE_URL ??
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        <Polyline
          pathOptions={{
            color: routeColor,
            dashArray: roadRoute.distanceKm ? undefined : "8 8",
            opacity: 0.92,
            weight: 4,
          }}
          positions={roadRoute.positions}
        />
        <Marker icon={originIcon} position={[origin.lat, origin.lng]}>
          <Tooltip direction="top" offset={[0, -10]} permanent>
            {origin.name}
          </Tooltip>
        </Marker>
        <Marker icon={destinationIcon} position={[destination.lat, destination.lng]}>
          <Tooltip direction="top" offset={[0, -10]} permanent>
            {destination.name}
          </Tooltip>
        </Marker>
        <FitRouteBounds positions={roadRoute.positions} />
      </MapContainer>

      <div className="map-route-summary absolute bottom-3 left-3 z-[500] rounded-md border border-white/80 bg-white/95 px-3 py-2 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
          Trazado estimado
        </p>
        <p className="mt-0.5 text-sm font-semibold text-zinc-950">
          {displayDistanceKm
            ? `${displayDistanceKm.toLocaleString("es-PY")} km por carretera`
            : roadRoute.loaded
              ? "Distancia pendiente"
              : "Calculando ruta..."}
        </p>
      </div>
    </div>
  );
}
