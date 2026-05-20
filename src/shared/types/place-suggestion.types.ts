/** Parsed place row from Nominatim (search or reverse). */
export type PlaceSuggestion = {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  stateIso: string;
  country: string;
  countryIso: string;
  pincode: string;
  lat: number;
  lon: number;
};
