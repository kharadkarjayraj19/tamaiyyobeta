"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";

import { CompactDropdown } from "@/components/shared/forms/compact-dropdown";
import { LocationAutocompleteInput } from "@/components/shared/location/location-autocomplete-input";
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
type RideModeOption = "oneWay" | "multiCityRoundTrip" | "cityTour" | "airportOnly";
type OperationalOption = "SELF_PAY" | "ALL_INCLUSIVE";
type CityTourPackageOption = "6h60km" | "8h80km" | "10h100km" | "12h120km";
type AirportPackageOption = "10km" | "20km" | "30km" | "40km";

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
const PICKER_ITEM_HEIGHT = 48;
const PICKER_VIEW_HEIGHT = 144;
const PICKER_LOOP_REPEATS = 7;

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
  rideMode: RideModeOption;
  cityTourPackage: CityTourPackageOption;
  airportPackage: AirportPackageOption;
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
  rideMode: "multiCityRoundTrip",
  cityTourPackage: "8h80km",
  airportPackage: "10km",
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

type EditorKind =
  | "from"
  | "to"
  | "stops"
  | "pickupDateTime"
  | null;

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

const TRIP_TYPE_OPTIONS: Array<{ value: RideModeOption; label: string }> = [
  { value: "multiCityRoundTrip", label: "Round trip" },
  { value: "oneWay", label: "One-Way" },
  { value: "cityTour", label: "City Tour" },
  { value: "airportOnly", label: "Airport" },
];

const OPERATIONAL_OPTIONS: Array<{ value: OperationalOption; label: string }> = [
  { value: "SELF_PAY", label: "Self pay" },
  { value: "ALL_INCLUSIVE", label: "All inclusive" },
];

const CITY_TOUR_PACKAGES: Array<{
  value: CityTourPackageOption;
  label: string;
  kms: number;
  hours: number;
}> = [
  { value: "6h60km", label: "6 hr / 60 km", kms: 60, hours: 6 },
  { value: "8h80km", label: "8 hr / 80 km", kms: 80, hours: 8 },
  { value: "10h100km", label: "10 hr / 100 km", kms: 100, hours: 10 },
  { value: "12h120km", label: "12 hr / 120 km", kms: 120, hours: 12 },
];

const AIRPORT_PACKAGES: Array<{
  value: AirportPackageOption;
  label: string;
  kms: number;
}> = [
  { value: "10km", label: "Upto 10 km", kms: 10 },
  { value: "20km", label: "Upto 20 km", kms: 20 },
  { value: "30km", label: "Upto 30 km", kms: 30 },
  { value: "40km", label: "Upto 40 km", kms: 40 },
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
    <span className="group relative inline-flex items-center">
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

function TopbarDropdown<T extends string>({
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
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/35 bg-white/10 px-2.5 py-2 text-left text-white hover:bg-white/20 md:px-3 md:py-2.5"
      >
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-100 md:text-[10px]">
            Trip type
          </p>
          <p className="truncate text-[11px] font-semibold text-white md:text-[14px]">
            {selected.label}
          </p>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5 shrink-0 text-emerald-100 md:h-4 md:w-4"
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
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
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
                  ? "block w-full bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700 md:text-sm"
                  : "block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-accent md:text-sm"
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

function mapRideModeToProductType(rideMode: RideModeOption): ProductTypeOption {
  if (rideMode === "cityTour") {
    return "MULTI_CITY";
  }
  if (rideMode === "multiCityRoundTrip") {
    return "ROUND_TRIP";
  }
  return "ONE_WAY";
}

function resolveCityTourPackage(value: string | null): CityTourPackageOption {
  if (
    value === "6h60km" ||
    value === "8h80km" ||
    value === "10h100km" ||
    value === "12h120km"
  ) {
    return value;
  }
  return "8h80km";
}

function resolveAirportPackage(value: string | null): AirportPackageOption {
  if (value === "10km" || value === "20km" || value === "30km" || value === "40km") {
    return value;
  }
  return "10km";
}

function formatDateToken(value: string) {
  if (!value) {
    return "Pick-up date";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

function formatTimeToken(value: string) {
  if (!value) {
    return "Pick-up time";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

function toDateInputValue(value: string): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateString(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(toDateTimeInputValue(date));
}

function getTwelveHourParts(value: string): {
  hour: number;
  minute: number;
  period: "AM" | "PM";
} {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return { hour: 9, minute: 0, period: "AM" };
  }
  const rawHour = parsed.getHours();
  const period = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 === 0 ? 12 : rawHour % 12;
  return { hour, minute: parsed.getMinutes(), period };
}

function toDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getLoopedIndex(baseIndex: number, laneLength: number) {
  const centerBand = Math.floor(PICKER_LOOP_REPEATS / 2) * laneLength;
  return centerBand + baseIndex;
}

function normalizeMinuteToQuarter(value: number): number {
  const buckets = [0, 15, 30, 45];
  let closest = buckets[0];
  let minDistance = Number.POSITIVE_INFINITY;
  for (const bucket of buckets) {
    const distance = Math.abs(value - bucket);
    if (distance < minDistance) {
      minDistance = distance;
      closest = bucket;
    }
  }
  return closest;
}

function calculateTripDurationDays(start: string, end: string): number {
  if (!start || !end) {
    return 1;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 1;
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(diffDays));
}

function TopbarOverlay({
  title,
  onClose,
  children,
  onConfirm,
  confirmLabel = "Done",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-emerald-950/35 px-4 pt-16 backdrop-blur-[1px] sm:pt-20">
      <div className="w-full max-w-2xl overflow-visible rounded-2xl border border-emerald-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 px-4 py-3 sm:px-5">
          <h3 className="text-xl font-semibold tracking-tight text-emerald-950">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold leading-none text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="Close dialog"
          >
            X
          </button>
        </div>
        <div className="px-4 py-4 sm:px-5">{children}</div>
        <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-emerald-100 bg-emerald-50/50 px-4 py-3 sm:px-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="tamayoGradient"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [activeEditor, setActiveEditor] = useState<EditorKind>(null);
  const [draftSourceCity, setDraftSourceCity] = useState("");
  const [draftDestinationCity, setDraftDestinationCity] = useState("");
  const [draftStops, setDraftStops] = useState<string[]>([]);
  const [draftTripDate, setDraftTripDate] = useState("");
  const [draftHour, setDraftHour] = useState(9);
  const [draftMinute, setDraftMinute] = useState(0);
  const [draftPeriod, setDraftPeriod] = useState<"AM" | "PM">("AM");
  const [draftTripDurationDays, setDraftTripDurationDays] = useState(1);
  const dateColumnRef = useRef<HTMLDivElement | null>(null);
  const hourColumnRef = useRef<HTMLDivElement | null>(null);
  const minuteColumnRef = useRef<HTMLDivElement | null>(null);
  const periodColumnRef = useRef<HTMLDivElement | null>(null);
  const pickerScrollSyncRef = useRef(false);
  const pickerUnlockTimeoutRef = useRef<number | null>(null);
  const autoReserveAttemptedRef = useRef(false);

  const routeStops = parseDestinationStops(form.destinationStops)
    .map((stop) => stop.location.trim())
    .filter(Boolean);
  const isCityTourMode = form.rideMode === "cityTour";
  const intermediateStops = routeStops.length > 0 ? routeStops.slice(0, -1) : [];
  const finalStop = routeStops.length > 0 ? routeStops[routeStops.length - 1] : "";
  const destinationToken = isCityTourMode
    ? form.sourceCity || "Within city"
    : finalStop || form.destinationCity || "Destination";
  const routeChain = [form.sourceCity, ...intermediateStops, destinationToken]
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== "Destination");
  const routeChainSummary = routeChain.length > 0 ? routeChain.join(" -> ") : "Plan your route";

  const routeStopsSummary =
    isCityTourMode
      ? "Within city"
      :
    intermediateStops.length > 0
      ? `${intermediateStops.length} stop${intermediateStops.length > 1 ? "s" : ""}`
      : "Add stops";
  const requiresReturnDate = form.productType !== "ONE_WAY";
  const pickupDateToken = formatDateToken(form.tripStartDate);
  const pickupTimeToken = formatTimeToken(form.tripStartDate);
  const selectedTripDays = requiresReturnDate
    ? calculateTripDurationDays(form.tripStartDate, form.tripEndDate)
    : 1;
  const todayDate = useMemo(() => toDateInputValue(new Date()), []);
  const dateOptions = useMemo(() => {
    const firstDate = new Date(`${todayDate}T00:00:00`);
    return Array.from({ length: 121 }, (_, index) => {
      const value = new Date(firstDate);
      value.setDate(firstDate.getDate() + index);
      const token = toDateInputValue(value);
      return {
        value: token,
        label: formatDateToken(token),
      };
    });
  }, [todayDate]);
  const hourOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const minuteOptions = useMemo(() => [0, 15, 30, 45], []);
  const periodOptions = useMemo(() => ["AM", "PM"] as const, []);
  const loopedHourOptions = useMemo(
    () =>
      Array.from(
        { length: hourOptions.length * PICKER_LOOP_REPEATS },
        (_, index) => hourOptions[index % hourOptions.length]
      ),
    [hourOptions]
  );
  const loopedMinuteOptions = useMemo(
    () =>
      Array.from(
        { length: minuteOptions.length * PICKER_LOOP_REPEATS },
        (_, index) => minuteOptions[index % minuteOptions.length]
      ),
    [minuteOptions]
  );
  const loopedPeriodOptions = useMemo(
    () =>
      Array.from(
        { length: periodOptions.length * PICKER_LOOP_REPEATS },
        (_, index) => periodOptions[index % periodOptions.length]
      ),
    [periodOptions]
  );
  const selectedDateIndex = Math.max(
    0,
    dateOptions.findIndex((option) => option.value === (draftTripDate || todayDate))
  );
  const selectedHourIndex = Math.max(0, hourOptions.findIndex((hour) => hour === draftHour));
  const selectedMinuteIndex = Math.max(0, minuteOptions.findIndex((minute) => minute === draftMinute));
  const selectedPeriodIndex = Math.max(0, periodOptions.findIndex((period) => period === draftPeriod));
  const selectedLoopedHourIndex = getLoopedIndex(selectedHourIndex, hourOptions.length);
  const selectedLoopedMinuteIndex = getLoopedIndex(selectedMinuteIndex, minuteOptions.length);
  const selectedLoopedPeriodIndex = getLoopedIndex(selectedPeriodIndex, periodOptions.length);
  const compactDateTimeLabel = form.tripStartDate
    ? `${pickupDateToken} • ${pickupTimeToken}${requiresReturnDate ? ` • ${selectedTripDays}d` : ""}`
    : "Pick date & time";
  const activeCityTourPackage =
    CITY_TOUR_PACKAGES.find((pkg) => pkg.value === form.cityTourPackage) ?? CITY_TOUR_PACKAGES[1];
  const activeAirportPackage =
    AIRPORT_PACKAGES.find((pkg) => pkg.value === form.airportPackage) ?? AIRPORT_PACKAGES[0];

  useEffect(() => {
    const productType = searchParams.get("productType");
    const rideMode = searchParams.get("rideMode");
    const sourceCity = searchParams.get("sourceCity");
    const destinationCity = searchParams.get("destinationCity");
    const pickupLocation = searchParams.get("pickupLocation");
    const estimatedKm = searchParams.get("estimatedKm");
    const tripStartDate = searchParams.get("tripStartDate");
    const tripEndDate = searchParams.get("tripEndDate");
    const cityTourPackage = searchParams.get("cityTourPackage");
    const airportPackage = searchParams.get("airportPackage");
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
    const normalizedRideMode: RideModeOption =
      rideMode === "oneWay" ||
      rideMode === "multiCityRoundTrip" ||
      rideMode === "cityTour" ||
      rideMode === "airportOnly"
        ? rideMode
        : normalizedProductType === "MULTI_CITY"
          ? "cityTour"
          : normalizedProductType === "ROUND_TRIP"
            ? "multiCityRoundTrip"
            : "oneWay";

    setForm((prev) => ({
      ...prev,
      productType: mapRideModeToProductType(normalizedRideMode),
      rideMode: normalizedRideMode,
      cityTourPackage: resolveCityTourPackage(cityTourPackage),
      airportPackage: resolveAirportPackage(airportPackage),
      ageBucket:
        normalizedRideMode === "airportOnly" ? "ZERO_TO_THREE" : prev.ageBucket,
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
    if (normalizedRideMode === "cityTour") {
      setOperationalOption("SELF_PAY");
    }
    if (normalizedRideMode === "airportOnly") {
      setOperationalOption("ALL_INCLUSIVE");
    }
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
      const cleanQuoteParams = new URLSearchParams(searchParams.toString());
      cleanQuoteParams.delete("autoReserve");
      router.replace(buildQuoteUrlFromParams(cleanQuoteParams));
      autoReserveAttemptedRef.current = true;
      setError("Unable to resume reservation for selected vehicle. Please tap Reserve again.");
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
    if (activeEditor !== "pickupDateTime") {
      return;
    }

    pickerScrollSyncRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      if (dateColumnRef.current) {
        dateColumnRef.current.scrollTop = selectedDateIndex * PICKER_ITEM_HEIGHT;
      }
      if (hourColumnRef.current) {
        hourColumnRef.current.scrollTop = selectedLoopedHourIndex * PICKER_ITEM_HEIGHT;
      }
      if (minuteColumnRef.current) {
        minuteColumnRef.current.scrollTop = selectedLoopedMinuteIndex * PICKER_ITEM_HEIGHT;
      }
      if (periodColumnRef.current) {
        periodColumnRef.current.scrollTop = selectedLoopedPeriodIndex * PICKER_ITEM_HEIGHT;
      }
      if (pickerUnlockTimeoutRef.current !== null) {
        window.clearTimeout(pickerUnlockTimeoutRef.current);
      }
      pickerUnlockTimeoutRef.current = window.setTimeout(() => {
        pickerScrollSyncRef.current = false;
        pickerUnlockTimeoutRef.current = null;
      }, 420);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      unlockPickerScrollSync();
    };
  }, [activeEditor]);

  useEffect(() => {
    if (!shouldAutoQuote || loadingQuote) {
      return;
    }

    const hasDestinations =
      isCityTourMode || parseDestinationStops(form.destinationStops).length > 0;
    if (!form.tripStartDate || !hasDestinations) {
      return;
    }

    void generateQuotes();
    setShouldAutoQuote(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.destinationStops, form.tripStartDate, isCityTourMode, loadingQuote, shouldAutoQuote]);

  function buildPayload(preset: VehiclePreset) {
    const parsedDestinations = parseDestinationStops(form.destinationStops);
    const destinations =
      form.rideMode === "cityTour"
        ? [
            {
              location:
                form.pickupLocation.trim() ||
                form.sourceCity.trim() ||
                form.destinationCity.trim() ||
                "City tour",
            },
          ]
        : parsedDestinations;
    if (destinations.length === 0) {
      throw new Error("Please add at least one destination stop.");
    }

    if (!form.tripStartDate) {
      throw new Error("Trip start date is required.");
    }

    const estimatedKmValue =
      form.rideMode === "cityTour"
        ? activeCityTourPackage.kms
        : form.rideMode === "airportOnly"
          ? activeAirportPackage.kms
        : form.estimatedKm
          ? Number(form.estimatedKm)
          : undefined;

    return {
      sourceCity: form.sourceCity.trim(),
      destinationCity:
        form.rideMode === "cityTour"
          ? form.sourceCity.trim() || form.destinationCity.trim() || undefined
          : form.destinationCity.trim() || undefined,
      pickupLocation: form.pickupLocation.trim(),
      destinations,
      tripStartDate: new Date(form.tripStartDate).toISOString(),
      tripEndDate: form.tripEndDate ? new Date(form.tripEndDate).toISOString() : undefined,
      category: preset.apiCategory,
      ageBucket: form.rideMode === "airportOnly" ? "ZERO_TO_THREE" : form.ageBucket,
      productType: form.productType,
      vehiclePresetId: preset.id,
      cityTourPackage: form.rideMode === "cityTour" ? form.cityTourPackage : undefined,
      airportPackage: form.rideMode === "airportOnly" ? form.airportPackage : undefined,
      estimatedKm: estimatedKmValue,
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
          if (form.rideMode === "cityTour" && preset.apiCategory === "TEMPO_TRAVELLER") {
            return {
              preset,
              quote: null,
              error: "City tour pricing for this vehicle is coming soon.",
            } satisfies VehicleQuoteResult;
          }
          if (form.rideMode === "airportOnly" && preset.apiCategory === "TEMPO_TRAVELLER") {
            return {
              preset,
              quote: null,
              error: "Airport pricing for this vehicle is coming soon.",
            } satisfies VehicleQuoteResult;
          }
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
      const oneWayFixedRouteSelected =
        form.productType === "ONE_WAY" &&
        (matchedQuote?.lineItems ?? []).some((item) => item.lineType === "CORRIDOR_FARE");
      const airportFixedPackageSelected = (matchedQuote?.lineItems ?? []).some(
        (item) => item.lineType === "AIRPORT_PACKAGE"
      );
      const effectiveOperationalOption: OperationalOption = oneWayFixedRouteSelected
        || airportFixedPackageSelected
        ? "ALL_INCLUSIVE"
        : operationalOption;
      const selectedAgeLabel =
        form.rideMode === "airportOnly"
          ? "0-3 years"
          : AGE_OPTIONS.find((option) => option.value === form.ageBucket)?.label ?? "selected";
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
        operationalOption: effectiveOperationalOption,
        ageBucketLabel: selectedAgeLabel,
        fuelType: preset.fuelTags.join("+"),
        productType: form.productType,
        quoteReturnUrl,
      });
      if (form.rideMode === "cityTour") {
        params.set("cityTourPackage", form.cityTourPackage);
      }
      if (form.rideMode === "airportOnly") {
        params.set("airportPackage", form.airportPackage);
      }

      if (matchedQuote) {
        params.set("estimatedTotal", matchedQuote.estimatedTotal);
        params.set("routeDistanceKm", String(matchedQuote.routeDistanceKm ?? ""));
        params.set("returnDistanceKm", String(matchedQuote.returnDistanceKm ?? ""));
        params.set("dispatchHubCity", matchedQuote.dispatchHubCity ?? "");
        params.set("includedDays", String(matchedQuote.includedDays));
        const oneWayIncludedKm =
          matchedQuote.routeDistanceKm ?? matchedQuote.usableDistanceKm ?? matchedQuote.billableKm;
        params.set(
          "totalIncludedKm",
          String(oneWayFixedRouteSelected ? Math.max(Math.round(oneWayIncludedKm), 0) : matchedQuote.totalIncludedKm)
        );
        params.set("perKmRate", String(Math.round(Number(matchedQuote.perKmRate))));
        const cityTourExtraKmInfo = matchedQuote.lineItems.find(
          (item) => item.lineType === "CITY_TOUR_EXTRA_KM_RATE"
        )?.description;
        const cityTourExtraHourInfo = matchedQuote.lineItems.find(
          (item) => item.lineType === "CITY_TOUR_EXTRA_HOUR_RATE"
        )?.description;
        if (cityTourExtraKmInfo) {
          params.set("cityTourExtraKmInfo", cityTourExtraKmInfo);
        }
        if (cityTourExtraHourInfo) {
          params.set("cityTourExtraHourInfo", cityTourExtraHourInfo);
        }
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
    if (form.rideMode === "airportOnly") {
      return;
    }
    setForm((prev) => ({ ...prev, ageBucket }));
    setShouldAutoQuote(true);
  }

  function openFromEditor() {
    setDraftSourceCity(form.sourceCity);
    setActiveEditor("from");
  }

  function openToEditor() {
    setDraftDestinationCity(destinationToken === "Destination" ? "" : destinationToken);
    setActiveEditor("to");
  }

  function openStopsEditor() {
    setDraftStops(intermediateStops);
    setDraftSourceCity(form.sourceCity);
    setDraftDestinationCity(destinationToken === "Destination" ? "" : destinationToken);
    setActiveEditor("stops");
  }

  function openPickupDateTimeEditor() {
    setDraftTripDate(toDateInputValue(form.tripStartDate) || todayDate);
    const parts = getTwelveHourParts(form.tripStartDate);
    setDraftHour(parts.hour);
    setDraftMinute(normalizeMinuteToQuarter(parts.minute));
    setDraftPeriod(parts.period);
    setDraftTripDurationDays(
      requiresReturnDate ? calculateTripDurationDays(form.tripStartDate, form.tripEndDate) : 1
    );
    setActiveEditor("pickupDateTime");
  }

  function applyFromEditor() {
    const nextSource = draftSourceCity.trim();
    setForm((prev) => ({
      ...prev,
      sourceCity: nextSource,
      pickupLocation: nextSource,
      estimatedKm: "",
      returnDistanceKm: "",
    }));
    setShouldAutoQuote(true);
    setActiveEditor(null);
  }

  function applyToEditor() {
    const nextDestination = draftDestinationCity.trim();
    setForm((prev) => {
      const updatedStops = [...intermediateStops];
      if (nextDestination) {
        updatedStops.push(nextDestination);
      }
      return {
        ...prev,
        destinationCity: nextDestination,
        destinationStops: updatedStops.join(DESTINATION_SEPARATOR),
        estimatedKm: "",
        returnDistanceKm: "",
      };
    });
    setShouldAutoQuote(true);
    setActiveEditor(null);
  }

  function applyStopsEditor() {
    const cleanedIntermediateStops = draftStops.map((stop) => stop.trim()).filter(Boolean);
    const finalDestination =
      draftDestinationCity.trim() || (destinationToken === "Destination" ? "" : destinationToken);
    const nextSource = draftSourceCity.trim() || form.sourceCity;
    setForm((prev) => ({
      ...prev,
      sourceCity: nextSource,
      pickupLocation: nextSource,
      destinationCity: finalDestination,
      destinationStops: [...cleanedIntermediateStops, finalDestination].filter(Boolean).join(DESTINATION_SEPARATOR),
      estimatedKm: "",
      returnDistanceKm: "",
    }));
    setShouldAutoQuote(true);
    setActiveEditor(null);
  }

  function applyPickupDateTimeEditor() {
    if (!draftTripDate) {
      setError("Please choose a pickup date.");
      return;
    }
    const twentyFourHour =
      draftPeriod === "PM" ? (draftHour % 12) + 12 : draftHour % 12;
    const formattedHour = `${twentyFourHour}`.padStart(2, "0");
    const formattedMinute = `${draftMinute}`.padStart(2, "0");
    const nextDateTime = `${draftTripDate}T${formattedHour}:${formattedMinute}`;
    setForm((prev) => {
      if (prev.productType === "ONE_WAY") {
        return { ...prev, tripStartDate: nextDateTime, tripEndDate: "" };
      }
      const startDate = new Date(nextDateTime);
      if (Number.isNaN(startDate.getTime())) {
        return { ...prev, tripStartDate: nextDateTime };
      }
      const returnDate = new Date(startDate);
      returnDate.setDate(returnDate.getDate() + Math.max(0, draftTripDurationDays - 1));
      returnDate.setHours(23, 59, 0, 0);
      return {
        ...prev,
        tripStartDate: nextDateTime,
        tripEndDate: toDateTimeInputValue(returnDate),
      };
    });
    setShouldAutoQuote(true);
    setActiveEditor(null);
  }

  function handleTripTypeChange(nextRideMode: RideModeOption) {
    const nextType = mapRideModeToProductType(nextRideMode);
    setForm((prev) => ({
      ...prev,
      rideMode: nextRideMode,
      productType: nextType,
      ageBucket: nextRideMode === "airportOnly" ? "ZERO_TO_THREE" : prev.ageBucket,
      tripEndDate: nextType === "ONE_WAY" ? "" : prev.tripEndDate,
      estimatedKm:
        nextRideMode === "cityTour"
          ? String(
              (CITY_TOUR_PACKAGES.find((pkg) => pkg.value === prev.cityTourPackage) ??
                CITY_TOUR_PACKAGES[1]).kms
            )
          : nextRideMode === "airportOnly"
            ? String(
                (AIRPORT_PACKAGES.find((pkg) => pkg.value === prev.airportPackage) ??
                  AIRPORT_PACKAGES[0]).kms
              )
          : prev.estimatedKm,
    }));
    if (nextRideMode === "cityTour") {
      setOperationalOption("SELF_PAY");
    }
    if (nextRideMode === "airportOnly") {
      setOperationalOption("ALL_INCLUSIVE");
    }
    setShouldAutoQuote(true);
  }

  function handleCityTourPackageChange(nextPackage: CityTourPackageOption) {
    const packageConfig =
      CITY_TOUR_PACKAGES.find((pkg) => pkg.value === nextPackage) ?? CITY_TOUR_PACKAGES[1];
    setForm((prev) => ({
      ...prev,
      cityTourPackage: nextPackage,
      estimatedKm: String(packageConfig.kms),
    }));
    setShouldAutoQuote(true);
  }

  function handleAirportPackageChange(nextPackage: AirportPackageOption) {
    const packageConfig =
      AIRPORT_PACKAGES.find((pkg) => pkg.value === nextPackage) ?? AIRPORT_PACKAGES[0];
    setForm((prev) => ({
      ...prev,
      airportPackage: nextPackage,
      estimatedKm: String(packageConfig.kms),
      ageBucket: "ZERO_TO_THREE",
    }));
    setOperationalOption("ALL_INCLUSIVE");
    setShouldAutoQuote(true);
  }

  function updateDraftStopAt(index: number, value: string) {
    setDraftStops((prev) => prev.map((stop, stopIndex) => (stopIndex === index ? value : stop)));
  }

  function addDraftStop() {
    setDraftStops((prev) => [...prev, ""]);
  }

  function removeDraftStop(index: number) {
    setDraftStops((prev) => prev.filter((_, stopIndex) => stopIndex !== index));
  }

  function adjustDraftTripDuration(delta: number) {
    setDraftTripDurationDays((prev) => Math.min(15, Math.max(1, prev + delta)));
  }

  function getSnapIndex(scrollTop: number, maxIndex: number) {
    const index = Math.round(scrollTop / PICKER_ITEM_HEIGHT);
    if (Number.isNaN(index)) {
      return 0;
    }
    return Math.min(Math.max(index, 0), maxIndex);
  }

  function normalizeLoopedScroll(
    laneRef: RefObject<HTMLDivElement | null>,
    snappedIndex: number,
    laneLength: number
  ) {
    const node = laneRef.current;
    if (!node || laneLength <= 0) {
      return;
    }

    const minBand = laneLength;
    const maxBand = laneLength * (PICKER_LOOP_REPEATS - 1);
    if (snappedIndex >= minBand && snappedIndex < maxBand) {
      return;
    }

    const normalizedIndex = getLoopedIndex(snappedIndex % laneLength, laneLength);
    node.scrollTop = normalizedIndex * PICKER_ITEM_HEIGHT;
  }

  function unlockPickerScrollSync() {
    pickerScrollSyncRef.current = false;
    if (pickerUnlockTimeoutRef.current !== null) {
      window.clearTimeout(pickerUnlockTimeoutRef.current);
      pickerUnlockTimeoutRef.current = null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 p-2 shadow-sm md:hidden">
        <button
          type="button"
          onClick={openStopsEditor}
          className="w-full rounded-lg bg-white/10 px-2.5 py-2 text-left hover:bg-white/15"
        >
          <p className="truncate text-[11px] font-semibold text-white">{routeChainSummary}</p>
        </button>
        <div className="mt-1.5 grid grid-cols-[0.9fr_1.35fr_1fr] gap-1.5">
          <TopbarDropdown
            value={form.rideMode}
            options={TRIP_TYPE_OPTIONS}
            onValueChange={handleTripTypeChange}
            ariaLabel="Trip type"
          />
          <button
            type="button"
            onClick={openPickupDateTimeEditor}
            className="rounded-lg border border-white/35 bg-white/10 px-2.5 py-2 text-left text-white hover:bg-white/20"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-100">Date & time</p>
            <p className="truncate text-[11px] font-semibold text-white">{compactDateTimeLabel}</p>
          </button>
          <Button
            onClick={generateQuotes}
            disabled={loadingQuote || Boolean(loadingBookingCategory)}
            className="h-full rounded-lg bg-gradient-to-r from-emerald-400 to-green-300 px-3 text-[13px] font-semibold text-emerald-950 hover:from-emerald-300 hover:to-green-200"
          >
            {loadingQuote ? "Refreshing..." : "Search"}
          </Button>
        </div>
      </div>

      <div className="hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 p-2.5 shadow-sm md:block">
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="min-w-0 flex-1 basis-[12rem]">
            <TopbarDropdown
              value={form.rideMode}
              options={TRIP_TYPE_OPTIONS}
              onValueChange={handleTripTypeChange}
              ariaLabel="Trip type"
            />
          </div>
          <button
            type="button"
            onClick={openFromEditor}
            className="min-w-0 flex-1 basis-[10rem] rounded-md bg-white/10 px-2.5 py-2 text-left hover:bg-white/20"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100">From</p>
            <p className="truncate text-[15px] font-semibold text-white">{form.sourceCity || "Source"}</p>
          </button>
          <button
            type="button"
            onClick={openStopsEditor}
            className="min-w-[6rem] rounded-md bg-white/10 px-2.5 py-2 text-left hover:bg-white/20"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100">Stops</p>
            <p className="truncate text-[13px] font-medium text-white/95">{routeStopsSummary}</p>
          </button>
          <button
            type="button"
            onClick={openToEditor}
            className="min-w-0 flex-1 basis-[10rem] rounded-md bg-white/10 px-2.5 py-2 text-left hover:bg-white/20"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100">To</p>
            <p className="truncate text-[15px] font-semibold text-white">{destinationToken}</p>
          </button>
          <button
            type="button"
            onClick={openPickupDateTimeEditor}
            className="min-w-0 flex-1 basis-[9rem] rounded-md bg-white/10 px-2.5 py-2 text-left hover:bg-white/20"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100">Pick-up date</p>
            <p className="truncate text-[14px] font-semibold text-white">{pickupDateToken}</p>
          </button>
          <button
            type="button"
            onClick={openPickupDateTimeEditor}
            className="min-w-0 flex-1 basis-[8rem] rounded-md bg-white/10 px-2.5 py-2 text-left hover:bg-white/20"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100">Pick-up time</p>
            <p className="truncate text-[14px] font-semibold text-white">{pickupTimeToken}</p>
          </button>
          <div className="flex min-w-[7rem] items-stretch gap-2">
            <Button
              onClick={generateQuotes}
              disabled={loadingQuote || Boolean(loadingBookingCategory)}
              className="h-full min-w-[6.5rem] bg-gradient-to-r from-emerald-400 to-green-300 font-semibold text-emerald-950 hover:from-emerald-300 hover:to-green-200"
            >
              {loadingQuote ? "Refreshing..." : "Search"}
            </Button>
          </div>
        </div>
      </div>

      {form.rideMode === "cityTour" ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            City tour package
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            {CITY_TOUR_PACKAGES.map((pkg) => (
              <button
                key={pkg.value}
                type="button"
                onClick={() => handleCityTourPackageChange(pkg.value)}
                className={
                  form.cityTourPackage === pkg.value
                    ? "rounded-md bg-emerald-600 px-2 py-2 text-xs font-semibold text-white"
                    : "rounded-md border border-emerald-200 bg-white px-2 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                }
              >
                {pkg.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Extra kms and extra hours are charged separately as per selected vehicle.
          </p>
        </div>
      ) : null}

      {form.rideMode === "airportOnly" ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Airport package (all inclusive)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            {AIRPORT_PACKAGES.map((pkg) => (
              <button
                key={pkg.value}
                type="button"
                onClick={() => handleAirportPackageChange(pkg.value)}
                className={
                  form.airportPackage === pkg.value
                    ? "rounded-md bg-emerald-600 px-2 py-2 text-xs font-semibold text-white"
                    : "rounded-md border border-emerald-200 bg-white px-2 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                }
              >
                {pkg.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Airport entry charges are included. Vehicle age is fixed at 0-3 years.
          </p>
        </div>
      ) : null}

      {activeEditor === "from" ? (
        <TopbarOverlay title="From" onClose={() => setActiveEditor(null)} onConfirm={applyFromEditor}>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Search source city</label>
          <LocationAutocompleteInput
            value={draftSourceCity}
            onValueChange={setDraftSourceCity}
            placeholder="Enter pickup city"
            className="w-full"
            inputClassName="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </TopbarOverlay>
      ) : null}

      {activeEditor === "to" ? (
        <TopbarOverlay title="To" onClose={() => setActiveEditor(null)} onConfirm={applyToEditor}>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Search destination city</label>
          <LocationAutocompleteInput
            value={draftDestinationCity}
            onValueChange={setDraftDestinationCity}
            placeholder="Enter destination city"
            className="w-full"
            inputClassName="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </TopbarOverlay>
      ) : null}

      {activeEditor === "stops" ? (
        <TopbarOverlay
          title="Manage stops"
          onClose={() => setActiveEditor(null)}
          onConfirm={applyStopsEditor}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">From</p>
              <LocationAutocompleteInput
                value={draftSourceCity}
                onValueChange={setDraftSourceCity}
                placeholder="Search source city"
                className="w-full [&>div:first-child]:rounded-lg [&>div:first-child]:border [&>div:first-child]:border-emerald-200 [&>div:first-child]:bg-transparent [&>div:first-child]:px-3 [&>div:first-child]:py-2 [&>div:first-child]:transition [&>div:first-child]:focus-within:border-emerald-400 [&>div:first-child]:focus-within:ring-2 [&>div:first-child]:focus-within:ring-emerald-100 [&>div:last-child]:bg-white"
                inputClassName="w-full bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              {draftStops.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No intermediate stops added yet.</p>
              ) : null}
              {draftStops.map((stop, index) => (
                <div key={`stop-${index}`} className="flex items-center gap-2">
                  <LocationAutocompleteInput
                    value={stop}
                    onValueChange={(nextValue) => updateDraftStopAt(index, nextValue)}
                    placeholder={`Stop ${index + 1}`}
                    className="w-full [&>div:first-child]:rounded-lg [&>div:first-child]:border [&>div:first-child]:border-emerald-200 [&>div:first-child]:bg-transparent [&>div:first-child]:px-3 [&>div:first-child]:py-2 [&>div:first-child]:transition [&>div:first-child]:focus-within:border-emerald-400 [&>div:first-child]:focus-within:ring-2 [&>div:first-child]:focus-within:ring-emerald-100 [&>div:last-child]:bg-white"
                    inputClassName="w-full bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeDraftStop(index)}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    -
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addDraftStop}
                className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
              >
                + Add stop
              </Button>
            </div>
            <div className="space-y-1">
              <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">To</p>
              <LocationAutocompleteInput
                value={draftDestinationCity}
                onValueChange={setDraftDestinationCity}
                placeholder="Search destination city"
                className="w-full [&>div:first-child]:rounded-lg [&>div:first-child]:border [&>div:first-child]:border-emerald-200 [&>div:first-child]:bg-transparent [&>div:first-child]:px-3 [&>div:first-child]:py-2 [&>div:first-child]:transition [&>div:first-child]:focus-within:border-emerald-400 [&>div:first-child]:focus-within:ring-2 [&>div:first-child]:focus-within:ring-emerald-100 [&>div:last-child]:bg-white"
                inputClassName="w-full bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </TopbarOverlay>
      ) : null}

      {activeEditor === "pickupDateTime" ? (
        <TopbarOverlay
          title="Select pickup date and time"
          onClose={() => setActiveEditor(null)}
          onConfirm={applyPickupDateTimeEditor}
          confirmLabel="Select"
        >
          <div className="space-y-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-12 -translate-y-1/2 rounded-md border-y-2 border-emerald-400/90 bg-emerald-50/20" />
              <div className="relative z-20 grid grid-cols-[1.6fr_0.5fr_0.2fr_0.5fr_0.6fr] items-center gap-2">
                <div
                  ref={dateColumnRef}
                  className="h-36 overflow-y-auto overscroll-y-contain scroll-smooth snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ WebkitOverflowScrolling: "touch" }}
                  onPointerDown={unlockPickerScrollSync}
                  onWheelCapture={unlockPickerScrollSync}
                  onTouchStart={unlockPickerScrollSync}
                  onScroll={(event) => {
                    if (pickerScrollSyncRef.current) {
                      return;
                    }
                    const index = getSnapIndex(event.currentTarget.scrollTop, dateOptions.length - 1);
                    const nextDate = dateOptions[index]?.value;
                    if (nextDate && nextDate !== draftTripDate) {
                      setDraftTripDate(nextDate);
                    }
                  }}
                >
                  <div style={{ height: `${PICKER_ITEM_HEIGHT}px` }} />
                  {dateOptions.map((option, index) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setDraftTripDate(option.value);
                        if (dateColumnRef.current) {
                          dateColumnRef.current.scrollTo({
                            top: index * PICKER_ITEM_HEIGHT,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className={`h-12 w-full snap-center text-left text-[13px] ${
                        index === selectedDateIndex
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground/55"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <div style={{ height: `${PICKER_ITEM_HEIGHT}px` }} />
                </div>

                <div
                  ref={hourColumnRef}
                  className="h-36 overflow-y-auto overscroll-y-contain scroll-smooth snap-y snap-mandatory text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ WebkitOverflowScrolling: "touch" }}
                  onPointerDown={unlockPickerScrollSync}
                  onWheelCapture={unlockPickerScrollSync}
                  onTouchStart={unlockPickerScrollSync}
                  onScroll={(event) => {
                    if (pickerScrollSyncRef.current) {
                      return;
                    }
                    const index = getSnapIndex(event.currentTarget.scrollTop, loopedHourOptions.length - 1);
                    const nextHour = loopedHourOptions[index];
                    if (nextHour && nextHour !== draftHour) {
                      setDraftHour(nextHour);
                    }
                    normalizeLoopedScroll(hourColumnRef, index, hourOptions.length);
                  }}
                >
                  <div style={{ height: `${PICKER_ITEM_HEIGHT}px` }} />
                  {loopedHourOptions.map((hour, index) => (
                    <button
                      key={`hour-${hour}-${index}`}
                      type="button"
                      onClick={() => {
                        setDraftHour(hour);
                        if (hourColumnRef.current) {
                          hourColumnRef.current.scrollTo({
                            top: index * PICKER_ITEM_HEIGHT,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className={`h-12 w-full snap-center text-[13px] ${
                        hour === draftHour ? "font-semibold text-foreground" : "text-muted-foreground/55"
                      }`}
                    >
                      {String(hour).padStart(2, "0")}
                    </button>
                  ))}
                  <div style={{ height: `${PICKER_ITEM_HEIGHT}px` }} />
                </div>

                <div
                  className="flex h-36 items-center justify-center text-[15px] font-semibold text-foreground"
                  style={{ height: `${PICKER_VIEW_HEIGHT}px` }}
                >
                  :
                </div>

                <div
                  ref={minuteColumnRef}
                  className="h-36 overflow-y-auto overscroll-y-contain scroll-smooth snap-y snap-mandatory text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ WebkitOverflowScrolling: "touch" }}
                  onPointerDown={unlockPickerScrollSync}
                  onWheelCapture={unlockPickerScrollSync}
                  onTouchStart={unlockPickerScrollSync}
                  onScroll={(event) => {
                    if (pickerScrollSyncRef.current) {
                      return;
                    }
                    const index = getSnapIndex(event.currentTarget.scrollTop, loopedMinuteOptions.length - 1);
                    const nextMinute = loopedMinuteOptions[index];
                    if (nextMinute !== undefined && nextMinute !== draftMinute) {
                      setDraftMinute(nextMinute);
                    }
                    normalizeLoopedScroll(minuteColumnRef, index, minuteOptions.length);
                  }}
                >
                  <div style={{ height: `${PICKER_ITEM_HEIGHT}px` }} />
                  {loopedMinuteOptions.map((minute, index) => (
                    <button
                      key={`minute-${minute}-${index}`}
                      type="button"
                      onClick={() => {
                        setDraftMinute(minute);
                        if (minuteColumnRef.current) {
                          minuteColumnRef.current.scrollTo({
                            top: index * PICKER_ITEM_HEIGHT,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className={`h-12 w-full snap-center text-[13px] ${
                        minute === draftMinute
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground/55"
                      }`}
                    >
                      {String(minute).padStart(2, "0")}
                    </button>
                  ))}
                  <div style={{ height: `${PICKER_ITEM_HEIGHT}px` }} />
                </div>

                <div
                  ref={periodColumnRef}
                  className="h-36 overflow-y-auto overscroll-y-contain scroll-smooth snap-y snap-mandatory text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ WebkitOverflowScrolling: "touch" }}
                  onPointerDown={unlockPickerScrollSync}
                  onWheelCapture={unlockPickerScrollSync}
                  onTouchStart={unlockPickerScrollSync}
                  onScroll={(event) => {
                    if (pickerScrollSyncRef.current) {
                      return;
                    }
                    const index = getSnapIndex(event.currentTarget.scrollTop, loopedPeriodOptions.length - 1);
                    const nextPeriod = loopedPeriodOptions[index];
                    if (nextPeriod && nextPeriod !== draftPeriod) {
                      setDraftPeriod(nextPeriod);
                    }
                    normalizeLoopedScroll(periodColumnRef, index, periodOptions.length);
                  }}
                >
                  <div style={{ height: `${PICKER_ITEM_HEIGHT}px` }} />
                  {loopedPeriodOptions.map((period, index) => (
                    <button
                      key={`period-${period}-${index}`}
                      type="button"
                      onClick={() => {
                        setDraftPeriod(period);
                        if (periodColumnRef.current) {
                          periodColumnRef.current.scrollTo({
                            top: index * PICKER_ITEM_HEIGHT,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className={`h-12 w-full snap-center text-[13px] ${
                        period === draftPeriod
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground/55"
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                  <div style={{ height: `${PICKER_ITEM_HEIGHT}px` }} />
                </div>
              </div>
            </div>

            {requiresReturnDate ? (
              <div
                className="rounded-lg border border-emerald-100 bg-emerald-50/30 px-3 py-2"
                onWheel={(event) => {
                  event.preventDefault();
                  adjustDraftTripDuration(event.deltaY > 0 ? 1 : -1);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Return
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDateToken(addDaysToDateString(draftTripDate || todayDate, draftTripDurationDays - 1))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustDraftTripDuration(-1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white text-lg font-semibold text-emerald-800"
                    >
                      -
                    </button>
                    <p className="min-w-[3.25rem] text-center text-sm font-semibold text-foreground">
                      {draftTripDurationDays} day{draftTripDurationDays > 1 ? "s" : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => adjustDraftTripDuration(1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white text-lg font-semibold text-emerald-800"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </TopbarOverlay>
      ) : null}

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
          <div className="hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 px-4 py-3 text-white shadow-sm md:block">
            <div className="grid grid-cols-3 gap-3 text-center">
              <p className="text-sm font-semibold">Trusted cabs</p>
              <p className="text-sm font-semibold">Clean cabs</p>
              <p className="text-sm font-semibold">On-time pickup</p>
            </div>
          </div>
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
                  {(form.rideMode === "cityTour" || form.rideMode === "airportOnly") &&
                  vehicleQuote.preset.apiCategory === "TEMPO_TRAVELLER" ? (
                    <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Coming soon
                    </span>
                  ) : null}
                </article>
              );
            }

            const quote = vehicleQuote.quote;
            const bookingDays = quote.includedDays;
            const operationalBundle = Number(quote.operationalBundleAmount);
            const perKmRateDisplay = `₹${Math.round(Number(quote.perKmRate))}/km`;
            const routeDistanceBase =
              quote.routeDistanceKm ?? quote.usableDistanceKm ?? quote.billableKm;
            const oneWayFixedRoute =
              form.productType === "ONE_WAY" &&
              quote.lineItems.some((item) => item.lineType === "CORRIDOR_FARE");
            const cityTourFixedPackage = quote.lineItems.some(
              (item) => item.lineType === "CITY_TOUR_PACKAGE"
            );
            const cityTourExtraKmInfo = quote.lineItems.find(
              (item) => item.lineType === "CITY_TOUR_EXTRA_KM_RATE"
            )?.description;
            const cityTourExtraHourInfo = quote.lineItems.find(
              (item) => item.lineType === "CITY_TOUR_EXTRA_HOUR_RATE"
            )?.description;
            const airportFixedPackage = quote.lineItems.some(
              (item) => item.lineType === "AIRPORT_PACKAGE"
            );
            const operationalOptionLocked = oneWayFixedRoute || airportFixedPackage;
            const effectiveOperationalOption: OperationalOption = operationalOptionLocked
              ? "ALL_INCLUSIVE"
              : operationalOption;
            const distanceSourceLabel =
              form.estimatedKm.trim() ? "manual distance override" : "Google Maps";
            const includedKmDisplay = oneWayFixedRoute
              ? Math.max(Math.round(routeDistanceBase), 0)
              : Math.max(Math.round(routeDistanceBase), quote.totalIncludedKm);
            const rawEstimatedTotal = Number(quote.estimatedTotal);
            const displayedTotal =
              effectiveOperationalOption === "SELF_PAY"
                ? Math.max(0, rawEstimatedTotal - operationalBundle).toFixed(2)
                : quote.estimatedTotal;
            const vehicleRateBadgeLabel = airportFixedPackage
              ? "Extra km not applicable"
              : cityTourFixedPackage
              ? `Extra km ₹${Math.round(Number(quote.perKmRate))}/km`
              : perKmRateDisplay;

            return (
              <article
                key={vehicleQuote.preset.id}
                className="space-y-0 rounded-xl border border-border bg-white p-4 shadow-sm md:space-y-4"
              >
                <div className="hidden items-center justify-start md:flex">
                  <div className="items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 md:inline-flex">
                    <ClayIcon name="verified" size={24} alt="Verified fare" />
                    Verified fare
                  </div>
                </div>

                <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_21.6rem] lg:items-start lg:gap-3">
                    <div className="min-w-0 space-y-3">
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
                            className="h-[92px] w-[147px] rounded-md border border-emerald-100 object-cover"
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

                      <div className="grid grid-cols-[0.45fr_0.55fr] gap-2 md:grid-cols-2">
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
                          {airportFixedPackage ? (
                            <div className="flex w-full items-center justify-between rounded-md border border-border bg-emerald-50 px-2 py-1.5 text-left text-[11px] font-semibold text-emerald-700">
                              <span>0-3 years</span>
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Locked
                              </span>
                            </div>
                          ) : (
                            <CompactDropdown
                              value={form.ageBucket}
                              options={AGE_OPTIONS}
                              onValueChange={(next) => handleAgeChange(next)}
                              ariaLabel="Vehicle age"
                            />
                          )}
                          <p className="hidden text-[11px] text-muted-foreground md:block">
                            {airportFixedPackage
                              ? "Airport package uses newer cabs."
                              : form.ageBucket === "ZERO_TO_THREE"
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
                            {vehicleRateBadgeLabel}
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
                                oneWayFixedRoute
                                  ? "For eligible one-way routes, toll, parking, and driver food are not added in the fare."
                                  : airportFixedPackage
                                    ? "Airport package fare is all inclusive and includes airport entry charges."
                                  : cityTourFixedPackage
                                    ? "City tour package fares are fixed. You can choose Self pay or All inclusive based on your preference."
                                  : effectiveOperationalOption === "ALL_INCLUSIVE"
                                  ? "All-inclusive selected: toll, parking, and driver food allowance are included in your fare."
                                  : "Self-pay selected: toll, parking, and driver food allowance are paid separately during the trip."
                              }
                            />
                          </div>
                          {operationalOptionLocked ? (
                            <div className="flex w-full items-center justify-between rounded-md border border-border bg-emerald-50 px-2 py-1.5 text-left text-[11px] font-semibold text-emerald-700">
                              <span>All inclusive</span>
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Locked
                              </span>
                            </div>
                          ) : (
                            <CompactDropdown
                              value={operationalOption}
                              options={OPERATIONAL_OPTIONS}
                              onValueChange={(next) => setOperationalOption(next)}
                              ariaLabel="Toll parking and food option"
                            />
                          )}
                          <p
                            className={`text-[11px] text-muted-foreground ${
                              effectiveOperationalOption === "SELF_PAY" ? "block" : "hidden md:block"
                            }`}
                          >
                            {oneWayFixedRoute
                              ? "Not added for eligible one-way routes."
                              : airportFixedPackage
                                ? "All inclusive is locked for airport package."
                              : cityTourFixedPackage
                                ? "Self pay selected by default for city tour."
                              : effectiveOperationalOption === "ALL_INCLUSIVE"
                              ? "All-inclusive selected."
                              : "Pay separately during trip"}
                          </p>
                          {effectiveOperationalOption === "ALL_INCLUSIVE" &&
                          Number(quote.operationalBundleAmount) > 0 ? (
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
                          <InlineInfo
                            label="Distance source"
                            content={`Distance source: ${distanceSourceLabel}. This estimate uses mapped route distance for fare transparency. Actual billable km follows package rules.`}
                          />
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

                    <div className="w-full rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 lg:w-[21.6rem]">
                      <p className="text-sm font-semibold text-emerald-700">Affordable fare</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                        {currency(displayedTotal)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {oneWayFixedRoute
                          ? "One-way fare shown. Toll, parking and driver food all included."
                          : airportFixedPackage
                            ? "Airport fare shown. All inclusive with airport entry charges."
                          : cityTourFixedPackage
                            ? "City tour fixed package fare shown."
                          : effectiveOperationalOption === "ALL_INCLUSIVE"
                          ? "Includes base fare + operational bundle."
                          : "Base fare shown. Tolls, parking and driver food payable during trip."}
                      </p>
                      {cityTourFixedPackage ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {cityTourExtraKmInfo}
                          {cityTourExtraKmInfo && cityTourExtraHourInfo ? " • " : ""}
                          {cityTourExtraHourInfo}
                        </p>
                      ) : null}
                      <Button
                        variant="tamayoGradient"
                        className="mt-3 w-full"
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
                            {includedKmDisplay} km
                          </p>
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
