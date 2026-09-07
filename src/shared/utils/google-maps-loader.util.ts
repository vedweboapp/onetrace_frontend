/** Loads the Google Maps JavaScript API once (client-only). */

declare global {
  interface Window {
    __onetraceGoogleMapsInit?: () => void;
  }
}

let loadPromise: Promise<typeof google> | null = null;
let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;

export function getGoogleMapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

/** Map ID required for AdvancedMarkerElement. Falls back to Google demo id. */
export function getGoogleMapsMapId(): string {
  const id = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim();
  return id && id.length > 0 ? id : "DEMO_MAP_ID";
}

export function isGoogleMapsEnabled(): boolean {
  return getGoogleMapsApiKey() != null;
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("google_maps_ssr"));
  }

  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google);
  }

  if (loadPromise) return loadPromise;

  const key = getGoogleMapsApiKey();
  if (!key) {
    return Promise.reject(new Error("google_maps_no_key"));
  }

  loadPromise = new Promise((resolve, reject) => {
    const scriptId = "onetrace-google-maps-js";

    const finish = () => {
      if (window.google?.maps?.Map) resolve(window.google);
      else reject(new Error("google_maps_unavailable"));
    };

    const existing = document.getElementById(scriptId);
    if (existing) {
      window.__onetraceGoogleMapsInit = finish;
      const poll = window.setInterval(() => {
        if (window.google?.maps?.Map) {
          window.clearInterval(poll);
          finish();
        }
      }, 50);
      window.setTimeout(() => window.clearInterval(poll), 15000);
      return;
    }

    window.__onetraceGoogleMapsInit = () => {
      finish();
    };

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=places,marker&v=weekly&callback=__onetraceGoogleMapsInit`;
    script.onerror = () => reject(new Error("google_maps_script_failed"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Loads Places API (New) via dynamic importLibrary. */
export async function importGooglePlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  const google = await loadGoogleMaps();
  if (!placesLibraryPromise) {
    placesLibraryPromise = google.maps.importLibrary("places");
  }
  return placesLibraryPromise;
}
