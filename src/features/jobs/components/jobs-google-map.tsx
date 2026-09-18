"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { JobMapPin } from "@/features/jobs/utils/job-site-map.util";
import { buildJobPinHoverCardHtml } from "@/features/jobs/utils/job-pin-popup.util";
import { fitGoogleMapToPins, isPlausibleMapCoordinate } from "@/features/jobs/utils/job-map-fit.util";
import {
  createJobMapPinElement,
  setJobMapPinSelected,
} from "@/features/jobs/utils/job-map-pin-element.util";
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
  onPinClick: (jobId: number) => void;
  onOpenDetails: (jobId: number) => void;
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
  const hoverJobIdRef = React.useRef<number | null>(null);
  const geocoderRef = React.useRef<google.maps.Geocoder | null>(null);
  const pinByIdRef = React.useRef<Map<number, ResolvedPin>>(new Map());
  const onPinClickRef = React.useRef(onPinClick);
  const onOpenDetailsRef = React.useRef(onOpenDetails);
  const onResolvedPinsChangeRef = React.useRef(onResolvedPinsChange);
  onPinClickRef.current = onPinClick;
  onOpenDetailsRef.current = onOpenDetails;
  onResolvedPinsChangeRef.current = onResolvedPinsChange;

  const [mapReady, setMapReady] = React.useState(false);
  const [mapFailed, setMapFailed] = React.useState(false);
  const [resolved, setResolved] = React.useState<ResolvedPin[]>([]);
  const [placingPins, setPlacingPins] = React.useState(false);

  pinByIdRef.current = new Map(resolved.map((p) => [p.jobId, p]));

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
          maxWidth: 280,
          headerDisabled: true,
        } as google.maps.InfoWindowOptions);
        mapRef.current = map;
        map.addListener("click", () => {
          infoRef.current?.close();
          hoverJobIdRef.current = null;
        });
        setMapFailed(false);
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setMapFailed(true);
          setMapReady(false);
        }
      });

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
    if (!mapReady) return;
    let cancelled = false;

    void (async () => {
      const immediate: ResolvedPin[] = [];
      const needGeocode: JobMapPin[] = [];
      for (const pin of pins) {
        const coords = pin.coordinates;
        if (
          coords &&
          Number.isFinite(coords.lat) &&
          Number.isFinite(coords.lon) &&
          isPlausibleMapCoordinate(coords.lat, coords.lon)
        ) {
          immediate.push({ ...pin, lat: coords.lat, lon: coords.lon });
        } else {
          needGeocode.push(pin);
        }
      }

      if (!cancelled) {
        setResolved(immediate);
        setPlacingPins(needGeocode.length > 0);
        onResolvedPinsChangeRef.current?.(immediate.map((p) => p.jobId));
      }

      if (!geocoderRef.current || needGeocode.length === 0) {
        if (!cancelled) setPlacingPins(false);
        return;
      }

      const collected = [...immediate];
      for (const pin of needGeocode) {
        if (cancelled) return;
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
          const res = await geocoderRef.current.geocode({
            address,
            componentRestrictions: iso.length === 2 ? { country: iso } : undefined,
          });
          const loc = res.results?.[0]?.geometry?.location;
          if (!loc) continue;
          const lat = loc.lat();
          const lon = loc.lng();
          if (!isPlausibleMapCoordinate(lat, lon)) continue;
          const resolvedPin = { ...pin, lat, lon };
          collected.push(resolvedPin);
          if (!cancelled) {
            setResolved([...collected]);
            onResolvedPinsChangeRef.current?.(collected.map((p) => p.jobId));
          }
        } catch {
          /* skip — listed as invalid_address below the map */
        }
      }
      if (!cancelled) setPlacingPins(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mapReady, pins]);

  const openHoverCard = React.useCallback((jobId: number, marker: GoogleAdvancedMarker) => {
    const map = mapRef.current;
    const info = infoRef.current;
    const pin = pinByIdRef.current.get(jobId);
    if (!map || !info || !pin) return;
    hoverJobIdRef.current = jobId;
    info.setContent(buildJobPinHoverCardHtml(pin));
    info.open({ map, anchor: marker });
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const known = new Set(resolved.map((p) => p.jobId));
    for (const [jobId, marker] of markersRef.current) {
      if (!known.has(jobId)) {
        clearAdvancedMarker(marker);
        markersRef.current.delete(jobId);
      }
    }

    let added = false;
    for (const pin of resolved) {
      const existing = markersRef.current.get(pin.jobId);
      if (existing) {
        existing.position = { lat: pin.lat, lng: pin.lon };
        continue;
      }
      added = true;
      const jobId = pin.jobId;
      const content = createJobMapPinElement({
        title: pin.jobLabel,
        color: pin.statusColor,
        selected: selectedJobId === jobId,
      });
      const marker = createAdvancedMarker({
        map,
        lat: pin.lat,
        lng: pin.lon,
        title: pin.jobLabel,
        content,
      });
      markersRef.current.set(jobId, marker);

      marker.addEventListener("gmp-click", () => {
        infoRef.current?.close();
        hoverJobIdRef.current = null;
        onPinClickRef.current(jobId);
        onOpenDetailsRef.current(jobId);
      });
      content.addEventListener("mouseenter", () => openHoverCard(jobId, marker));
      content.addEventListener("mouseleave", () => {
        if (hoverJobIdRef.current === jobId) {
          infoRef.current?.close();
          hoverJobIdRef.current = null;
        }
      });
    }

    if (added || resolved.length > 0) {
      fitGoogleMapToPins(map, resolved);
    }
  }, [mapReady, resolved, openHoverCard]);

  React.useEffect(() => {
    if (!mapReady) return;
    for (const [jobId, marker] of markersRef.current) {
      setJobMapPinSelected(marker.content as HTMLElement | null, selectedJobId === jobId);
    }
  }, [mapReady, selectedJobId, resolved]);

  React.useEffect(() => {
    if (!mapReady || selectedJobId == null) return;
    const pin = resolved.find((p) => p.jobId === selectedJobId);
    if (!pin) return;
    mapRef.current?.panTo({ lat: pin.lat, lng: pin.lon });
  }, [selectedJobId, resolved, mapReady]);

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
    <div className={cn("relative h-full w-full", className)}>
      {!mapReady ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-100 px-4 text-center dark:bg-slate-800"
          aria-busy={!mapFailed}
          aria-live="polite"
        >
          {mapFailed ? (
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("loadMapError")}</p>
          ) : (
            <>
              <div className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-[color:var(--dash-accent,#0f766e)] dark:border-slate-600 dark:border-t-[color:var(--dash-accent,#2dd4bf)]" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("loadingMap")}</p>
            </>
          )}
        </div>
      ) : null}
      {mapReady && placingPins && resolved.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
          <p className="rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
            {t("placingPins")}
          </p>
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full" role="img" aria-label={t("ariaMap")} />
    </div>
  );
}
