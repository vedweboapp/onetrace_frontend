/** Normalized autocomplete row for UI (maps Places API New → legacy-shaped fields). */
export type GooglePlacePrediction = {
  placeId: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  /** Retains session context for {@link google.maps.places.PlacePrediction.toPlace}. */
  _placePrediction?: google.maps.places.PlacePrediction;
};
