"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type QuoteLineItem = {
  lineType: string;
  description: string;
  amount: string;
};

type QuoteResponse = {
  estimatedTotal: string;
  includedKmPerDay: number;
  includedDays: number;
  totalIncludedKm: number;
  billableKm: number;
  perKmRate: string;
  operationalBundleAmount: string;
  routeDistanceKm: number | null;
  returnDistanceKm: number | null;
  usableDistanceKm: number | null;
  dispatchHubCity: string | null;
  lineItems: QuoteLineItem[];
};

type BookingResponse = {
  booking: {
    bookingRef: string;
    status: string;
  };
};

type CategoryOption =
  | "SEDAN"
  | "ERTIGA"
  | "KIA_CARENS"
  | "INNOVA_CRYSTA"
  | "TEMPO_TRAVELLER";
type AgeBucketOption = "ZERO_TO_THREE" | "THREE_TO_SEVEN" | "SEVEN_TO_TWELVE";
type ProductTypeOption = "ONE_WAY" | "MULTI_CITY" | "ROUND_TRIP";
type OperationalOption = "SELF_PAY" | "ALL_INCLUSIVE";

type ClayIconName =
  | "route"
  | "return"
  | "rate"
  | "wallet"
  | "platform-fee"
  | "halting"
  | "surge"
  | "duration"
  | "included-km"
  | "ac"
  | "passengers"
  | "fuel"
  | "rating"
  | "verified"
  | "cancellation"
  | "reservation";

const DESTINATION_SEPARATOR = "|||";
const RESERVE_TOKEN_AMOUNT = 499;

type FormState = {
  sourceCity: string;
  destinationCity: string;
  pickupLocation: string;
  destinationStops: string;
  tripStartDate: string;
  tripEndDate: string;
  category: CategoryOption;
  ageBucket: AgeBucketOption;
  productType: ProductTypeOption;
  estimatedKm: string;
  returnDistanceKm: string;
};

const defaultFormState: FormState = {
  sourceCity: "",
  destinationCity: "",
  pickupLocation: "",
  destinationStops: "",
  tripStartDate: "",
  tripEndDate: "",
  category: "SEDAN",
  ageBucket: "ZERO_TO_THREE",
  productType: "ROUND_TRIP",
  estimatedKm: "",
  returnDistanceKm: "",
};

type VehiclePreset = {
  id: string;
  label: string;
  apiCategory: CategoryOption;
  capacity: string;
  fuelTags: string[];
  cardImageUrl: string;
  cardImageAlt: string;
};

type VehicleQuoteResult = {
  preset: VehiclePreset;
  quote: QuoteResponse | null;
  error: string | null;
};

type CreateBookingOptions = {
  quoteReturnUrl?: string;
};

const VEHICLE_PRESETS: VehiclePreset[] = [
  {
    id: "sedan",
    label: "Sedan - Dzire or Aura",
    apiCategory: "SEDAN",
    capacity: "4 passengers",
    fuelTags: ["CNG+Petrol"],
    cardImageUrl:
      "https://res.cloudinary.com/m19yxquu/image/upload/v1788501874/tamayo_dzir-50kb.jpg",
    cardImageAlt: "Sedan cab",
  },
  {
    id: "ertiga",
    label: "Ertiga or Rumion",
    apiCategory: "ERTIGA",
    capacity: "6 passengers",
    fuelTags: ["CNG+Petrol"],
    cardImageUrl:
      "https://res.cloudinary.com/m19yxquu/image/upload/v1788501874/tamayo_ertig-50kb.jpg",
    cardImageAlt: "Ertiga or Rumion cab",
  },
  {
    id: "carens",
    label: "Kia Carens",
    apiCategory: "KIA_CARENS",
    capacity: "6 passengers",
    fuelTags: ["Diesel"],
    cardImageUrl:
      "https://res.cloudinary.com/m19yxquu/image/upload/v1788501875/tamayo_ki-50kb.jpg",
    cardImageAlt: "Kia Carens cab",
  },
  {
    id: "innova",
    label: "Innova Crysta",
    apiCategory: "INNOVA_CRYSTA",
    capacity: "7 passengers",
    fuelTags: ["Diesel"],
    cardImageUrl:
      "https://res.cloudinary.com/m19yxquu/image/upload/v1788501874/tamayo_innov-50kb.jpg",
    cardImageAlt: "Innova Crysta cab",
  },
  {
    id: "urbania16",
    label: "Force Urbania (16 Seater)",
    apiCategory: "TEMPO_TRAVELLER",
    capacity: "16 passengers",
    fuelTags: ["Diesel"],
    cardImageUrl:
      "https://res.cloudinary.com/m19yxquu/image/upload/v1788501875/tamayo_urbani-50kb.jpg",
    cardImageAlt: "Force Urbania 16 seater",
  },
  {
    id: "traveller21",
    label: "Force Traveller (21 Seater)",
    apiCategory: "TEMPO_TRAVELLER",
    capacity: "21 passengers",
    fuelTags: ["Diesel"],
    cardImageUrl:
      "https://res.cloudinary.com/m19yxquu/image/upload/v1788501874/tamayo_21seater_-50kb.jpg",
    cardImageAlt: "Force Traveller 21 seater",
  },
];

const AGE_OPTIONS: Array<{ value: AgeBucketOption; label: string }> = [
  { value: "ZERO_TO_THREE", label: "0-3 years" },
  { value: "THREE_TO_SEVEN", label: "4-7 years" },
];

const OPERATIONAL_OPTIONS: Array<{ value: OperationalOption; label: string }> = [
  { value: "SELF_PAY", label: "Self pay" },
  { value: "ALL_INCLUSIVE", label: "All inclusive" },
];

function ClayIcon({ name, size = 24, alt }: { name: ClayIconName; size?: number; alt: string }) {
  return (
    <Image
      src={`/icons/tamayo-3d-green/${name}.svg`}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 object-contain"
    />
  );
}

function InlineInfo({
  label,
  content,
}: {
  label: string;
  content: string;
}) {
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`${label} info`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-[10px] font-bold text-emerald-700"
      >
        i
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden w-52 -translate-x-1/2 rounded-md border border-emerald-200 bg-white p-2 text-[10px] font-medium leading-snug text-emerald-900 shadow-md group-hover:block group-focus-within:block">
        {content}
      </span>
    </span>
  );
}

function CompactDropdown<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onValueChange: (next: T) => void;
  ariaLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-white px-2 py-1.5 text-left text-[11px] font-semibold text-foreground outline-none"
      >
        <span>{selected.label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5L10 12.5L15 7.5" />
        </svg>
      </button>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-40 overflow-hidden rounded-md border border-border bg-white shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onValueChange(option.value);
                setIsOpen(false);
              }}
              className={
                option.value === value
                  ? "block w-full bg-emerald-50 px-2 py-1.5 text-left text-[11px] font-semibold text-emerald-700"
                  : "block w-full px-2 py-1.5 text-left text-[11px] text-foreground hover:bg-accent"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function currency(value: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function currencyRounded(value: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function parseDestinationStops(raw: string) {
  if (raw.includes(DESTINATION_SEPARATOR)) {
    return raw
      .split(DESTINATION_SEPARATOR)
      .map((stop) => stop.trim())
      .filter(Boolean)
      .map((location) => ({ location }));
  }

  const normalized = raw.trim();
  if (!normalized) {
    return [];
  }

  return raw
    .split("\n")
    .map((stop) => stop.trim())
    .filter(Boolean)
    .map((location) => ({ location }));
}

function buildQuoteUrlFromParams(params: URLSearchParams) {
  const query = params.toString();
  return query ? `/customer/booking-quote?${query}` : "/customer/booking-quote";
}

export function QuoteWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingBookingCategory, setLoadingBookingCategory] = useState<string | null>(null);
  const [vehicleQuotes, setVehicleQuotes] = useState<VehicleQuoteResult[]>([]);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shouldAutoQuote, setShouldAutoQuote] = useState(false);
  const [operationalOption, setOperationalOption] = useState<OperationalOption>("ALL_INCLUSIVE");
  const autoReserveAttemptedRef = useRef(false);

  const routeStopsSummary = form.destinationStops
    .split(DESTINATION_SEPARATOR)
    .map((stop) => stop.trim())
    .filter(Boolean)
    .join(" -> ");

  useEffect(() => {
    const productType = searchParams.get("productType");
    const sourceCity = searchParams.get("sourceCity");
    const destinationCity = searchParams.get("destinationCity");
    const pickupLocation = searchParams.get("pickupLocation");
    const estimatedKm = searchParams.get("estimatedKm");
    const tripStartDate = searchParams.get("tripStartDate");
    const tripEndDate = searchParams.get("tripEndDate");
    const dropLocations = searchParams
      .getAll("drop")
      .map((location) => location.trim())
      .filter(Boolean);

    const hasRoutePreset =
      Boolean(productType) ||
      Boolean(sourceCity) ||
      Boolean(destinationCity) ||
      Boolean(pickupLocation) ||
      Boolean(estimatedKm) ||
      Boolean(tripStartDate) ||
      Boolean(tripEndDate) ||
      dropLocations.length > 0;

    if (!hasRoutePreset) {
      return;
    }

    const normalizedProductType =
      productType === "ONE_WAY" || productType === "MULTI_CITY" || productType === "ROUND_TRIP"
        ? productType
        : defaultFormState.productType;

    setForm((prev) => ({
      ...prev,
      productType: normalizedProductType,
      sourceCity: sourceCity?.trim() ?? "",
      destinationCity: destinationCity?.trim() ?? "",
      pickupLocation: pickupLocation?.trim() ?? "",
      destinationStops: dropLocations.join(DESTINATION_SEPARATOR),
      estimatedKm: estimatedKm?.trim() ?? "",
      returnDistanceKm: searchParams.get("returnDistanceKm")?.trim() ?? "",
      tripStartDate:
        tripStartDate && tripStartDate.includes("T")
          ? tripStartDate
          : tripStartDate
            ? `${tripStartDate}T09:00`
            : "",
      tripEndDate:
        tripEndDate && tripEndDate.includes("T")
          ? tripEndDate
          : tripEndDate
            ? `${tripEndDate}T18:00`
            : "",
    }));
    setShouldAutoQuote(true);
  }, [searchParams]);

  useEffect(() => {
    const autoReservePresetId = searchParams.get("autoReserve");
    if (!autoReservePresetId || autoReserveAttemptedRef.current) {
      return;
    }

    if (loadingQuote || Boolean(loadingBookingCategory) || vehicleQuotes.length === 0) {
      return;
    }

    const matchingQuote = vehicleQuotes.find(
      (entry) => entry.preset.id === autoReservePresetId && entry.quote
    );
    if (!matchingQuote) {
      return;
    }

    autoReserveAttemptedRef.current = true;
    const cleanQuoteParams = new URLSearchParams(searchParams.toString());
    cleanQuoteParams.delete("autoReserve");
    const cleanQuoteUrl = buildQuoteUrlFromParams(cleanQuoteParams);
    router.replace(cleanQuoteUrl);
    void createBookingForPreset(matchingQuote.preset, {
      quoteReturnUrl: cleanQuoteUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadingQuote, loadingBookingCategory, vehicleQuotes]);

  useEffect(() => {
    if (!shouldAutoQuote || loadingQuote) {
      return;
    }

    const hasDestinations = parseDestinationStops(form.destinationStops).length > 0;
    if (!form.tripStartDate || !hasDestinations) {
      return;
    }

    void generateQuotes();
    setShouldAutoQuote(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.destinationStops, form.tripStartDate, loadingQuote, shouldAutoQuote]);

  function buildPayload(preset: VehiclePreset) {
    const destinations = parseDestinationStops(form.destinationStops);
    if (destinations.length === 0) {
      throw new Error("Please add at least one destination stop.");
    }

    if (!form.tripStartDate) {
      throw new Error("Trip start date is required.");
    }

    return {
      sourceCity: form.sourceCity.trim(),
      destinationCity: form.destinationCity.trim() || undefined,
      pickupLocation: form.pickupLocation.trim(),
      destinations,
      tripStartDate: new Date(form.tripStartDate).toISOString(),
      tripEndDate: form.tripEndDate ? new Date(form.tripEndDate).toISOString() : undefined,
      category: preset.apiCategory,
      ageBucket: form.ageBucket,
      productType: form.productType,
      vehiclePresetId: preset.id,
      estimatedKm: form.estimatedKm ? Number(form.estimatedKm) : undefined,
      returnDistanceKm: form.returnDistanceKm ? Number(form.returnDistanceKm) : undefined,
    };
  }

  async function generateQuotes() {
    setError(null);
    setBooking(null);
    setLoadingQuote(true);

    try {
      const results = await Promise.all(
        VEHICLE_PRESETS.map(async (preset) => {
          try {
            const payload = buildPayload(preset);
            const response = await fetch("/api/v1/bookings/quote", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-mock-customer-id": "mock-customer-1",
              },
              body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
              return {
                preset,
                quote: null,
                error: result?.error?.message ?? "Price unavailable for this option.",
              } satisfies VehicleQuoteResult;
            }

            return {
              preset,
              quote: result.data as QuoteResponse,
              error: null,
            } satisfies VehicleQuoteResult;
          } catch {
            return {
              preset,
              quote: null,
              error: "Price unavailable for this option.",
            } satisfies VehicleQuoteResult;
          }
        })
      );

      setVehicleQuotes(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate quote.");
    } finally {
      setLoadingQuote(false);
    }
  }

  async function createBookingForPreset(preset: VehiclePreset, options?: CreateBookingOptions) {
    setError(null);
    setLoadingBookingCategory(preset.id);

    try {
      const payload = buildPayload(preset);
      const response = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mock-customer-id": "mock-customer-1",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        const callbackParams = new URLSearchParams(searchParams.toString());
        callbackParams.set("autoReserve", preset.id);
        const callbackUrl = `/customer/booking-quote?${callbackParams.toString()}`;
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message ?? "Unable to create booking.");
      }

      const bookingResult = result.data as BookingResponse;
      setBooking(bookingResult);

      const matchedQuote = vehicleQuotes.find(
        (entry) => entry.preset.id === preset.id
      )?.quote;
      const selectedAgeLabel =
        AGE_OPTIONS.find((option) => option.value === form.ageBucket)?.label ?? "selected";
      const selectedStops = parseDestinationStops(form.destinationStops)
        .map((stop) => stop.location)
        .filter(Boolean);
      const quoteReturnParams = new URLSearchParams(searchParams.toString());
      quoteReturnParams.delete("autoReserve");
      const quoteReturnUrl = options?.quoteReturnUrl ?? buildQuoteUrlFromParams(quoteReturnParams);
      const params = new URLSearchParams({
        bookingRef: bookingResult.booking.bookingRef,
        bookingStatus: bookingResult.booking.status,
        vehicle: preset.label,
        sourceCity: form.sourceCity,
        destinationCity: form.destinationCity || "your destination",
        pickupLocation: form.pickupLocation || "Pickup pending",
        tripStartDate: form.tripStartDate || "",
        tripEndDate: form.tripEndDate || "",
        reserveAmount: String(RESERVE_TOKEN_AMOUNT),
        operationalOption,
        ageBucketLabel: selectedAgeLabel,
        fuelType: preset.fuelTags.join("+"),
        productType: form.productType,
        quoteReturnUrl,
      });

      if (matchedQuote) {
        params.set("estimatedTotal", matchedQuote.estimatedTotal);
        params.set("routeDistanceKm", String(matchedQuote.routeDistanceKm ?? ""));
        params.set("returnDistanceKm", String(matchedQuote.returnDistanceKm ?? ""));
        params.set("dispatchHubCity", matchedQuote.dispatchHubCity ?? "");
        params.set("includedDays", String(matchedQuote.includedDays));
        params.set("totalIncludedKm", String(matchedQuote.totalIncludedKm));
        params.set("perKmRate", String(Math.round(Number(matchedQuote.perKmRate))));
      }
      selectedStops.forEach((stop) => params.append("stop", stop));

      router.push(`/customer/reserve?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create booking.");
    } finally {
      setLoadingBookingCategory(null);
    }
  }

  function handleAgeChange(ageBucket: AgeBucketOption) {
    setForm((prev) => ({ ...prev, ageBucket }));
    setShouldAutoQuote(true);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Your route
            </p>
            <h3 className="text-lg font-semibold text-foreground">
              {form.sourceCity} to {form.destinationCity || "your destination"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {form.pickupLocation || "Pickup location pending"}{" "}
              {routeStopsSummary ? `-> ${routeStopsSummary}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateQuotes} disabled={loadingQuote || Boolean(loadingBookingCategory)}>
              {loadingQuote ? "Refreshing..." : "Refresh prices"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/customer">Modify booking</Link>
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loadingQuote && vehicleQuotes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Fetching latest prices across vehicle options...
        </div>
      ) : null}

      {vehicleQuotes.length > 0 ? (
        <div className="space-y-4">
          {loadingQuote ? (
            <p className="text-xs font-medium text-muted-foreground">
              Updating prices for selected vehicle age...
            </p>
          ) : null}
          {vehicleQuotes.map((vehicleQuote) => {
            if (!vehicleQuote.quote) {
              return (
                <article
                  key={vehicleQuote.preset.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-foreground">{vehicleQuote.preset.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vehicleQuote.error ?? "Price unavailable for this option."}
                  </p>
                </article>
              );
            }

            const quote = vehicleQuote.quote;
            const bookingDays = quote.includedDays;
            const operationalBundle = Number(quote.operationalBundleAmount);
            const perKmRateDisplay = `₹${Math.round(Number(quote.perKmRate))}/km`;
            const routeDistanceBase =
              quote.routeDistanceKm ?? quote.usableDistanceKm ?? quote.billableKm;
            const rawEstimatedTotal = Number(quote.estimatedTotal);
            const displayedTotal =
              operationalOption === "SELF_PAY"
                ? Math.max(0, rawEstimatedTotal - operationalBundle).toFixed(2)
                : quote.estimatedTotal;

            return (
              <article
                key={vehicleQuote.preset.id}
                className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <ClayIcon name="verified" size={24} alt="Verified fare" />
                    Verified fare breakdown
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Distance source: {form.estimatedKm.trim() ? "manual override" : "Google Maps"}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {vehicleQuote.preset.fuelTags.includes("CNG+Petrol") ? (
                          <p className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">
                            <ClayIcon name="fuel" size={16} alt="Fuel info" />
                            CNG cars may face a 30+ min refueling delay.
                          </p>
                        ) : (
                          <p className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-800">
                            <ClayIcon name="fuel" size={16} alt="Fuel info" />
                            Diesel cars usually avoid fuel-station wait time for a smoother journey.
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          <img
                            src={vehicleQuote.preset.cardImageUrl}
                            alt={vehicleQuote.preset.cardImageAlt}
                            className="h-20 w-32 rounded-md border border-emerald-100 object-cover"
                            loading="lazy"
                          />
                          <div className="space-y-1">
                            <p className="inline-flex rounded bg-muted px-2 py-1 text-xs font-semibold tracking-wide text-foreground">
                              {vehicleQuote.preset.label}
                            </p>
                            {quote.dispatchHubCity ? (
                              <p className="text-[11px] text-muted-foreground">
                                Cab coming from{" "}
                                <span className="font-bold text-emerald-700">
                                  {quote.dispatchHubCity}
                                </span>
                              </p>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <ClayIcon name="ac" size={24} alt="AC" />
                                AC
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <ClayIcon name="passengers" size={24} alt="Passengers" />
                                {vehicleQuote.preset.capacity}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <ClayIcon name="fuel" size={24} alt="Fuel type" />
                                {vehicleQuote.preset.fuelTags.join(" / ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2 rounded-lg border border-border/70 bg-background p-3">
                          <div className="group flex min-h-[2rem] items-start gap-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                              Vehicle age
                            </p>
                            <InlineInfo
                              label="Vehicle age"
                              content={
                                form.ageBucket === "ZERO_TO_THREE"
                                  ? "0-3 years selected: newer vehicles with better condition and comfort. A small surcharge may apply based on availability."
                                  : "4-7 years selected: more budget-friendly option with slightly older vehicles."
                              }
                            />
                          </div>
                          <CompactDropdown
                            value={form.ageBucket}
                            options={AGE_OPTIONS}
                            onValueChange={(next) => handleAgeChange(next)}
                            ariaLabel="Vehicle age"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {form.ageBucket === "ZERO_TO_THREE"
                              ? "Assured new vehicle."
                              : "Economy age vehicle selected."}
                          </p>
                          <span
                            className={
                              form.ageBucket === "ZERO_TO_THREE"
                                ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                : "inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700"
                            }
                          >
                            {perKmRateDisplay}
                          </span>
                        </div>

                        <div className="space-y-2 rounded-lg border border-border/70 bg-background p-3">
                          <div className="group flex min-h-[2rem] items-start gap-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                              Toll, parking & food
                            </p>
                            <InlineInfo
                              label="Toll parking food"
                              content={
                                operationalOption === "ALL_INCLUSIVE"
                                  ? "All-inclusive selected: toll, parking, and driver food allowance are included in your fare."
                                  : "Self-pay selected: toll, parking, and driver food allowance are paid separately during the trip."
                              }
                            />
                          </div>
                          <CompactDropdown
                            value={operationalOption}
                            options={OPERATIONAL_OPTIONS}
                            onValueChange={(next) => setOperationalOption(next)}
                            ariaLabel="Toll parking and food option"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {operationalOption === "ALL_INCLUSIVE"
                              ? "All-inclusive selected."
                              : "Self-pay selected."}
                          </p>
                          {operationalOption === "ALL_INCLUSIVE" ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              +{currencyRounded(quote.operationalBundleAmount)} extra
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-0 text-[12px]">
                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                          <ClayIcon name="route" size={24} alt="Tour route" />
                          Estimated route distance: {routeDistanceBase} kms
                          {quote.returnDistanceKm
                            ? ` (including return ${quote.returnDistanceKm} kms)`
                            : ""}
                        </p>
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <ClayIcon name="reservation" size={24} alt="Reservation" />
                          Reserve this cab at{" "}
                          <span className="font-semibold text-foreground">
                            ₹{RESERVE_TOKEN_AMOUNT} only
                          </span>
                          .
                        </p>
                        <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <ClayIcon name="cancellation" size={24} alt="Free cancellation" />
                          Free cancellation up to 6 hours before pickup.
                        </p>
                      </div>
                    </div>

                    <div className="w-full rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 lg:w-[15rem]">
                      <p className="text-sm font-semibold text-emerald-700">Affordable fare</p>
                      <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                        {currency(displayedTotal)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {operationalOption === "ALL_INCLUSIVE"
                          ? "Includes base fare + operational bundle."
                          : "Base fare shown. Tolls, parking and driver food payable during trip."}
                      </p>
                      <Button
                        className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => createBookingForPreset(vehicleQuote.preset)}
                        disabled={Boolean(loadingBookingCategory) || loadingQuote}
                      >
                        {loadingBookingCategory === vehicleQuote.preset.id
                          ? "Reserving..."
                          : `Reserve by paying ₹${RESERVE_TOKEN_AMOUNT}`}
                      </Button>
                      <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-md border border-emerald-100 bg-white p-1.5">
                        {[
                          { icon: "platform-fee" as const, label: "Platform fee", value: "₹0" },
                          { icon: "halting" as const, label: "Halting", value: "₹0" },
                          { icon: "surge" as const, label: "Surge fee", value: "₹0" },
                        ].map((fee, feeIndex) => (
                          <div
                            key={`${vehicleQuote.preset.id}-compact-${fee.label}`}
                            className={
                              feeIndex === 0
                                ? "flex flex-col items-center justify-center gap-0.5 px-1 py-1 text-center"
                                : "flex flex-col items-center justify-center gap-0.5 border-l border-emerald-100 px-1 py-1 text-center"
                            }
                          >
                            <ClayIcon name={fee.icon} size={18} alt={fee.label} />
                            <p className="text-[12px] font-semibold leading-none text-foreground">{fee.value}</p>
                            <p className="text-[10px] leading-none text-muted-foreground">{fee.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-emerald-100 bg-white p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Duration
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                            <ClayIcon name="duration" size={22} alt="Duration" />
                            {bookingDays} day{bookingDays > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="rounded-md border border-emerald-100 bg-white p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Included km
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                            <ClayIcon name="included-km" size={22} alt="Included km" />
                            {quote.totalIncludedKm} km
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {booking ? (
        <div className="rounded-md border border-emerald-300/40 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          Booking created: <span className="font-semibold">{booking.booking.bookingRef}</span>{" "}
          ({booking.booking.status})
        </div>
      ) : null}
    </div>
  );
}
