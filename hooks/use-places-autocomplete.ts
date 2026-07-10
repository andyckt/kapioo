"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseGooglePlaceToAddress } from "@/lib/address/parse-google-place";
import type { GooglePlaceLike, ParsedGoogleAddress } from "@/lib/address/types";

type PlacesSuggestion = {
  id: string;
  mainText: string;
  secondaryText: string;
  prediction: unknown;
};

type AutocompleteSuggestionLike = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    mainText?: { text?: string };
    secondaryText?: { text?: string };
    toPlace?: () => {
      fetchFields?: (options: { fields: string[] }) => Promise<void>;
      id?: string;
      formattedAddress?: string;
      location?: { lat?: number | (() => number); lng?: number | (() => number) };
      addressComponents?: GooglePlaceLike["addressComponents"];
    };
  };
};

type PlacesLibraryLike = {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      includedRegionCodes?: string[];
      sessionToken?: unknown;
    }) => Promise<{ suggestions?: AutocompleteSuggestionLike[] }>;
  };
};

let placesLibraryPromise: Promise<PlacesLibraryLike> | null = null;
let mapsOptionsConfigured = false;

function loadPlacesLibrary() {
  if (placesLibraryPromise) {
    return placesLibraryPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    placesLibraryPromise = Promise.reject(new Error("Google Maps API key is not configured"));
    return placesLibraryPromise;
  }

  if (!mapsOptionsConfigured) {
    setOptions({
      key: apiKey,
      v: "weekly",
    });
    mapsOptionsConfigured = true;
  }

  placesLibraryPromise = importLibrary("places") as Promise<PlacesLibraryLike>;
  return placesLibraryPromise;
}

function splitPredictionText(text: string) {
  const [main, ...rest] = text.split(",");
  return {
    mainText: main?.trim() || text,
    secondaryText: rest.join(",").trim(),
  };
}

function mapSuggestion(suggestion: AutocompleteSuggestionLike, index: number): PlacesSuggestion | null {
  const prediction = suggestion.placePrediction;
  if (!prediction) return null;

  const fullText = prediction.text?.text || "";
  const fallback = splitPredictionText(fullText);

  return {
    id: prediction.placeId || `${fullText}-${index}`,
    mainText: prediction.mainText?.text || fallback.mainText,
    secondaryText: prediction.secondaryText?.text || fallback.secondaryText,
    prediction,
  };
}

export function usePlacesAutocomplete(input: string) {
  const [suggestions, setSuggestions] = useState<PlacesSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualRetryKey, setManualRetryKey] = useState(0);
  const sessionTokenRef = useRef<unknown>(null);

  const trimmedInput = input.trim();

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  const retry = useCallback(() => {
    placesLibraryPromise = null;
    sessionTokenRef.current = null;
    setError(null);
    setManualRetryKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (trimmedInput.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const places = await loadPlacesLibrary();
        if (controller.signal.aborted) return;

        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new places.AutocompleteSessionToken();
        }

        const result = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmedInput,
          includedRegionCodes: ["ca"],
          sessionToken: sessionTokenRef.current,
        });
        if (controller.signal.aborted) return;

        setSuggestions(
          (result.suggestions || [])
            .map(mapSuggestion)
            .filter((suggestion): suggestion is PlacesSuggestion => Boolean(suggestion))
        );
        setError(null);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load address suggestions");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [manualRetryKey, trimmedInput]);

  const selectSuggestion = useCallback(
    async (suggestion: PlacesSuggestion): Promise<ParsedGoogleAddress> => {
      const prediction = suggestion.prediction as NonNullable<AutocompleteSuggestionLike["placePrediction"]>;
      const place = prediction.toPlace?.();
      if (!place?.fetchFields) {
        throw new Error("Google returned an incomplete place result");
      }

      await place.fetchFields({
        fields: ["id", "location", "formattedAddress", "addressComponents"],
      });

      resetSession();
      return parseGooglePlaceToAddress(place);
    },
    [resetSession]
  );

  return useMemo(
    () => ({
      suggestions,
      isLoading,
      error,
      retry,
      resetSession,
      selectSuggestion,
    }),
    [error, isLoading, resetSession, retry, selectSuggestion, suggestions]
  );
}
