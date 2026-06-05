"use client";

import dynamic from "next/dynamic";
import type { PickedLocation } from "@/components/map/LocationPickerMap";

const DynamicPicker = dynamic(
  () => import("@/components/map/LocationPickerMap").then((module) => module.LocationPickerMap),
  { ssr: false },
);

export function LocationPickerMapClient(props: {
  origin: PickedLocation | null;
  destination: PickedLocation | null;
  onPick: (location: PickedLocation) => void;
}) {
  return <DynamicPicker {...props} />;
}
