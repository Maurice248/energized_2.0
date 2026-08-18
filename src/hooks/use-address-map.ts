"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CANADA_CENTER,
  CANADA_ZOOM,
  PLACE_ZOOM,
  fetchAddressSuggestions,
  formatGeocoderAddress,
  formatPlaceAddress,
  getGoogleMapsApiKey,
  getGoogleMapsMapId,
  loadGoogleMaps,
  toLatLng,
} from "@/lib/google-maps";

export type AddressPrediction = {
  placeId: string;
  label: string;
  secondary?: string;
};

export function useAddressMap({
  open,
  value,
}: {
  open: boolean;
  value: string;
}) {
  const [query, setQuery] = useState(value);
  const [selected, setSelected] = useState(value);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const predictionsByIdRef = useRef(
    new Map<string, google.maps.places.PlacePrediction>(),
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const skipPredictRef = useRef(false);
  const markerDragListenerRef = useRef<google.maps.MapsEventListener | null>(
    null,
  );

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevValue, setPrevValue] = useState(value);
  if (open !== prevOpen || (open && value !== prevValue)) {
    setPrevOpen(open);
    setPrevValue(value);
    if (open) {
      setQuery(value);
      setSelected(value);
      setPredictions([]);
      setStatus(null);
      setReady(false);
    }
  }

  const applyAddress = useCallback((address: string) => {
    skipPredictRef.current = true;
    setQuery(address);
    setSelected(address);
    setPredictions([]);
    setStatus(null);
  }, []);

  const reverseGeocode = useCallback(
    (latLng: google.maps.LatLng) => {
      if (!geocoderRef.current) return;
      setStatus("Finding address…");
      geocoderRef.current.geocode({ location: latLng }, (results, geoStatus) => {
        const first = geoStatus === "OK" ? results?.[0] : undefined;
        if (!first) {
          setStatus("No address found for that pin.");
          return;
        }
        applyAddress(formatGeocoderAddress(first));
      });
    },
    [applyAddress],
  );

  const setPin = useCallback(
    (latLng: google.maps.LatLng, zoom?: number) => {
      const map = mapRef.current;
      if (!map) return;
      map.panTo(latLng);
      if (zoom != null) map.setZoom(zoom);
      if (markerRef.current) {
        markerRef.current.position = latLng;
        return;
      }
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: latLng,
        gmpDraggable: true,
        title: "Selected location",
      });
      markerDragListenerRef.current = marker.addListener("dragend", () => {
        const pos = markerRef.current?.position;
        if (pos) reverseGeocode(toLatLng(pos));
      });
      markerRef.current = marker;
    },
    [reverseGeocode],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const listeners: google.maps.MapsEventListener[] = [];

    const boot = async () => {
      if (!getGoogleMapsApiKey()) {
        setStatus(
          "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local, then restart the app.",
        );
        return;
      }
      try {
        await loadGoogleMaps();
      } catch (err) {
        if (!cancelled) {
          setStatus(
            err instanceof Error ? err.message : "Could not load Google Maps.",
          );
        }
        return;
      }
      if (cancelled || !mapElRef.current) return;

      const map = new google.maps.Map(mapElRef.current, {
        center: CANADA_CENTER,
        zoom: CANADA_ZOOM,
        mapId: getGoogleMapsMapId(),
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();
      sessionTokenRef.current =
        new google.maps.places.AutocompleteSessionToken();

      listeners.push(
        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          setPin(event.latLng, Math.max(map.getZoom() ?? PLACE_ZOOM, 12));
          reverseGeocode(event.latLng);
        }),
      );

      if (value.trim()) {
        geocoderRef.current.geocode(
          {
            address: value.trim(),
            componentRestrictions: { country: "ca" },
          },
          (results) => {
            const loc = results?.[0]?.geometry.location;
            if (loc && !cancelled) setPin(loc, PLACE_ZOOM);
          },
        );
      }

      if (!cancelled) setReady(true);
    };

    void boot();

    return () => {
      cancelled = true;
      for (const listener of listeners) listener.remove();
      markerDragListenerRef.current?.remove();
      markerDragListenerRef.current = null;
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
      sessionTokenRef.current = null;
      predictionsByIdRef.current.clear();
    };
  }, [open, reverseGeocode, setPin, value]);

  useEffect(() => {
    if (!open || !ready) return;
    const q = query.trim();
    if (skipPredictRef.current) {
      skipPredictRef.current = false;
      return;
    }
    const sessionToken = sessionTokenRef.current;
    if (q.length < 2 || !sessionToken) {
      setPredictions([]);
      predictionsByIdRef.current.clear();
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      void fetchAddressSuggestions(q, sessionToken)
        .then((items) => {
          if (cancelled) return;
          const byId = new Map<string, google.maps.places.PlacePrediction>();
          const next: AddressPrediction[] = [];
          for (const item of items) {
            byId.set(item.placeId, item.prediction);
            next.push({
              placeId: item.placeId,
              label: item.label,
              secondary: item.secondary,
            });
          }
          predictionsByIdRef.current = byId;
          setPredictions(next);
        })
        .catch(() => {
          if (cancelled) return;
          predictionsByIdRef.current.clear();
          setPredictions([]);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, ready]);

  const pickPrediction = (prediction: AddressPrediction) => {
    const placePrediction = predictionsByIdRef.current.get(prediction.placeId);
    if (!placePrediction) return;
    setPredictions([]);
    setStatus("Moving the map…");
    void (async () => {
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ["formattedAddress", "location", "displayName"],
        });
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
        if (!place.location) {
          setStatus("Could not open that place. Try another result.");
          return;
        }
        applyAddress(formatPlaceAddress(place));
        setPin(place.location, PLACE_ZOOM);
      } catch {
        setStatus("Could not open that place. Try another result.");
      }
    })();
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setStatus("This browser cannot share your location.");
      return;
    }
    setStatus("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng = new google.maps.LatLng(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        setPin(latLng, PLACE_ZOOM);
        reverseGeocode(latLng);
      },
      () => setStatus("Location permission was denied."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const searchAndPan = (address: string) => {
    if (!geocoderRef.current || !address.trim()) return;
    setStatus("Moving the map…");
    geocoderRef.current.geocode(
      {
        address: address.trim(),
        componentRestrictions: { country: "ca" },
      },
      (results, geoStatus) => {
        const loc =
          geoStatus === "OK" ? results?.[0]?.geometry.location : undefined;
        if (!loc) {
          setStatus(
            "No map result for that search. You can still use it as typed.",
          );
          return;
        }
        applyAddress(
          results?.[0]
            ? formatGeocoderAddress(results[0])
            : address.trim(),
        );
        setPin(loc, PLACE_ZOOM);
      },
    );
  };

  return {
    query,
    setQuery,
    selected,
    setSelected,
    predictions,
    status,
    mapElRef,
    searchRef,
    pickPrediction,
    useMyLocation,
    searchAndPan,
  };
}
