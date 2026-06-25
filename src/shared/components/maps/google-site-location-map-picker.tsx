"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { DetailAddressParts } from "@/shared/components/layout/detail-formatted-address";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { buildGeocodeRequestSearchParams, hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";
import { loadGoogleMaps } from "@/shared/utils/google-maps-loader.util";
import { parseGoogleGeocoderResult } from "@/shared/utils/google-place-parse.util";
import { cn } from "@/core/utils/http.util";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const MAP_ZOOM_PIN = 16;
const GEOCODE_DEBOUNCE_MS = 150;

type Props = {
  latitude: number | null;
  longitude: number | null;
  addressParts: DetailAddressParts;
  onCoordinatesChange: (lat: number, lon: number) => void;
  onReverseGeocoded?: (place: PlaceSuggestion) => void;
  disabled?: boolean;
  embedded?: boolean;
  pinnedAddressKey?: string | null;
  className?: string;
};

function parseCoord(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

export function GoogleSiteLocationMapPicker({
  latitude,
  longitude,
  addressParts,
  onCoordinatesChange,
  onReverseGeocoded,
  disabled,
  embedded = false,
  pinnedAddressKey = null,
  className,
}: Props) {
  const t = useTranslations("Dashboard.sites.location");
  const tMap = useTranslations("Dashboard.common.map");

  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markerRef = React.useRef<google.maps.Marker | null>(null);
  const geocoderRef = React.useRef<google.maps.Geocoder | null>(null);
  const coordsForAddressKeyRef = React.useRef<string | null>(null);
  const addressKeyRef = React.useRef("");
  const onCoordinatesChangeRef = React.useRef(onCoordinatesChange);
  onCoordinatesChangeRef.current = onCoordinatesChange;

  const lat = parseCoord(latitude);
  const lon = parseCoord(longitude);

  const norm = React.useMemo(
    (): DetailAddressParts => ({
      line1: addressParts.line1?.trim() ?? "",
      line2: addressParts.line2?.trim() ?? "",
      city: addressParts.city?.trim() ?? "",
      state: addressParts.state?.trim() ?? "",
      pincode: addressParts.pincode?.trim() ?? "",
      country: addressParts.country?.trim() ?? "",
      countryIso: addressParts.countryIso?.trim().toUpperCase() ?? "",
    }),
    [addressParts],
  );

  const canGeocode = hasGeocodeableAddress(norm);
  const addressKey = React.useMemo(() => JSON.stringify(norm), [norm]);
  addressKeyRef.current = addressKey;

  const [geocoded, setGeocoded] = React.useState<{ lat: number; lon: number } | null>(null);
  const [geoStatus, setGeoStatus] = React.useState<"idle" | "loading" | "ready" | "error" | "notfound">("idle");
  const [hint, setHint] = React.useState<string | null>(null);
  const [mapReady, setMapReady] = React.useState(false);

  const coordsLocked =
    pinnedAddressKey === addressKey ||
    (lat != null && lon != null && coordsForAddressKeyRef.current === addressKey);

  const displayLatLon = React.useMemo(() => {
    if (coordsLocked && lat != null && lon != null) return { lat, lon };
    if (geocoded) return geocoded;
    if (lat != null && lon != null) return { lat, lon };
    return null;
  }, [coordsLocked, lat, lon, geocoded]);

  const reverseGeocodeAt = React.useCallback(
    async (nextLat: number, nextLon: number) => {
      if (!geocoderRef.current) return;
      try {
        const res = await geocoderRef.current.geocode({ location: { lat: nextLat, lng: nextLon } });
        const first = res.results?.[0];
        if (!first) return;
        const place = parseGoogleGeocoderResult(first);
        if (place) {
          onReverseGeocoded?.(place);
          setHint(t("addressFromPin"));
        }
      } catch {
        /* ignore */
      }
    },
    [onReverseGeocoded, t],
  );

  const placeOrMoveMarker = React.useCallback(
    (map: google.maps.Map, nextLat: number, nextLon: number, draggable: boolean) => {
      const pos = { lat: nextLat, lng: nextLon };

      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({
          map,
          position: pos,
          draggable: draggable && !disabled,
        });
        markerRef.current.addListener("dragend", () => {
          const m = markerRef.current;
          if (!m) return;
          const ll = m.getPosition();
          if (!ll) return;
          const next = { lat: ll.lat(), lon: ll.lng() };
          coordsForAddressKeyRef.current = addressKeyRef.current;
          onCoordinatesChangeRef.current(next.lat, next.lon);
          setGeocoded(next);
          void reverseGeocodeAt(next.lat, next.lon);
        });
      } else {
        markerRef.current.setPosition(pos);
        markerRef.current.setDraggable(draggable && !disabled);
      }

      map.setCenter(pos);
      map.setZoom(MAP_ZOOM_PIN);
    },
    [disabled, reverseGeocodeAt],
  );

  React.useEffect(() => {
    let cancelled = false;

    if (lat != null && lon != null && coordsLocked) {
      setGeocoded(null);
      setGeoStatus("ready");
      return;
    }

    if (!canGeocode || !mapReady) {
      setGeocoded(null);
      setGeoStatus(lat != null && lon != null ? "ready" : "idle");
      return;
    }

    setGeoStatus("loading");
    setHint(null);

    const sp = buildGeocodeRequestSearchParams(norm);
    const address = sp.get("q") || sp.get("q_locality") || "";
    if (!address.trim()) {
      setGeoStatus("notfound");
      return;
    }

    const tid = window.setTimeout(async () => {
      if (!geocoderRef.current) return;
      try {
        const iso = norm.countryIso?.trim().toLowerCase() ?? "";
        const componentRestrictions = iso.length === 2 ? { country: iso } : undefined;
        const res = await geocoderRef.current.geocode({
          address,
          componentRestrictions,
        });
        if (cancelled) return;
        const first = res.results?.[0];
        const loc = first?.geometry?.location;
        if (!loc) {
          setGeoStatus("notfound");
          return;
        }
        const nextLat = loc.lat();
        const nextLon = loc.lng();
        coordsForAddressKeyRef.current = addressKey;
        setGeocoded({ lat: nextLat, lon: nextLon });
        onCoordinatesChangeRef.current(nextLat, nextLon);
        setGeoStatus("ready");
      } catch {
        if (!cancelled) setGeoStatus("error");
      }
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [addressKey, canGeocode, coordsLocked, lat, lon, mapReady, norm]);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled) return;
        geocoderRef.current = new google.maps.Geocoder();
        const map = new google.maps.Map(el, {
          center: DEFAULT_CENTER,
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapRef.current = map;

        if (!disabled) {
          map.addListener("click", (e: google.maps.MapMouseEvent) => {
            const ll = e.latLng;
            if (!ll) return;
            const nextLat = ll.lat();
            const nextLon = ll.lng();
            coordsForAddressKeyRef.current = addressKeyRef.current;
            onCoordinatesChangeRef.current(nextLat, nextLon);
            setGeocoded({ lat: nextLat, lon: nextLon });
            placeOrMoveMarker(map, nextLat, nextLon, true);
            void reverseGeocodeAt(nextLat, nextLon);
          });
        }

        setMapReady(true);
      })
      .catch(() => {
        setGeoStatus("error");
      });

    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
      setMapReady(false);
    };
  }, [disabled, placeOrMoveMarker, reverseGeocodeAt]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!displayLatLon) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(5);
      return;
    }

    placeOrMoveMarker(map, displayLatLon.lat, displayLatLon.lon, true);
  }, [addressKey, disabled, displayLatLon, mapReady, placeOrMoveMarker]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map || !displayLatLon) return;
      google.maps.event.trigger(map, "resize");
      map.setCenter({ lat: displayLatLon.lat, lng: displayLatLon.lon });
      map.setZoom(MAP_ZOOM_PIN);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [displayLatLon]);

  const mapShell = (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        !embedded && "rounded-lg border border-slate-200/90 dark:border-slate-800",
      )}
    >
      <div
        ref={containerRef}
        className={cn("z-0 h-full w-full", embedded ? "min-h-[280px]" : "min-h-[280px] h-[min(420px,50vh)]")}
        aria-label={tMap("ariaMap")}
      />
    </div>
  );

  if (embedded) {
    return <div className={cn("flex h-full min-h-0 flex-col", className)}>{mapShell}</div>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("mapTitle")}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("dragPinHint")}</p>
      </div>
      {mapShell}
      {hint ? <p className="text-xs text-emerald-700 dark:text-emerald-400">{hint}</p> : null}
    </div>
  );
}
