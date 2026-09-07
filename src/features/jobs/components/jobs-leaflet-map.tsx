"use client";

import * as React from "react";
import L from "leaflet";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import type { JobMapPin } from "@/features/jobs/utils/job-site-map.util";
import { buildGeocodeRequestSearchParams, hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";
import { cn } from "@/core/utils/http.util";

type ResolvedPin = JobMapPin & { lat: number; lon: number };

type Props = {
  pins: JobMapPin[];
  selectedJobId: number | null;
  onPinClick: (jobId: number) => void;
  onOpenDetails: (jobId: number) => void;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function JobsLeafletMap({ pins, selectedJobId, onPinClick, onOpenDetails, className }: Props) {
  const t = useTranslations("Dashboard.jobs.mapView");
  ensureLeafletDefaultIcons();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markersRef = React.useRef<Map<number, L.Marker>>(new Map());
  const onPinClickRef = React.useRef(onPinClick);
  const onOpenDetailsRef = React.useRef(onOpenDetails);
  onPinClickRef.current = onPinClick;
  onOpenDetailsRef.current = onOpenDetails;

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
      return;
    }
    void (async () => {
      const next: ResolvedPin[] = [];
      for (const pin of pins) {
        const coords = pin.coordinates;
        if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)) {
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
          if (json.found && json.lat != null && json.lon != null) {
            next.push({ ...pin, lat: json.lat, lon: json.lon });
          }
        } catch {
          /* skip */
        }
      }
      if (!cancelled) {
        setResolved(next);
        setStatus(next.length > 0 ? "ready" : "idle");
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
      }).setView([20.5937, 78.9629], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
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

    const bounds = L.latLngBounds([]);
    for (const pin of resolved) {
      const marker = L.marker([pin.lat, pin.lon], { title: pin.label }).addTo(map);
      const html = `
        <div style="min-width:180px;max-width:240px;">
          <div style="font-size:12px;font-weight:700;margin-bottom:4px;">${escapeHtml(pin.jobLabel)}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:2px;">${escapeHtml(t("jobId"))} #${pin.jobId}</div>
          <div style="font-size:12px;line-height:1.35;color:#334155;">${escapeHtml(pin.addressText || "—")}</div>
          <button type="button" class="ot-job-map-details" data-job-id="${pin.jobId}" style="margin-top:8px;border:0;background:#0f172a;color:#fff;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;">
            ${escapeHtml(t("viewDetails"))}
          </button>
        </div>
      `;
      marker.bindPopup(html, { maxWidth: 280, className: "ot-job-map-popup" });
      marker.on("click", () => {
        onPinClickRef.current(pin.jobId);
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
      bounds.extend([pin.lat, pin.lon]);
    }

    if (resolved.length === 1) {
      map.setView([resolved[0]!.lat, resolved[0]!.lon], 14);
    } else if (resolved.length > 1) {
      map.fitBounds(bounds.pad(0.18));
    }
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
    <div ref={containerRef} className={cn("h-full w-full", className)} role="img" aria-label={t("ariaMap")} />
  );
}
