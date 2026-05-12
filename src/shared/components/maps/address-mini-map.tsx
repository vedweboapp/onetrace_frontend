"use client";

import * as React from "react";
import L from "leaflet";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import type { DetailAddressParts } from "@/shared/components/layout/detail-formatted-address";
import { buildAddressGeocodeQuery, extractPostalDigits, hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";
import { cn } from "@/core/utils/http.util";

const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function openStreetMapTabUrl(lat: number, lon: number, zoom = 17): string {
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

type NormalizedParts = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

function buildGeocodeRequestSearchParams(norm: NormalizedParts): URLSearchParams {
  const sp = new URLSearchParams();
  const street = [norm.line1, norm.line2].filter(Boolean).join(", ");
  if (street) sp.set("street", street.slice(0, 200));
  if (norm.city) sp.set("city", norm.city);
  if (norm.state) sp.set("state", norm.state);
  const pd = extractPostalDigits(norm.pincode);
  if (pd) sp.set("postalcode", pd);
  else if (norm.pincode && /\d/.test(norm.pincode)) sp.set("postalcode", norm.pincode.slice(0, 32));
  if (norm.country) sp.set("country", norm.country);
  const q = buildAddressGeocodeQuery(norm as DetailAddressParts);
  if (q) sp.set("q", q);
  return sp;
}

type Props = {
  /** Structured fields — sent to `/api/geocode` for Nominatim structured + fallback search */
  addressParts: DetailAddressParts | null | undefined;
  className?: string;
  mapClassName?: string;
};

export function AddressMiniMap({ addressParts, className, mapClassName }: Props) {
  const t = useTranslations("Dashboard.common.map");
  ensureLeafletDefaultIcons();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markerRef = React.useRef<L.Marker | null>(null);

  const norm = React.useMemo<NormalizedParts>(
    () => ({
      line1: addressParts?.line1?.trim() ?? "",
      line2: addressParts?.line2?.trim() ?? "",
      city: addressParts?.city?.trim() ?? "",
      state: addressParts?.state?.trim() ?? "",
      pincode: addressParts?.pincode?.trim() ?? "",
      country: addressParts?.country?.trim() ?? "",
    }),
    [
      addressParts?.line1,
      addressParts?.line2,
      addressParts?.city,
      addressParts?.state,
      addressParts?.pincode,
      addressParts?.country,
    ],
  );

  const canGeocode = hasGeocodeableAddress(norm as DetailAddressParts);
  const requestKey = React.useMemo(() => JSON.stringify(norm), [norm]);

  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "notfound" | "error">("idle");
  const [latLon, setLatLon] = React.useState<{ lat: number; lon: number } | null>(null);

  const destroyMap = React.useCallback(() => {
    markerRef.current?.remove();
    markerRef.current = null;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    if (!canGeocode) {
      destroyMap();
      setLatLon(null);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setLatLon(null);
    destroyMap();

    const qs = buildGeocodeRequestSearchParams(norm).toString();
    const tid = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?${qs}`);
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const json = (await res.json()) as { found?: boolean; lat?: number; lon?: number };
        if (!json.found || json.lat == null || json.lon == null || Number.isNaN(json.lat) || Number.isNaN(json.lon)) {
          setStatus("notfound");
          return;
        }
        setLatLon({ lat: json.lat, lon: json.lon });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }, 550);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [requestKey, canGeocode, destroyMap]);

  React.useEffect(() => {
    if (status !== "ready" || !latLon || !containerRef.current) return;

    const el = containerRef.current;
    if (!mapRef.current) {
      mapRef.current = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView([latLon.lat, latLon.lon], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: OSM_ATTRIB,
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView([latLon.lat, latLon.lon], 16);
    }
    markerRef.current?.remove();
    markerRef.current = L.marker([latLon.lat, latLon.lon]).addTo(mapRef.current);

    const map = mapRef.current;
    requestAnimationFrame(() => map.invalidateSize());
  }, [status, latLon]);

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
          /* Map may be torn down between schedule and run (e.g. address change). */
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

  const waitingGeocode = status === "loading" || (status === "idle" && canGeocode);

  const overlayMessage = waitingGeocode
    ? t("loading")
    : status === "notfound"
      ? t("notFound")
      : status === "error"
        ? t("error")
        : !canGeocode
          ? t("noAddress")
          : null;

  const showOverlay = overlayMessage != null;
  const showOpenTab = status === "ready" && latLon != null;
  const externalMapHref = latLon ? openStreetMapTabUrl(latLon.lat, latLon.lon) : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-slate-200/90 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50",
        className,
      )}
    >
      <div
        ref={containerRef}
        className={cn("z-0 h-full min-h-[200px] w-full", mapClassName)}
        role="img"
        aria-label={t("ariaMap")}
      />
      {showOverlay ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/85 px-3 text-center text-sm text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
          {overlayMessage}
        </div>
      ) : null}
      {showOpenTab && externalMapHref ? (
        <a
          href={externalMapHref}
          target="_blank"
          rel="noopener noreferrer"
          title={t("openFullMap")}
          aria-label={t("openFullMapAria")}
          className={cn(
            "pointer-events-auto absolute right-2 top-2 z-20 inline-flex size-8 items-center justify-center rounded-md border border-slate-200/95 bg-white/95 text-slate-700 shadow-sm backdrop-blur-[2px] transition-opacity",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
            "hover:border-slate-300 hover:bg-white hover:text-slate-900",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
            "dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900",
          )}
        >
          <ExternalLink className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="sr-only">{t("openFullMap")}</span>
        </a>
      ) : null}
    </div>
  );
}
