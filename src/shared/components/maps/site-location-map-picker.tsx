"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { isGoogleMapsEnabled } from "@/shared/utils/google-maps-loader.util";

const GoogleSiteLocationMapPicker = dynamic(
  () =>
    import("@/shared/components/maps/google-site-location-map-picker").then((m) => m.GoogleSiteLocationMapPicker),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[280px] animate-pulse bg-slate-100 dark:bg-slate-800" />,
  },
);

const LeafletSiteLocationMapPicker = dynamic(
  () =>
    import("@/shared/components/maps/leaflet-site-location-map-picker").then((m) => m.LeafletSiteLocationMapPicker),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[280px] animate-pulse bg-slate-100 dark:bg-slate-800" />,
  },
);

export type SiteLocationMapPickerProps = ComponentProps<typeof GoogleSiteLocationMapPicker>;

export function SiteLocationMapPicker(props: SiteLocationMapPickerProps) {
  if (isGoogleMapsEnabled()) {
    return <GoogleSiteLocationMapPicker {...props} />;
  }
  return <LeafletSiteLocationMapPicker {...props} />;
}
