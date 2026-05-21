"use client";

import * as React from "react";
import L from "leaflet";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import type { DetailAddressParts } from "@/shared/components/layout/detail-formatted-address";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { buildGeocodeRequestSearchParams, hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";
import { cn } from "@/core/utils/http.util";

const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const DEFAULT_CENTER: L.LatLngExpression = [20.5937, 78.9629];
const MAP_ZOOM_PIN = 16;
const GEOCODE_DEBOUNCE_MS = 150;

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

export function LeafletSiteLocationMapPicker({
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
  ensureLeafletDefaultIcons();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markerRef = React.useRef<L.Marker | null>(null);
  const coordsForAddressKeyRef = React.useRef<string | null>(null);
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

  const [geocoded, setGeocoded] = React.useState<{ lat: number; lon: number } | null>(null);
  const [geoStatus, setGeoStatus] = React.useState<"idle" | "loading" | "ready" | "error" | "notfound">("idle");
  const [hint, setHint] = React.useState<string | null>(null);

  const coordsLocked =
    pinnedAddressKey === addressKey ||
    (lat != null && lon != null && coordsForAddressKeyRef.current === addressKey);

  const displayLatLon = React.useMemo(() => {
    if (coordsLocked && lat != null && lon != null) return { lat, lon };
    if (geocoded) return geocoded;
    if (lat != null && lon != null) return { lat, lon };
    return null;
  }, [coordsLocked, lat, lon, geocoded]);

  const destroyMap = React.useCallback(() => {
    markerRef.current?.remove();
    markerRef.current = null;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  const reverseGeocodeAt = React.useCallback(
    async (nextLat: number, nextLon: number) => {
      try {
        const res = await fetch(
          `/api/reverse-geocode?lat=${encodeURIComponent(String(nextLat))}&lon=${encodeURIComponent(String(nextLon))}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as { found?: boolean; place?: PlaceSuggestion };
        if (json.found && json.place) {
          onReverseGeocoded?.(json.place);
          setHint(t("addressFromPin"));
        }
      } catch {
        /* ignore */
      }
    },
    [onReverseGeocoded, t],
  );

  const placeOrMoveMarker = React.useCallback(
    (map: L.Map, nextLat: number, nextLon: number, draggable: boolean) => {
      const pos: L.LatLngExpression = [nextLat, nextLon];

      if (!markerRef.current) {
        markerRef.current = L.marker(pos, { draggable: draggable && !disabled }).addTo(map);
        markerRef.current.on("dragend", () => {
          const m = markerRef.current;
          if (!m) return;
          const ll = m.getLatLng();
          coordsForAddressKeyRef.current = addressKey;
          onCoordinatesChangeRef.current(ll.lat, ll.lng);
          setGeocoded({ lat: ll.lat, lon: ll.lng });
          void reverseGeocodeAt(ll.lat, ll.lng);
        });
      } else {
        markerRef.current.setLatLng(pos);
        if (markerRef.current.dragging) {
          if (draggable && !disabled) markerRef.current.dragging.enable();
          else markerRef.current.dragging.disable();
        }
      }

      const applyView = () => {
        map.invalidateSize();
        map.setView(pos, MAP_ZOOM_PIN, { animate: false });
      };

      map.whenReady(applyView);
      requestAnimationFrame(applyView);
    },
    [addressKey, disabled, reverseGeocodeAt],
  );

  React.useEffect(() => {
    let cancelled = false;

    if (lat != null && lon != null && coordsLocked) {
      setGeocoded(null);
      setGeoStatus("ready");
      return;
    }

    if (!canGeocode) {
      setGeocoded(null);
      setGeoStatus(lat != null && lon != null ? "ready" : "idle");
      return;
    }

    setGeoStatus("loading");
    setHint(null);

    const sp = buildGeocodeRequestSearchParams(norm);
    const tid = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?${sp.toString()}`);
        if (cancelled) return;

        if (!res.ok) {
          setGeoStatus("error");
          return;
        }

        const json = (await res.json()) as { found?: boolean; lat?: number; lon?: number };
        if (cancelled) return;

        if (json.found && json.lat != null && json.lon != null && Number.isFinite(json.lat) && Number.isFinite(json.lon)) {
          coordsForAddressKeyRef.current = addressKey;
          setGeocoded({ lat: json.lat, lon: json.lon });
          onCoordinatesChangeRef.current(json.lat, json.lon);
          setGeoStatus("ready");
          return;
        }

        setGeoStatus("notfound");
      } catch {
        if (!cancelled) setGeoStatus("error");
      }
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [addressKey, canGeocode, coordsLocked, lat, lon, norm]);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, { scrollWheelZoom: true, zoomControl: true }).setView(DEFAULT_CENTER, 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: OSM_ATTRIB,
    }).addTo(map);

    mapRef.current = map;

    if (!disabled) {
      map.on("click", (e) => {
        coordsForAddressKeyRef.current = addressKey;
        onCoordinatesChangeRef.current(e.latlng.lat, e.latlng.lng);
        setGeocoded({ lat: e.latlng.lat, lon: e.latlng.lng });
        placeOrMoveMarker(map, e.latlng.lat, e.latlng.lng, true);
        void reverseGeocodeAt(e.latlng.lat, e.latlng.lng);
      });
    }

    requestAnimationFrame(() => {
      try {
        map.invalidateSize();
      } catch {
        /* ignore */
      }
    });
  }, [addressKey, disabled, placeOrMoveMarker, reverseGeocodeAt]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!displayLatLon) {
      if (!mapRef.current) return;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current.setView(DEFAULT_CENTER, 5);
      return;
    }

    const { lat: nextLat, lon: nextLon } = displayLatLon;
    const map = mapRef.current;
    if (!map) return;

    placeOrMoveMarker(map, nextLat, nextLon, true);

    requestAnimationFrame(() => {
      try {
        map.invalidateSize();
      } catch {
        /* ignore */
      }
    });
  }, [addressKey, disabled, displayLatLon, placeOrMoveMarker, reverseGeocodeAt]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map || !displayLatLon) return;
      try {
        map.invalidateSize();
        map.setView([displayLatLon.lat, displayLatLon.lon], MAP_ZOOM_PIN, { animate: false });
      } catch {
        /* ignore */
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [displayLatLon]);

  React.useEffect(
    () => () => {
      destroyMap();
    },
    [destroyMap],
  );

  const showLoadingOverlay = geoStatus === "loading" && displayLatLon == null;

  const overlay =
    showLoadingOverlay
      ? tMap("loading")
      : geoStatus === "error"
        ? tMap("error")
        : geoStatus === "notfound" && !displayLatLon
          ? t("mapNotFoundHint")
          : lat == null && lon == null && !canGeocode
            ? t("mapPickHint")
            : null;

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
      {overlay ? (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-slate-100/50 px-4 text-center text-sm text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
          {overlay}
        </div>
      ) : null}
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
