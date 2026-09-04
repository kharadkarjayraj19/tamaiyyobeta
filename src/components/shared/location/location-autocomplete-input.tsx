"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

type AutocompleteResponse = {
  success: boolean;
  data?: {
    predictions?: PlacePrediction[];
  };
};

type LocationAutocompleteInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  leadingIcon?: ReactNode;
  trailingContent?: ReactNode;
  className?: string;
  inputClassName?: string;
  minChars?: number;
};

function createSessionToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function LocationAutocompleteInput({
  value,
  onValueChange,
  placeholder,
  leadingIcon,
  trailingContent,
  className,
  inputClassName,
  minChars = 3,
}: LocationAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const debounceHandleRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string>(createSessionToken());

  const normalizedValue = useMemo(() => value.trim(), [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (normalizedValue.length < minChars) {
      setPredictions([]);
      setFetchError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    if (debounceHandleRef.current !== null) {
      window.clearTimeout(debounceHandleRef.current);
    }

    debounceHandleRef.current = window.setTimeout(async () => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const params = new URLSearchParams({
          input: normalizedValue,
          sessionToken: sessionTokenRef.current,
        });
        const response = await fetch(`/api/v1/maps/autocomplete?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const payload = (await response.json()) as AutocompleteResponse;

        if (!response.ok || !payload.success) {
          throw new Error("Unable to fetch suggestions");
        }

        setPredictions(payload.data?.predictions ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPredictions([]);
        setFetchError("Suggestions unavailable. Continue typing manually.");
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      if (debounceHandleRef.current !== null) {
        window.clearTimeout(debounceHandleRef.current);
      }
    };
  }, [isOpen, minChars, normalizedValue]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (debounceHandleRef.current !== null) {
        window.clearTimeout(debounceHandleRef.current);
      }
    };
  }, []);

  function handleSelect(prediction: PlacePrediction) {
    onValueChange(prediction.description);
    setPredictions([]);
    setFetchError(null);
    setIsOpen(false);
    sessionTokenRef.current = createSessionToken();
  }

  function handleInputChange(nextValue: string) {
    onValueChange(nextValue);
    setIsOpen(true);
    setFetchError(null);
  }

  const shouldShowDropdown =
    isOpen && (isLoading || fetchError !== null || predictions.length > 0);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-3 text-sm">
        {leadingIcon}
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder={placeholder}
          className={inputClassName}
          autoComplete="off"
        />
        {trailingContent}
      </div>

      {shouldShowDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          {isLoading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching locations...</p>
          ) : null}

          {!isLoading && fetchError ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{fetchError}</p>
          ) : null}

          {!isLoading && !fetchError && predictions.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {predictions.map((prediction) => (
                <li key={prediction.placeId}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(prediction);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-accent"
                  >
                    <p className="text-sm font-medium text-foreground">{prediction.mainText}</p>
                    {prediction.secondaryText ? (
                      <p className="text-xs text-muted-foreground">{prediction.secondaryText}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
