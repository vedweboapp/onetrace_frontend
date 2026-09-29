"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { isGoogleMapsEnabled } from "@/shared/utils/google-maps-loader.util";

const GoogleAddressMultiMiniMap = dynamic(
  () =>
    import("@/shared/components/maps/google-address-multi-mini-map").then((m) => m.GoogleAddressMultiMiniMap),
  {
    ssr: false,
    loading: () => <div className="min-h-[240px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />,
  },
);

const LeafletAddressMultiMiniMap = dynamic(
  () =>
    import("@/shared/components/maps/leaflet-address-multi-mini-map").then((m) => m.LeafletAddressMultiMiniMap),
  {
    ssr: false,
    loading: () => <div className="min-h-[240px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />,
  },
);

export type AddressMultiMiniMapProps = ComponentProps<typeof GoogleAddressMultiMiniMap>;

/** Uses Google Maps when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set; otherwise OpenStreetMap. */
export function AddressMultiMiniMap(props: AddressMultiMiniMapProps) {
  if (isGoogleMapsEnabled()) {
    return <GoogleAddressMultiMiniMap {...props} />;
  }
  return <LeafletAddressMultiMiniMap {...props} />;
}
