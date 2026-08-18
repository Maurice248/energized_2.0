export const CANADA_CENTER = { lat: 56.1304, lng: -106.3468 } as const;
export const CANADA_ZOOM = 4;
export const PLACE_ZOOM = 15;
export const DEMO_MAP_ID = "DEMO_MAP_ID";

export type PlaceAddressFields = {
  formattedAddress?: string | null;
  displayName?: string | { text?: string | null } | null;
};

export function getGoogleMapsApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function getGoogleMapsMapId(): string {
  const id = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim();
  return id && id.length > 0 ? id : DEMO_MAP_ID;
}

declare global {
  interface Window {
    __energizedGoogleMapsReady?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;

function isMapsReady(): boolean {
  return Boolean(
    window.google?.maps?.Map &&
      window.google.maps.Geocoder &&
      window.google.maps.places?.Place &&
      window.google.maps.places.AutocompleteSuggestion &&
      window.google.maps.marker?.AdvancedMarkerElement,
  );
}

function loadMapsScript(key: string): Promise<void> {
  if (typeof window.google?.maps?.importLibrary === "function") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    window.__energizedGoogleMapsReady = () => resolve();

    const existing = document.getElementById("energized-google-maps");
    if (existing) {
      if (typeof window.google?.maps?.importLibrary === "function") {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "energized-google-maps";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__energizedGoogleMapsReady`;
    script.async = true;
    script.onerror = () => {
      reject(new Error("Failed to load the Google Maps script."));
    };
    document.head.appendChild(script);
  });
}

export async function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Google Maps is only available in the browser.");
  }
  if (isMapsReady()) return;
  if (loadPromise) {
    await loadPromise;
    return;
  }

  const key = getGoogleMapsApiKey();
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  }

  loadPromise = (async () => {
    try {
      await loadMapsScript(key);
      const importLibrary = google.maps.importLibrary;
      if (!importLibrary) {
        throw new Error("Google Maps loaded without importLibrary.");
      }
      await Promise.all([
        importLibrary("maps"),
        importLibrary("places"),
        importLibrary("marker"),
        importLibrary("geocoding"),
      ]);
      if (!isMapsReady()) {
        throw new Error("Google Maps loaded without Places, Marker, or Geocoding.");
      }
    } catch (err) {
      loadPromise = null;
      throw err;
    }
  })();

  await loadPromise;
}

export function toLatLng(
  position: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitudeLiteral,
): google.maps.LatLng {
  if (position instanceof google.maps.LatLng) return position;
  return new google.maps.LatLng(position.lat, position.lng);
}

export async function fetchAddressSuggestions(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
): Promise<
  Array<{
    prediction: google.maps.places.PlacePrediction;
    placeId: string;
    label: string;
    secondary?: string;
  }>
> {
  const { suggestions } =
    await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken,
      includedRegionCodes: ["ca"],
      language: "en-CA",
      region: "ca",
    });

  const results: Array<{
    prediction: google.maps.places.PlacePrediction;
    placeId: string;
    label: string;
    secondary?: string;
  }> = [];

  for (const suggestion of suggestions) {
    const prediction = suggestion.placePrediction;
    if (!prediction?.placeId) continue;
    const secondary = prediction.secondaryText?.toString().trim();
    results.push({
      prediction,
      placeId: prediction.placeId,
      label: prediction.mainText?.toString() ?? prediction.text.toString(),
      secondary: secondary && secondary.length > 0 ? secondary : undefined,
    });
    if (results.length >= 6) break;
  }

  return results;
}

export function formatGeocoderAddress(
  result: google.maps.GeocoderResult,
): string {
  const formatted = result.formatted_address?.trim();
  if (formatted) return stripTrailingCountry(formatted);

  const city = component(result, "locality") ?? component(result, "postal_town");
  const region =
    component(result, "administrative_area_level_1", "short_name") ??
    component(result, "administrative_area_level_1");
  const parts = [city, region].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "";
}

export function formatPlaceAddress(place: PlaceAddressFields): string {
  const formatted = place.formattedAddress?.trim();
  if (formatted) return stripTrailingCountry(formatted);
  const name =
    typeof place.displayName === "string"
      ? place.displayName
      : place.displayName?.text;
  return name?.trim() ?? "";
}

function stripTrailingCountry(address: string): string {
  return address.replace(/,?\s*Canada\.?$/i, "").trim();
}

function component(
  result: google.maps.GeocoderResult,
  type: string,
  key: "long_name" | "short_name" = "long_name",
): string | undefined {
  const match = result.address_components.find((c) => c.types.includes(type));
  const value = match?.[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}
