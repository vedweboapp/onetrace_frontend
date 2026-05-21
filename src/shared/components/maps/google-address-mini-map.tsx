"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DetailAddressParts } from "@/shared/components/layout/detail-formatted-address";
import { buildGeocodeRequestSearchParams, hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";
import { loadGoogleMaps } from "@/shared/utils/google-maps-loader.util";
import { cn } from "@/core/utils/http.util";

function googleMapsTabUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

type Props = {
  addressParts: DetailAddressParts | null | undefined;
  coordinates?: { lat: number; lon: number } | null;
  className?: string;
  mapClassName?: string;
};

export function GoogleAddressMiniMap({ addressParts, coordinates, className, mapClassName }: Props) {
  const t = useTranslations("Dashboard.common.map");

  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markerRef = React.useRef<google.maps.Marker | null>(null);
  const geocoderRef = React.useRef<google.maps.Geocoder | null>(null);

  const norm = React.useMemo(
    () => ({
      line1: addressParts?.line1?.trim() ?? "",
      line2: addressParts?.line2?.trim() ?? "",
      city: addressParts?.city?.trim() ?? "",
      state: addressParts?.state?.trim() ?? "",
      pincode: addressParts?.pincode?.trim() ?? "",
      country: addressParts?.country?.trim() ?? "",
      countryIso: addressParts?.countryIso?.trim().toUpperCase() ?? "",
    }),
    [addressParts],
  );

  const canGeocode = hasGeocodeableAddress(norm);
  const requestKey = React.useMemo(() => JSON.stringify(norm), [norm]);

  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "notfound" | "error">("idle");
  const [latLon, setLatLon] = React.useState<{ lat: number; lon: number } | null>(null);
  const [mapReady, setMapReady] = React.useState(false);

  const fixedLat = coordinates?.lat;
  const fixedLon = coordinates?.lon;
  const hasFixedCoords =
    fixedLat != null && fixedLon != null && Number.isFinite(fixedLat) && Number.isFinite(fixedLon);

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
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
      setMapReady(false);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    if (hasFixedCoords) {
      setLatLon({ lat: fixedLat!, lon: fixedLon! });
      setStatus("ready");
      return;
    }

    if (!canGeocode || !mapReady || !geocoderRef.current) {
      setLatLon(null);
      setStatus(canGeocode ? "loading" : "idle");
      return;
    }

    setStatus("loading");
    setLatLon(null);

    const qs = buildGeocodeRequestSearchParams(norm);
    const address = qs.get("q") || qs.get("q_locality") || "";
    const iso = norm.countryIso?.trim().toLowerCase() ?? "";

    const tid = window.setTimeout(async () => {
      try {
        const res = await geocoderRef.current!.geocode({
          address,
          componentRestrictions: iso.length === 2 ? { country: iso } : undefined,
        });
        if (cancelled) return;
        const loc = res.results?.[0]?.geometry?.location;
        if (!loc) {
          setStatus("notfound");
          return;
        }
        setLatLon({ lat: loc.lat(), lon: loc.lng() });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [requestKey, canGeocode, mapReady, hasFixedCoords, fixedLat, fixedLon, norm]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !latLon) return;

    const pos = { lat: latLon.lat, lng: latLon.lon };
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({ map, position: pos });
    } else {
      markerRef.current.setPosition(pos);
      markerRef.current.setMap(map);
    }
    map.setCenter(pos);
    map.setZoom(16);
    google.maps.event.trigger(map, "resize");
  }, [status, latLon]);

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
  const externalMapHref = latLon ? googleMapsTabUrl(latLon.lat, latLon.lon) : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-slate-200/90 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50",
        className,
      )}
    >
      <div
        ref={containerRef}
        className={cn("z-0 min-h-[200px] w-full flex-1 basis-0", mapClassName)}
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
