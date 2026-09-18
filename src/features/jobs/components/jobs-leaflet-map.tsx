"use client";

import * as React from "react";
import L from "leaflet";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import type { JobMapPin } from "@/features/jobs/utils/job-site-map.util";
import { buildJobPinHoverCardHtml } from "@/features/jobs/utils/job-pin-popup.util";
import { fitLeafletMapToPins, isPlausibleMapCoordinate } from "@/features/jobs/utils/job-map-fit.util";
import { createJobMapPinElement } from "@/features/jobs/utils/job-map-pin-element.util";
import { buildGeocodeRequestSearchParams, hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";
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

let leafletIconFixed = false;
function ensureLeafletDefaultIcons() {
  if (leafletIconFixed) return;
  leafletIconFixed = true;
  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

export function JobsLeafletMap({
  pins,
  selectedJobId,
  onPinClick,
  onOpenDetails,
  onResolvedPinsChange,
  className,
}: Props) {
  const t = useTranslations("Dashboard.jobs.mapView");
  ensureLeafletDefaultIcons();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markersRef = React.useRef<Map<number, L.Marker>>(new Map());
  const onPinClickRef = React.useRef(onPinClick);
  const onOpenDetailsRef = React.useRef(onOpenDetails);
  const onResolvedPinsChangeRef = React.useRef(onResolvedPinsChange);
  onPinClickRef.current = onPinClick;
  onOpenDetailsRef.current = onOpenDetails;
  onResolvedPinsChangeRef.current = onResolvedPinsChange;

  const [resolved, setResolved] = React.useState<ResolvedPin[]>([]);
  const [mapReady, setMapReady] = React.useState(false);
  const [placingPins, setPlacingPins] = React.useState(false);

  const pinsKey = React.useMemo(
    () =>
      JSON.stringify(
        pins.map((p) => ({
          id: p.jobId,
          lat: p.coordinates?.lat ?? null,
          lon: p.coordinates?.lon ?? null,
          color: p.statusColor ?? "",
          line1: p.addressParts.line1 ?? "",
          city: p.addressParts.city ?? "",
          pincode: p.addressParts.pincode ?? "",
          country: p.addressParts.country ?? "",
        })),
      ),
    [pins],
  );

  React.useEffect(() => {
    let cancelled = false;
    if (pins.length === 0) {
      setResolved([]);
      setPlacingPins(false);
      onResolvedPinsChangeRef.current?.([]);
      return;
    }
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
          const qs = buildGeocodeRequestSearchParams(norm).toString();
          const res = await fetch(`/api/geocode?${qs}`);
          if (!res.ok) continue;
          const json = (await res.json()) as { found?: boolean; lat?: number; lon?: number };
          if (
            json.found &&
            json.lat != null &&
            json.lon != null &&
            isPlausibleMapCoordinate(json.lat, json.lon)
          ) {
            collected.push({ ...pin, lat: json.lat, lon: json.lon });
            if (!cancelled) {
              setResolved([...collected]);
              onResolvedPinsChangeRef.current?.(collected.map((p) => p.jobId));
            }
          }
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setPlacingPins(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pinsKey, pins]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!mapRef.current) {
      mapRef.current = L.map(el, {
        scrollWheelZoom: true,
        zoomControl: true,
        minZoom: 3,
        worldCopyJump: false,
      }).setView([20.5937, 78.9629], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        noWrap: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);
      setMapReady(true);
    }
    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const known = new Set(resolved.map((p) => p.jobId));
    for (const [jobId, marker] of markersRef.current) {
      if (!known.has(jobId)) {
        marker.remove();
        markersRef.current.delete(jobId);
      }
    }

    let added = false;
    for (const pin of resolved) {
      if (markersRef.current.has(pin.jobId)) continue;
      added = true;
      const pinEl = createJobMapPinElement({ title: pin.jobLabel, color: pin.statusColor });
      const icon = L.divIcon({
        className: "ot-job-map-leaflet-pin",
        html: pinEl.outerHTML,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -34],
      });
      const marker = L.marker([pin.lat, pin.lon], { title: pin.jobLabel, icon }).addTo(map);
      marker.bindTooltip(buildJobPinHoverCardHtml(pin), {
        direction: "top",
        offset: [0, -28],
        opacity: 1,
        className: "ot-job-map-popup ot-job-map-hover-tooltip",
        sticky: false,
      });
      marker.on("click", () => {
        marker.closeTooltip();
        onPinClickRef.current(pin.jobId);
        onOpenDetailsRef.current(pin.jobId);
      });
      markersRef.current.set(pin.jobId, marker);
    }

    if (added || resolved.length > 0) {
      fitLeafletMapToPins(map, () => L.latLngBounds([]), resolved);
      requestAnimationFrame(() => map.invalidateSize());
    }
  }, [mapReady, resolved]);

  React.useEffect(() => {
    if (selectedJobId == null || !mapRef.current) return;
    const pin = resolved.find((p) => p.jobId === selectedJobId);
    if (!pin) return;
    mapRef.current.panTo([pin.lat, pin.lon]);
  }, [selectedJobId, resolved]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={cn("relative h-full w-full", className)}>
      {!mapReady ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-[color:var(--dash-accent,#0f766e)] dark:border-slate-600 dark:border-t-[color:var(--dash-accent,#2dd4bf)]" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("loadingMap")}</p>
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
