"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { JobMapPin } from "@/features/jobs/utils/job-site-map.util";
import { buildJobPinPopupHtml } from "@/features/jobs/utils/job-pin-popup.util";
import { fitGoogleMapToPins, isPlausibleMapCoordinate } from "@/features/jobs/utils/job-map-fit.util";
import { buildGeocodeRequestSearchParams, hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";
import {
  clearAdvancedMarker,
  createAdvancedMarker,
  createGoogleMap,
  type GoogleAdvancedMarker,
} from "@/shared/utils/google-map-marker.util";
import { cn } from "@/core/utils/http.util";

type ResolvedPin = JobMapPin & { lat: number; lon: number };

type Props = {
  pins: JobMapPin[];
  selectedJobId: number | null;
  /** Opens the map pin popup (job id + address). */
  onPinClick: (jobId: number) => void;
  /** Opens the side details panel. */
  onOpenDetails: (jobId: number) => void;
  /** Job ids that successfully resolved to a map coordinate. */
  onResolvedPinsChange?: (jobIds: number[]) => void;
  className?: string;
};

export function JobsGoogleMap({
  pins,
  selectedJobId,
  onPinClick,
  onOpenDetails,
  onResolvedPinsChange,
  className,
}: Props) {
  const t = useTranslations("Dashboard.jobs.mapView");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markersRef = React.useRef<Map<number, GoogleAdvancedMarker>>(new Map());
  const infoRef = React.useRef<google.maps.InfoWindow | null>(null);
  const geocoderRef = React.useRef<google.maps.Geocoder | null>(null);
  const onPinClickRef = React.useRef(onPinClick);
  const onOpenDetailsRef = React.useRef(onOpenDetails);
  const onResolvedPinsChangeRef = React.useRef(onResolvedPinsChange);
  onPinClickRef.current = onPinClick;
  onOpenDetailsRef.current = onOpenDetails;
  onResolvedPinsChangeRef.current = onResolvedPinsChange;

  const [mapReady, setMapReady] = React.useState(false);
  const [resolved, setResolved] = React.useState<ResolvedPin[]>([]);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    let cancelled = false;

    createGoogleMap(el, {
      center: { lat: 20.5937, lng: 78.9629 },
      zoom: 4,
      minZoom: 3,
      scrollwheel: true,
      fullscreenControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      zoomControl: true,
    })
      .then(({ google: g, map }) => {
        if (cancelled) return;
        geocoderRef.current = new g.maps.Geocoder();
        infoRef.current = new g.maps.InfoWindow({
          maxWidth: 320,
          // Strip default header chrome so our card matches Google place popups.
          headerDisabled: true,
        } as google.maps.InfoWindowOptions);
        mapRef.current = map;
        map.addListener("click", () => infoRef.current?.close());
        setMapReady(true);
      })
      .catch(() => setMapReady(false));

    return () => {
      cancelled = true;
      infoRef.current?.close();
      infoRef.current = null;
      for (const marker of markersRef.current.values()) clearAdvancedMarker(marker);
      markersRef.current.clear();
      mapRef.current = null;
      geocoderRef.current = null;
      setMapReady(false);
    };
  }, []);

  React.useEffect(() => {
    if (!mapReady || !geocoderRef.current) return;
    let cancelled = false;

    void (async () => {
      const next: ResolvedPin[] = [];
      for (const pin of pins) {
        const coords = pin.coordinates;
        if (
          coords &&
          Number.isFinite(coords.lat) &&
          Number.isFinite(coords.lon) &&
          isPlausibleMapCoordinate(coords.lat, coords.lon)
        ) {
          next.push({ ...pin, lat: coords.lat, lon: coords.lon });
          continue;
        }
        const norm = {
          line1: pin.addressParts.line1?.trim() ?? "",
          line2: pin.addressParts.line2?.trim() ?? "",
          city: pin.addressParts.city?.trim() ?? "",
          state: pin.addressParts.state?.trim() ?? "",
          pincode: pin.addressParts.pincode?.trim() ?? "",
          country: pin.addressParts.country?.trim() ?? "",
          countryIso: pin.addressParts.countryIso?.trim().toUpperCase() ?? "",
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
          if (loc) {
            const lat = loc.lat();
            const lon = loc.lng();
            if (isPlausibleMapCoordinate(lat, lon)) next.push({ ...pin, lat, lon });
          }
        } catch {
          /* skip — reported as invalid_address in the unmapped table */
        }
      }
      if (!cancelled) {
        setResolved(next);
        onResolvedPinsChangeRef.current?.(next.map((p) => p.jobId));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapReady, pins]);

  const openInfo = React.useCallback((pin: ResolvedPin, marker: GoogleAdvancedMarker) => {
    const map = mapRef.current;
    const info = infoRef.current;
    if (!map || !info) return;
    info.setContent(
      buildJobPinPopupHtml(pin, {
        openAriaLabel: t("viewDetails"),
      }),
    );
    info.open({ map, anchor: marker });
    window.setTimeout(() => {
      const btn = document.querySelector<HTMLButtonElement>(`button[data-job-details="${pin.jobId}"]`);
      if (!btn) return;
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenDetailsRef.current(pin.jobId);
      };
    }, 0);
  }, [t]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const marker of markersRef.current.values()) clearAdvancedMarker(marker);
    markersRef.current.clear();

    const listeners: Array<() => void> = [];
    for (const pin of resolved) {
      const marker = createAdvancedMarker({
        map,
        lat: pin.lat,
        lng: pin.lon,
        title: pin.label,
      });
      markersRef.current.set(pin.jobId, marker);
      const onClick = () => {
        onPinClickRef.current(pin.jobId);
        openInfo(pin, marker);
      };
      marker.addEventListener("gmp-click", onClick);
      listeners.push(() => marker.removeEventListener("gmp-click", onClick));
    }

    fitGoogleMapToPins(map, resolved);

    return () => {
      for (const remove of listeners) remove();
    };
  }, [mapReady, resolved, openInfo]);

  React.useEffect(() => {
    if (!mapReady || selectedJobId == null) return;
    const pin = resolved.find((p) => p.jobId === selectedJobId);
    const marker = markersRef.current.get(selectedJobId);
    if (!pin || !marker) return;
    openInfo(pin, marker);
    mapRef.current?.panTo({ lat: pin.lat, lng: pin.lon });
  }, [selectedJobId, resolved, mapReady, openInfo]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !mapReady) return;
    const ro = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) return;
      google.maps.event.trigger(map, "resize");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

  return (
    <div ref={containerRef} className={cn("h-full w-full", className)} role="img" aria-label={t("ariaMap")} />
  );
}
