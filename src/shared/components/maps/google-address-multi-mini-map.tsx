"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DetailAddressParts } from "@/shared/components/layout/detail-formatted-address";
import { buildGeocodeRequestSearchParams, hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";
import { loadGoogleMaps } from "@/shared/utils/google-maps-loader.util";
import { cn } from "@/core/utils/http.util";

export type AddressMapPoint = {
  id: string | number;
  label?: string;
  addressParts: DetailAddressParts;
  coordinates?: { lat: number; lon: number } | null;
};

type ResolvedPoint = AddressMapPoint & { lat: number; lon: number };

type Props = {
  points: AddressMapPoint[];
  className?: string;
  mapClassName?: string;
};

function googleMapsTabUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

export function GoogleAddressMultiMiniMap({ points, className, mapClassName }: Props) {
  const t = useTranslations("Dashboard.common.map");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markersRef = React.useRef<google.maps.Marker[]>([]);
  const geocoderRef = React.useRef<google.maps.Geocoder | null>(null);

  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "notfound" | "error">("idle");
  const [resolved, setResolved] = React.useState<ResolvedPoint[]>([]);
  const [mapReady, setMapReady] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled) return;
        geocoderRef.current = new google.maps.Geocoder();
        mapRef.current = new google.maps.Map(el, {
          center: { lat: 20.5937, lng: 78.9629 },
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          scrollwheel: false,
        });
        setMapReady(true);
      })
      .catch(() => setStatus("error"));

    return () => {
      cancelled = true;
      for (const m of markersRef.current) m.setMap(null);
      markersRef.current = [];
      mapRef.current = null;
      geocoderRef.current = null;
      setMapReady(false);
    };
  }, []);

  React.useEffect(() => {
    if (!mapReady || !geocoderRef.current || points.length === 0) {
      setResolved([]);
      setStatus(points.length === 0 ? "idle" : "loading");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    void (async () => {
      const next: ResolvedPoint[] = [];
      for (const point of points) {
        const coords = point.coordinates;
        if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)) {
          next.push({ ...point, lat: coords.lat, lon: coords.lon });
          continue;
        }
        const norm = {
          line1: point.addressParts.line1?.trim() ?? "",
          line2: point.addressParts.line2?.trim() ?? "",
          city: point.addressParts.city?.trim() ?? "",
          state: point.addressParts.state?.trim() ?? "",
          pincode: point.addressParts.pincode?.trim() ?? "",
          country: point.addressParts.country?.trim() ?? "",
          countryIso: point.addressParts.countryIso?.trim().toUpperCase() ?? "",
        };
        if (!hasGeocodeableAddress(norm)) continue;
        try {
          const qs = buildGeocodeRequestSearchParams(norm);
          const address = qs.get("q") || qs.get("q_locality") || "";
          const iso = norm.countryIso?.trim().toLowerCase() ?? "";
          const res = await geocoderRef.current!.geocode({
            address,
            componentRestrictions: iso.length === 2 ? { country: iso } : undefined,
          });
          const loc = res.results?.[0]?.geometry?.location;
          if (loc) next.push({ ...point, lat: loc.lat(), lon: loc.lng() });
        } catch {
          // skip point
        }
      }
      if (cancelled) return;
      setResolved(next);
      setStatus(next.length > 0 ? "ready" : "notfound");
    })();

    return () => {
      cancelled = true;
    };
  }, [mapReady, points]);

  const fitMapToResolved = React.useCallback((map: google.maps.Map, points: ResolvedPoint[]) => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setCenter({ lat: points[0]!.lat, lng: points[0]!.lon });
      map.setZoom(14);
    } else {
      const bounds = new google.maps.LatLngBounds();
      for (const point of points) {
        bounds.extend({ lat: point.lat, lng: point.lon });
      }
      map.fitBounds(bounds, 48);
    }
    google.maps.event.trigger(map, "resize");
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || resolved.length === 0) return;

    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    for (const point of resolved) {
      const pos = { lat: point.lat, lng: point.lon };
      const marker = new google.maps.Marker({
        map,
        position: pos,
        title: point.label,
      });
      markersRef.current.push(marker);
    }

    fitMapToResolved(map, resolved);
  }, [status, resolved, fitMapToResolved]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !mapReady) return;

    const ro = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map || status !== "ready" || resolved.length === 0) return;
      fitMapToResolved(map, resolved);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady, status, resolved, fitMapToResolved]);

  const center = resolved[0];
  const externalMapHref = center ? googleMapsTabUrl(center.lat, center.lon) : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-slate-200/90 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50",
        className,
      )}
    >
      <div
        ref={containerRef}
        className={cn("z-0 h-full min-h-[200px] w-full flex-1 basis-0", mapClassName)}
        role="img"
        aria-label={t("ariaMap")}
      />
      {status === "ready" && externalMapHref ? (
        <a
          href={externalMapHref}
          target="_blank"
          rel="noopener noreferrer"
          title={t("openFullMap")}
          aria-label={t("openFullMapAria")}
          className={cn(
            "pointer-events-auto absolute right-2 top-2 z-20 inline-flex size-8 items-center justify-center rounded-md border border-slate-200/95 bg-white/95 text-slate-700 shadow-sm backdrop-blur-[2px]",
            "hover:border-slate-300 hover:bg-white hover:text-slate-900",
            "dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200",
          )}
        >
          <ExternalLink className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
