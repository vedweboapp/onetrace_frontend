"use client";

import * as React from "react";
import L from "leaflet";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import type { JobMapPin } from "@/features/jobs/utils/job-site-map.util";
import { buildJobPinPopupHtml } from "@/features/jobs/utils/job-pin-popup.util";
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
  const [status, setStatus] = React.useState<"idle" | "ready">("idle");

  const pinsKey = React.useMemo(
    () =>
      JSON.stringify(
        pins.map((p) => ({
          id: p.jobId,
          lat: p.coordinates?.lat ?? null,
          lon: p.coordinates?.lon ?? null,
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
      setStatus("idle");
      onResolvedPinsChangeRef.current?.([]);
      return;
    }
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
            next.push({ ...pin, lat: json.lat, lon: json.lon });
          }
        } catch {
          /* skip */
        }
      }
      if (!cancelled) {
        setResolved(next);
        setStatus("ready");
        onResolvedPinsChangeRef.current?.(next.map((p) => p.jobId));
      }
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
    }
    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;

    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();

    for (const pin of resolved) {
      const pinEl = createJobMapPinElement({ title: pin.jobLabel });
      const icon = L.divIcon({
        className: "ot-job-map-leaflet-pin",
        html: pinEl.outerHTML,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -40],
      });
      const marker = L.marker([pin.lat, pin.lon], { title: pin.jobLabel, icon }).addTo(map);
      const html = buildJobPinPopupHtml(pin, { openAriaLabel: t("viewDetails") });
      marker.bindPopup(html, { maxWidth: 320, className: "ot-job-map-popup", closeButton: true });
      marker.on("click", () => {
        onPinClickRef.current(pin.jobId);
        onOpenDetailsRef.current(pin.jobId);
      });
      marker.on("popupopen", () => {
        const btn = document.querySelector<HTMLButtonElement>(
          `.ot-job-map-details[data-job-id="${pin.jobId}"]`,
        );
        if (!btn) return;
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenDetailsRef.current(pin.jobId);
        };
      });
      markersRef.current.set(pin.jobId, marker);
    }

    fitLeafletMapToPins(map, () => L.latLngBounds([]), resolved);
    requestAnimationFrame(() => map.invalidateSize());
  }, [status, resolved, t]);

  React.useEffect(() => {
    if (selectedJobId == null) return;
    const marker = markersRef.current.get(selectedJobId);
    const pin = resolved.find((p) => p.jobId === selectedJobId);
    if (!marker || !pin || !mapRef.current) return;
    marker.openPopup();
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
      {pins.length > 0 && status !== "ready" ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-[color:var(--dash-accent,#0f766e)] dark:border-slate-600 dark:border-t-[color:var(--dash-accent,#2dd4bf)]" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("loadingMap")}</p>
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full" role="img" aria-label={t("ariaMap")} />
    </div>
  );
}
