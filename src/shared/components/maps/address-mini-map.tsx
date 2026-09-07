"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { isGoogleMapsEnabled } from "@/shared/utils/google-maps-loader.util";

const GoogleAddressMiniMap = dynamic(
  () => import("@/shared/components/maps/google-address-mini-map").then((m) => m.GoogleAddressMiniMap),
  {
    ssr: false,
    loading: () => <div className="min-h-[200px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />,
  },
);

const LeafletAddressMiniMap = dynamic(
  () => import("@/shared/components/maps/leaflet-address-mini-map").then((m) => m.LeafletAddressMiniMap),
  {
    ssr: false,
    loading: () => <div className="min-h-[200px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />,
  },
);

export type AddressMiniMapProps = ComponentProps<typeof GoogleAddressMiniMap>;

export function AddressMiniMap(props: AddressMiniMapProps) {
  if (isGoogleMapsEnabled()) {
    return <GoogleAddressMiniMap {...props} />;
  }
  return <LeafletAddressMiniMap {...props} />;
}
