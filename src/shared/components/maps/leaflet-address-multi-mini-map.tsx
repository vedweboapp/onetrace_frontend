"use client";

import * as React from "react";
import L from "leaflet";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import type { AddressMapPoint } from "@/shared/components/maps/google-address-multi-mini-map";
import { buildGeocodeRequestSearchParams, hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";
import { cn } from "@/core/utils/http.util";

const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function openStreetMapTabUrl(lat: number, lon: number, zoom = 14): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}

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

type ResolvedPoint = AddressMapPoint & { lat: number; lon: number };

type Props = {
  points: AddressMapPoint[];
  className?: string;
  mapClassName?: string;
  /** Called when a resolved pin is clicked (e.g. open job detail). */
  onPointClick?: (point: AddressMapPoint) => void;
};

export function LeafletAddressMultiMiniMap({ points, className, mapClassName, onPointClick }: Props) {
  const t = useTranslations("Dashboard.common.map");
  ensureLeafletDefaultIcons();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markersRef = React.useRef<L.Marker[]>([]);

  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "notfound" | "error">("idle");
  const [resolved, setResolved] = React.useState<ResolvedPoint[]>([]);

  const pointsKey = React.useMemo(
    () =>
      JSON.stringify(
        points.map((p) => ({
          id: p.id,
          lat: p.coordinates?.lat ?? null,
          lon: p.coordinates?.lon ?? null,
          line1: p.addressParts.line1 ?? "",
          city: p.addressParts.city ?? "",
          state: p.addressParts.state ?? "",
          pincode: p.addressParts.pincode ?? "",
          country: p.addressParts.country ?? "",
        })),
      ),
    [points],
  );

  const destroyMap = React.useCallback(() => {
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    if (points.length === 0) {
      destroyMap();
      setResolved([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setResolved([]);

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
          const qs = buildGeocodeRequestSearchParams(norm).toString();
          const res = await fetch(`/api/geocode?${qs}`);
          if (!res.ok) continue;
          const json = (await res.json()) as { found?: boolean; lat?: number; lon?: number };
          if (json.found && json.lat != null && json.lon != null && Number.isFinite(json.lat) && Number.isFinite(json.lon)) {
            next.push({ ...point, lat: json.lat, lon: json.lon });
          }
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
  }, [pointsKey, points, destroyMap]);

  React.useEffect(() => {
    if (status !== "ready" || resolved.length === 0 || !containerRef.current) return;

    const el = containerRef.current;
    if (!mapRef.current) {
      mapRef.current = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView(
        [resolved[0]!.lat, resolved[0]!.lon],
        14,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: OSM_ATTRIB,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];

    const bounds = L.latLngBounds([]);
    for (const point of resolved) {
      const marker = L.marker([point.lat, point.lon], {
        title: point.label,
      }).addTo(map);
      if (point.label) {
        marker.bindPopup(point.label);
      }
      if (onPointClick) {
        marker.on("click", () => {
          onPointClick(point);
        });
      }
      markersRef.current.push(marker);
      bounds.extend([point.lat, point.lon]);
    }

    if (resolved.length === 1) {
      map.setView([resolved[0]!.lat, resolved[0]!.lon], 14);
    } else {
      map.fitBounds(bounds.pad(0.2));
    }

    requestAnimationFrame(() => map.invalidateSize());
  }, [status, resolved, onPointClick]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (status !== "ready" || !el) return;

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const map = mapRef.current;
        if (!map || !el.isConnected) return;
        try {
          map.invalidateSize();
        } catch {
          /* ignore */
        }
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [status]);

  React.useEffect(
    () => () => {
      destroyMap();
    },
    [destroyMap],
  );

  const center = resolved[0];
  const externalMapHref = center ? openStreetMapTabUrl(center.lat, center.lon) : null;

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
