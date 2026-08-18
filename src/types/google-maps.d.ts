export {};

declare global {
  namespace google.maps {
    type MapsEventListener = { remove: () => void };

    let importLibrary:
      | ((
          name: "maps" | "places" | "marker" | "geocoding" | "core" | string,
        ) => Promise<unknown>)
      | undefined;

    namespace event {
      function addListener(
        instance: object,
        eventName: string,
        handler: (...args: never[]) => void,
      ): MapsEventListener;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    type LatLngLiteral = { lat: number; lng: number };
    type LatLngAltitudeLiteral = LatLngLiteral & { altitude?: number };
    type LatLngOrLiteral = LatLng | LatLngLiteral;

    class Map {
      constructor(el: HTMLElement, opts?: MapOptions);
      panTo(latLng: LatLngOrLiteral): void;
      setZoom(zoom: number): void;
      getZoom(): number | undefined;
      addListener(
        eventName: string,
        handler: (event: MapMouseEvent) => void,
      ): MapsEventListener;
    }

    interface MapOptions {
      center?: LatLngOrLiteral;
      zoom?: number;
      mapId?: string;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      clickableIcons?: boolean;
      gestureHandling?: string;
    }

    interface MapMouseEvent {
      latLng: LatLng | null;
    }

    class Geocoder {
      geocode(
        request: GeocoderRequest,
        callback?: (
          results: GeocoderResult[] | null,
          status: GeocoderStatus,
        ) => void,
      ): Promise<{ results: GeocoderResult[] }>;
    }

    type GeocoderStatus = string;

    interface GeocoderRequest {
      address?: string;
      location?: LatLngOrLiteral;
      componentRestrictions?: { country: string };
    }

    interface GeocoderResult {
      formatted_address: string;
      address_components: GeocoderAddressComponent[];
      geometry: { location: LatLng };
      place_id: string;
      types: string[];
    }

    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    namespace marker {
      class AdvancedMarkerElement {
        constructor(opts?: AdvancedMarkerElementOptions);
        map: Map | null;
        position:
          | LatLng
          | LatLngLiteral
          | LatLngAltitudeLiteral
          | null;
        title: string;
        addListener(eventName: string, handler: () => void): MapsEventListener;
      }

      interface AdvancedMarkerElementOptions {
        map?: Map | null;
        position?: LatLngOrLiteral | LatLngAltitudeLiteral | null;
        title?: string;
        gmpDraggable?: boolean;
      }
    }

    namespace places {
      class AutocompleteSessionToken {
        constructor();
      }

      class AutocompleteSuggestion {
        placePrediction?: PlacePrediction;
        static fetchAutocompleteSuggestions(
          request: AutocompleteRequest,
        ): Promise<{ suggestions: AutocompleteSuggestion[] }>;
      }

      interface AutocompleteRequest {
        input: string;
        sessionToken?: AutocompleteSessionToken;
        includedRegionCodes?: string[];
        includedPrimaryTypes?: string[];
        language?: string;
        region?: string;
      }

      class PlacePrediction {
        placeId: string;
        text: FormattedText;
        mainText?: FormattedText;
        secondaryText?: FormattedText;
        toPlace(): Place;
      }

      interface FormattedText {
        text: string;
        toString(): string;
      }

      class Place {
        constructor(opts: { id: string });
        id: string;
        formattedAddress?: string | null;
        displayName?: string | { text?: string | null } | null;
        location?: LatLng | null;
        fetchFields(opts: { fields: string[] }): Promise<{ place: Place }>;
      }
    }
  }

  interface Window {
    google?: { maps: typeof google.maps };
  }
}
