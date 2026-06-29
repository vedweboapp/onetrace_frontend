import { importGooglePlacesLibrary } from "@/shared/utils/google-maps-loader.util";
import { parseGooglePlaceNew } from "@/shared/utils/google-place-parse.util";
import type { GooglePlacePrediction } from "@/shared/types/google-places-new.types";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";

export type { GooglePlacePrediction };

const PLACE_DETAIL_FIELDS = [
  "addressComponents",
  "formattedAddress",
  "location",
  "displayName",
  "id",
] as const;

/** Approximate bounds for biasing Indian address / pincode results. */
const INDIA_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 35.5,
  south: 6.5,
  east: 97.5,
  west: 68.0,
};

let activeSessionToken: google.maps.places.AutocompleteSessionToken | null = null;

/** True when the user is searching by postal/pin code only (e.g. 126102). */
export function isPincodeLikeQuery(input: string): boolean {
  return /^\d{4,6}$/.test(input.trim());
}

/** Indian postal codes are exactly 6 digits. */
export function isIndianPincodeQuery(input: string): boolean {
  return /^\d{6}$/.test(input.trim());
}

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  india: "in",
  "united states": "us",
  usa: "us",
  brazil: "br",
  "united kingdom": "gb",
  uk: "gb",
};

function inferCountryIsoFromName(countryName: string): string | undefined {
  const key = countryName.trim().toLowerCase();
  if (!key) return undefined;
  if (COUNTRY_NAME_TO_ISO[key]) return COUNTRY_NAME_TO_ISO[key];
  const partial = Object.entries(COUNTRY_NAME_TO_ISO).find(([name]) => key.includes(name));
  return partial?.[1];
}

function resolveCountryForPincodeSearch(opts: {
  countryIso?: string;
  contextCountry?: string;
  input: string;
}): string | undefined {
  const explicit = opts.countryIso?.trim().toLowerCase();
  if (explicit && explicit.length === 2) return explicit;

  const fromContext = opts.contextCountry
    ? inferCountryIsoFromName(opts.contextCountry)
    : undefined;
  if (fromContext) return fromContext;

  if (isIndianPincodeQuery(opts.input)) return "in";

  return undefined;
}

function enrichPincodeInput(input: string, countryIso: string): string {
  const q = input.trim();
  if (!isPincodeLikeQuery(q)) return q;
  if (countryIso === "in" && isIndianPincodeQuery(q)) return `${q}, India`;
  return q;
}

function normalizePlacePrediction(
  prediction: google.maps.places.PlacePrediction,
): GooglePlacePrediction {
  const description = prediction.text?.text?.trim() ?? "";
  const mainText = prediction.mainText?.text?.trim() ?? "";
  const secondaryText = prediction.secondaryText?.text?.trim() ?? "";

  return {
    placeId: prediction.placeId,
    description,
    structured_formatting: {
      main_text: mainText || description,
      secondary_text: secondaryText,
    },
    _placePrediction: prediction,
  };
}

function filterPredictionsByCountry(
  predictions: GooglePlacePrediction[],
  countryIso: string,
): GooglePlacePrediction[] {
  const iso = countryIso.trim().toLowerCase();
  if (!iso) return predictions;

  const countryNeedles: Record<string, string[]> = {
    in: ["india"],
    us: ["usa", "united states"],
    br: ["brazil"],
    gb: ["united kingdom", "uk"],
  };
  const needles = countryNeedles[iso];
  if (!needles?.length) return predictions;

  const filtered = predictions.filter((p) => {
    const desc = p.description.toLowerCase();
    return needles.some((n) => desc.includes(n));
  });

  return filtered.length > 0 ? filtered : predictions;
}

function getSessionToken(
  AutocompleteSessionToken: typeof google.maps.places.AutocompleteSessionToken,
): google.maps.places.AutocompleteSessionToken {
  if (!activeSessionToken) {
    activeSessionToken = new AutocompleteSessionToken();
  }
  return activeSessionToken;
}

/** Start a new billing session after the user selects a place. */
export function resetGooglePlacesAutocompleteSession(): void {
  activeSessionToken = null;
}

function buildAutocompleteRequest(
  input: string,
  countryIso: string | undefined,
  sessionToken: google.maps.places.AutocompleteSessionToken,
): google.maps.places.AutocompleteRequest {
  const request: google.maps.places.AutocompleteRequest = {
    input: countryIso ? enrichPincodeInput(input, countryIso) : input,
    sessionToken,
  };

  if (countryIso) {
    request.includedRegionCodes = [countryIso.toUpperCase()];
    request.region = countryIso;
    if (countryIso === "in") {
      // Use bounds (not circle) — circle radius is capped at 50,000 m by the API.
      request.locationBias = INDIA_BOUNDS;
    }
  }

  return request;
}

export async function fetchGooglePlacePredictions(
  input: string,
  opts?: {
    countryIso?: string;
    contextCountry?: string;
  },
): Promise<GooglePlacePrediction[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  const { AutocompleteSessionToken, AutocompleteSuggestion } =
    await importGooglePlacesLibrary();

  const pincodeQuery = isPincodeLikeQuery(q);
  const countryIso = resolveCountryForPincodeSearch({
    countryIso: opts?.countryIso,
    contextCountry: opts?.contextCountry,
    input: q,
  });

  const request = buildAutocompleteRequest(
    q,
    countryIso,
    getSessionToken(AutocompleteSessionToken),
  );

  try {
    const { suggestions } =
      await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

    const predictions = suggestions
      .map((suggestion) => suggestion.placePrediction)
      .filter((prediction): prediction is google.maps.places.PlacePrediction =>
        Boolean(prediction?.placeId),
      )
      .map(normalizePlacePrediction);

    const filtered = predictions.length
      ? filterPredictionsByCountry(predictions, countryIso ?? "")
      : [];

    console.log("[Google Places] fetchAutocompleteSuggestions response", {
      input: q,
      pincodeQuery,
      countryIso,
      request,
      count: predictions.length,
      filteredCount: filtered.length,
      predictions: predictions.map((p) => ({
        description: p.description,
        placeId: p.placeId,
        structured_formatting: p.structured_formatting,
      })),
    });

    return filtered;
  } catch (error) {
    console.error("[Google Places] fetchAutocompleteSuggestions failed", error);
    return [];
  }
}

export async function fetchGooglePlaceDetails(
  prediction: GooglePlacePrediction,
): Promise<PlaceSuggestion | null> {
  const placeId = prediction.placeId?.trim();
  if (!placeId) return null;

  const { Place } = await importGooglePlacesLibrary();

  try {
    const place = prediction._placePrediction
      ? prediction._placePrediction.toPlace()
      : new Place({ id: placeId });

    const { place: detailed } = await place.fetchFields({
      fields: [...PLACE_DETAIL_FIELDS],
    });
    const parsed = parseGooglePlaceNew(detailed);

    console.log("[Google Places] fetchFields response", {
      placeId,
      fields: PLACE_DETAIL_FIELDS,
      rawPlace: detailed,
      parsedPlaceSuggestion: parsed,
    });

    resetGooglePlacesAutocompleteSession();
    return parsed;
  } catch (error) {
    console.error("[Google Places] fetchFields failed", { placeId, error });
    resetGooglePlacesAutocompleteSession();
    return null;
  }
}
