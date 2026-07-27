/** Shared Google Maps marker helpers (AdvancedMarkerElement). */

import { getGoogleMapsMapId, loadGoogleMaps } from "@/shared/utils/google-maps-loader.util";

export type GoogleAdvancedMarker = google.maps.marker.AdvancedMarkerElement;

export async function createGoogleMap(
  el: HTMLElement,
  options: Omit<google.maps.MapOptions, "mapId"> & { mapId?: string } = {},
): Promise<{ google: typeof google; map: google.maps.Map }> {
  const g = await loadGoogleMaps();
  await g.maps.importLibrary("maps");
  await g.maps.importLibrary("marker");
  const map = new g.maps.Map(el, {
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    scrollwheel: false,
    ...options,
    mapId: options.mapId?.trim() || getGoogleMapsMapId(),
  });
  return { google: g, map };
}

export function createAdvancedMarker(options: {
  map: google.maps.Map;
  lat: number;
  lng: number;
  title?: string;
  draggable?: boolean;
}): GoogleAdvancedMarker {
  return new google.maps.marker.AdvancedMarkerElement({
    map: options.map,
    position: { lat: options.lat, lng: options.lng },
    title: options.title,
    gmpDraggable: options.draggable === true,
  });
}

export function readAdvancedMarkerLatLng(
  marker: GoogleAdvancedMarker,
): { lat: number; lng: number } | null {
  const pos = marker.position;
  if (!pos) return null;
  const lat = typeof pos.lat === "function" ? pos.lat() : Number(pos.lat);
  const lng = typeof pos.lng === "function" ? pos.lng() : Number(pos.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function setAdvancedMarkerPosition(marker: GoogleAdvancedMarker, lat: number, lng: number) {
  marker.position = { lat, lng };
}

export function clearAdvancedMarker(marker: GoogleAdvancedMarker | null | undefined) {
  if (!marker) return;
  marker.map = null;
}
