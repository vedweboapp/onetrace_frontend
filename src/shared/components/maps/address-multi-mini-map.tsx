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

export type AddressMultiMiniMapProps = ComponentProps<typeof GoogleAddressMultiMiniMap>;

export function AddressMultiMiniMap(props: AddressMultiMiniMapProps) {
  if (isGoogleMapsEnabled()) {
    return <GoogleAddressMultiMiniMap {...props} />;
  }
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
      Map unavailable
    </div>
  );
}
