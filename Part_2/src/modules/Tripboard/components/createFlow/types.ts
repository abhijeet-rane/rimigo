// src/modules/Tripboard/components/createFlow/types.ts

export type WizardStep = 'where' | 'when' | 'who' | 'how';

/**
 * Frames within the Where step. The first two are sub-tabs with a visible
 * tab bar; 'cities-question' replaces the tab bar with a journey strip
 * and asks the user whether they want to pick cities themselves.
 */
export type WhereSubTab =
  | 'destination'
  | 'departure-city'
  | 'cities-question'
  | 'select-cities'
  | 'select-route';

export interface SelectedCountry {
  /** Backend country_id (string UUID). Used as the stable key. */
  id: string;
  /** Display name (may differ from country_match for curated items like Bali). */
  name: string;
  /** flag_icon_url from backend, or a fallback URL/emoji. */
  flag: string;
  /** Origin of the selection for analytics. */
  source: 'popular' | 'regional' | 'search';
}

/**
 * A city the user has added to their route on the select-cities frame.
 * `nights` is `null` until the user explicitly commits a count by pressing
 * the "+" button on the route row (then it floors at 1 and increments from
 * there). The route UI renders `null` as "-". `geoLocation` mirrors the
 * legacy CityRouteItem shape and is populated once the city has been
 * geocoded; downstream pipelines (Step 1 route distance / transport_brief)
 * depend on it.
 */
export interface SelectedCity {
  /** Backend city_id. Used as the stable key. */
  id: string;
  /** Display name. */
  name: string;
  /** Nights allocated to this city (≥ 1 once committed, `null` until the
   *  user presses "+" for the first time). */
  nights: number | null;
  /** Mapbox-resolved coordinates. Optional until geocoding resolves. */
  geoLocation?: { lat: number; lng: number };
}
