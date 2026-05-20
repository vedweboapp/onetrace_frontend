import { loadGoogleMaps } from "@/shared/utils/google-maps-loader.util";
import { parseGooglePlaceResult } from "@/shared/utils/google-place-parse.util";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";

const PLACE_DETAIL_FIELDS: string[] = [
  "address_components",
  "formatted_address",
  "geometry",
  "name",
  "place_id",
];

let placesServiceHost: HTMLDivElement | null = null;
let placesService: google.maps.places.PlacesService | null = null;

function getPlacesService(google: typeof window.google): google.maps.places.PlacesService {
  if (!placesServiceHost) {
    placesServiceHost = document.createElement("div");
    placesServiceHost.setAttribute("aria-hidden", "true");
    placesServiceHost.style.display = "none";
    document.body.appendChild(placesServiceHost);
  }
  if (!placesService) {
    placesService = new google.maps.places.PlacesService(placesServiceHost);
  }
  return placesService;
}

export type GooglePlacePrediction = google.maps.places.AutocompletePrediction;

export async function fetchGooglePlacePredictions(
  input: string,
  opts?: {
    countryIso?: string;
  },
): Promise<GooglePlacePrediction[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  const google = await loadGoogleMaps();
  const service = new google.maps.places.AutocompleteService();

  const request: google.maps.places.AutocompletionRequest = {
    input: q,
  };

  const iso = opts?.countryIso?.trim().toLowerCase();
  if (iso && iso.length === 2) {
    request.componentRestrictions = { country: iso };
  }

  return new Promise((resolve) => {
    service.getPlacePredictions(request, (predictions, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
        resolve([]);
        return;
      }
      resolve(predictions);
    });
  });
}

export async function fetchGooglePlaceDetails(placeId: string): Promise<PlaceSuggestion | null> {
  const id = placeId.trim();
  if (!id) return null;

  const google = await loadGoogleMaps();
  const service = getPlacesService(google);

  return new Promise((resolve) => {
    service.getDetails(
      { placeId: id, fields: PLACE_DETAIL_FIELDS },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          resolve(null);
          return;
        }
        resolve(parseGooglePlaceResult(place));
      },
    );
  });
}
