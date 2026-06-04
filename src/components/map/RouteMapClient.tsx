"use client";

import dynamic from "next/dynamic";

export type RouteMapClientProps = {
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

const DynamicRouteMap = dynamic(
  () => import("@/components/map/RouteMap").then((module) => module.RouteMap),
  {
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-sm text-zinc-500">
        Cargando mapa...
      </div>
    ),
    ssr: false,
  },
);

export function RouteMapClient(props: RouteMapClientProps) {
  return <DynamicRouteMap {...props} />;
}
