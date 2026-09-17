/** Shared helpers to avoid Google/Leaflet fitBounds zooming out to a tiled world map. */

export type MapLatLng = { lat: number; lon: number };

const MIN_ZOOM = 3;
const MAX_FIT_ZOOM = 15;
/** Spans wider than this usually mean bad/outliers or multi-continent data — don't show the whole world. */
const MAX_LAT_SPAN = 55;
const MAX_LNG_SPAN = 90;

export function isPlausibleMapCoordinate(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -85 || lat > 85 || lon < -180 || lon > 180) return false;
  // Bare 0,0 is almost always missing data, not a real job site.
  if (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001) return false;
  return true;
}

function averageCenter(pins: MapLatLng[]): MapLatLng {
  const lat = pins.reduce((sum, p) => sum + p.lat, 0) / pins.length;
  const lon = pins.reduce((sum, p) => sum + p.lon, 0) / pins.length;
  return { lat, lon };
}

/**
 * Fit a Google map to pins without zooming out so far that the world tiles horizontally.
 */
export function fitGoogleMapToPins(map: google.maps.Map, pins: MapLatLng[]): void {
  const usable = pins.filter((p) => isPlausibleMapCoordinate(p.lat, p.lon));
  if (usable.length === 0) {
    map.setCenter({ lat: 20.5937, lng: 78.9629 });
    map.setZoom(4);
    return;
  }
  if (usable.length === 1) {
    map.setCenter({ lat: usable[0]!.lat, lng: usable[0]!.lon });
    map.setZoom(14);
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  for (const pin of usable) bounds.extend({ lat: pin.lat, lng: pin.lon });
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const latSpan = Math.abs(ne.lat() - sw.lat());
  const lngSpan = Math.abs(ne.lng() - sw.lng());

  if (latSpan > MAX_LAT_SPAN || lngSpan > MAX_LNG_SPAN) {
    const center = averageCenter(usable);
    map.setCenter({ lat: center.lat, lng: center.lon });
    map.setZoom(4);
    return;
  }

  map.fitBounds(bounds, 56);
  google.maps.event.addListenerOnce(map, "idle", () => {
    const zoom = map.getZoom();
    if (zoom == null) return;
    if (zoom < MIN_ZOOM) map.setZoom(MIN_ZOOM);
    else if (zoom > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
  });
}

/**
 * Fit a Leaflet map to pins without zooming out to a repeated world view.
 */
export function fitLeafletMapToPins(
  map: {
    setView: (center: [number, number], zoom: number) => unknown;
    // Leaflet FitBoundsOptions — keep loose so L.Map assigns cleanly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fitBounds: (bounds: any, options?: any) => unknown;
  },
  createBounds: () => {
    extend: (latLng: [number, number]) => unknown;
    isValid: () => boolean;
    getNorth: () => number;
    getSouth: () => number;
    getEast: () => number;
    getWest: () => number;
  },
  pins: MapLatLng[],
): void {
  const usable = pins.filter((p) => isPlausibleMapCoordinate(p.lat, p.lon));
  if (usable.length === 0) {
    map.setView([20.5937, 78.9629], 4);
    return;
  }
  if (usable.length === 1) {
    map.setView([usable[0]!.lat, usable[0]!.lon], 14);
    return;
  }

  const bounds = createBounds();
  for (const pin of usable) bounds.extend([pin.lat, pin.lon]);
  if (!bounds.isValid()) {
    map.setView([20.5937, 78.9629], 4);
    return;
  }

  const latSpan = Math.abs(bounds.getNorth() - bounds.getSouth());
  const lngSpan = Math.abs(bounds.getEast() - bounds.getWest());
  if (latSpan > MAX_LAT_SPAN || lngSpan > MAX_LNG_SPAN) {
    const center = averageCenter(usable);
    map.setView([center.lat, center.lon], 4);
    return;
  }

  map.fitBounds(bounds, { padding: [48, 48], maxZoom: MAX_FIT_ZOOM });
}
