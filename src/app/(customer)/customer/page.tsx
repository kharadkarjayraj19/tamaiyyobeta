"use client";

import {
  BadgeIndianRupee,
  ArrowRight,
  BadgeCheck,
  Car,
  Clock3,
  Info,
  LocateFixed,
  Minus,
  Plus,
  Headphones,
  Map,
  MapPin,
  MapPinned,
  ShieldCheck,
  Star,
  TicketPercent,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LocationAutocompleteInput } from "@/components/shared/location/location-autocomplete-input";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  isNew?: boolean;
};

type InspirationCard = {
  badge: string;
  title: string;
  subtitle: string;
  highlights: string[];
  duration: string;
  distance: string;
  href: string;
};

const quickActions: QuickAction[] = [
  {
    title: "Plan Itinerary",
    description: "Create your trip and add places in minutes",
    href: "/customer/booking-quote",
    icon: Map,
    isNew: true,
  },
  {
    title: "Explore Itineraries",
    description: "Browse sample plans to build your route faster",
    href: "/customer",
    icon: MapPinned,
  },
  {
    title: "My Trips",
    description: "View upcoming and completed trips",
    href: "/customer",
    icon: Car,
  },
  {
    title: "Offers",
    description: "Discover active deals for your route",
    href: "/customer",
    icon: TicketPercent,
  },
];

const inspirationCards: InspirationCard[] = [
  {
    badge: "3 Days Trip",
    title: "See how Parth planned his Hyderabad tour",
    subtitle: "Historical sites, iconic places, and local food experiences.",
    highlights: ["Hyderabad", "Ramoji Film City", "Golconda Fort"],
    duration: "3 Days / 2 Nights",
    distance: "420 km",
    href: "/customer",
  },
  {
    badge: "5 Days Trip",
    title: "See how Yash planned his Maharashtra tour",
    subtitle: "City highlights, heritage stops, and scenic highway drives.",
    highlights: ["Mumbai", "Pune", "Nashik", "Sambhajinagar"],
    duration: "5 Days / 4 Nights",
    distance: "780 km",
    href: "/customer",
  },
];

const trustStats = [
  { value: "10,000+", label: "Happy customers", helper: "Travelers trust Tamayo", icon: Users },
  { value: "4.8", label: "Customer rating", helper: "Based on verified reviews", icon: Star },
  { value: "300+", label: "Cities covered", helper: "Across major outstation routes", icon: MapPinned },
  { value: "24/7", label: "Support", helper: "Real people, always available", icon: Headphones },
];

type RideMode = "oneWay" | "multiCityRoundTrip" | "cityTour" | "airportOnly";
type CityTourPackage = "8h80km" | "12h120km";

const rideModes: Array<{ id: RideMode; label: string }> = [
  { id: "oneWay", label: "One way" },
  { id: "multiCityRoundTrip", label: "Multi city / Round trip" },
  { id: "cityTour", label: "City tour" },
  { id: "airportOnly", label: "Airport only" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours24 = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return {
    value: `${`${hours24}`.padStart(2, "0")}:${minutes}`,
    label: `${hours12}:${minutes} ${meridiem}`,
  };
});

type TimeDropdownProps = {
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  minimumValue?: string | null;
};

function TimeDropdown({ value, onValueChange, ariaLabel, minimumValue }: TimeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = TIME_OPTIONS.find((option) => option.value === value) ?? TIME_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function toggleDropdown() {
    if (!isOpen && rootRef.current) {
      const bounds = rootRef.current.getBoundingClientRect();
      const estimatedDropdownHeight = 260;
      const spaceBelow = window.innerHeight - bounds.bottom;
      const spaceAbove = bounds.top;
      setOpenUpward(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow);
    }

    setIsOpen((previousValue) => !previousValue);
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={toggleDropdown}
        className="w-full bg-transparent text-left font-medium text-foreground outline-none"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
      >
        {selectedOption.label}
      </button>

      {isOpen ? (
        <div
          className={
            openUpward
              ? "absolute bottom-[calc(100%+0.35rem)] left-0 right-0 z-40 max-h-64 overflow-y-auto rounded-md border border-border bg-card py-1 shadow-xl"
              : "absolute top-[calc(100%+0.35rem)] left-0 right-0 z-40 max-h-64 overflow-y-auto rounded-md border border-border bg-card py-1 shadow-xl"
          }
        >
          {TIME_OPTIONS.map((timeOption) => (
            <button
              key={timeOption.value}
              type="button"
              onClick={() => {
                if (minimumValue && timeOption.value < minimumValue) {
                  return;
                }
                onValueChange(timeOption.value);
                setIsOpen(false);
              }}
              className={
                minimumValue && timeOption.value < minimumValue
                  ? "block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-muted-foreground opacity-50"
                  : timeOption.value === value
                  ? "block w-full bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-700"
                  : "block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
              }
            >
              {timeOption.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateString(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function getMinimumFutureTimeValue(now: Date = new Date()) {
  const nextSlot = new Date(now);
  nextSlot.setSeconds(0, 0);

  const currentMinutes = nextSlot.getMinutes();
  const remainder = currentMinutes % 30;

  if (remainder !== 0) {
    nextSlot.setMinutes(currentMinutes + (30 - remainder));
  }

  const hours = `${nextSlot.getHours()}`.padStart(2, "0");
  const minutes = `${nextSlot.getMinutes()}`.padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getFieldTextClass(value: string) {
  return value.trim()
    ? "w-full bg-transparent font-medium text-foreground outline-none placeholder:text-muted-foreground"
    : "w-full bg-transparent text-muted-foreground outline-none placeholder:text-muted-foreground";
}

function getCityTokenFromLocation(location: string) {
  return location
    .split(",")[0]
    ?.trim();
}

export default function CustomerOverviewPage() {
  const [selectedRideMode, setSelectedRideMode] = useState<RideMode>("oneWay");
  const [cityTourPackage, setCityTourPackage] = useState<CityTourPackage>("8h80km");
  const [pickupLocationInput, setPickupLocationInput] = useState("");
  const [dropoffLocationInput, setDropoffLocationInput] = useState("");
  const [stopLocations, setStopLocations] = useState<string[]>([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [tripStartTime, setTripStartTime] = useState("09:00");
  const [tripEndTime, setTripEndTime] = useState("18:00");
  const [nowReference, setNowReference] = useState(() => Date.now());
  const todayDate = useMemo(() => toDateInputValue(new Date()), []);
  const minimumFutureTimeValue = useMemo(
    () => getMinimumFutureTimeValue(new Date(nowReference)),
    [nowReference]
  );
  const isTourMode = selectedRideMode === "multiCityRoundTrip" || selectedRideMode === "cityTour";
  const minimumStartTime =
    tripStartDate && tripStartDate === todayDate ? minimumFutureTimeValue : null;
  const minimumEndTimeBase =
    tripEndDate && tripEndDate === todayDate ? minimumFutureTimeValue : null;
  const minimumEndTime =
    tripEndDate && tripStartDate && tripEndDate === tripStartDate
      ? minimumEndTimeBase
        ? minimumEndTimeBase > tripStartTime
          ? minimumEndTimeBase
          : tripStartTime
        : tripStartTime
      : minimumEndTimeBase;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowReference(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (minimumStartTime && tripStartTime < minimumStartTime) {
      setTripStartTime(minimumStartTime);
    }
  }, [minimumStartTime, tripStartTime]);

  useEffect(() => {
    if (minimumEndTime && tripEndTime < minimumEndTime) {
      setTripEndTime(minimumEndTime);
    }
  }, [minimumEndTime, tripEndTime]);

  function updateStopLocation(index: number, value: string) {
    setStopLocations((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addStopLocation() {
    setStopLocations((prev) => (prev.length >= 10 ? prev : [...prev, ""]));
  }

  function removeStopLocation(index: number) {
    setStopLocations((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function detectPickupLocation() {
    if (!navigator.geolocation) {
      setLocationHint("Location detection is not supported on this device.");
      return;
    }

    setIsDetectingLocation(true);
    setLocationHint("Detecting your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        setPickupLocationInput(`Current location (${lat}, ${lng})`);
        setLocationHint("Pickup location detected. You can edit it if needed.");
        setIsDetectingLocation(false);
      },
      () => {
        setLocationHint("Unable to detect location. Please enter pickup manually.");
        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  function updateTripStartDate(nextValue: string) {
    const normalizedStart = nextValue < todayDate ? todayDate : nextValue;
    let normalizedEnd = tripEndDate;

    if (normalizedEnd && normalizedEnd < normalizedStart) {
      normalizedEnd = normalizedStart;
    }

    if (normalizedEnd) {
      const maxEndForStart = addDaysToDateString(normalizedStart, 6);
      if (normalizedEnd > maxEndForStart) {
        normalizedEnd = maxEndForStart;
      }
    }

    setTripStartDate(normalizedStart);
    setTripEndDate(normalizedEnd);
  }

  function updateTripEndDate(nextValue: string) {
    const normalizedEndBase = nextValue < todayDate ? todayDate : nextValue;
    let normalizedStart = tripStartDate;
    let normalizedEnd = normalizedEndBase;

    if (!normalizedStart) {
      normalizedStart = normalizedEnd;
    } else if (normalizedEnd < normalizedStart) {
      normalizedStart = normalizedEnd;
    }

    const maxEndForStart = addDaysToDateString(normalizedStart, 6);
    if (normalizedEnd > maxEndForStart) {
      normalizedEnd = maxEndForStart;
    }

    setTripStartDate(normalizedStart);
    setTripEndDate(normalizedEnd);
  }

  const quoteHref = useMemo(() => {
    const params = new URLSearchParams();

    const mappedProductType =
      selectedRideMode === "oneWay" || selectedRideMode === "airportOnly"
        ? "ONE_WAY"
        : selectedRideMode === "multiCityRoundTrip"
          ? "ROUND_TRIP"
          : "MULTI_CITY";
    const normalizedStops = stopLocations.map((location) => location.trim()).filter(Boolean);
    const normalizedDropoff = dropoffLocationInput.trim();
    const normalizedPickup = pickupLocationInput.trim();
    const sourceCityToken = normalizedPickup ? getCityTokenFromLocation(normalizedPickup) : "";
    const destinationCityToken = normalizedDropoff
      ? getCityTokenFromLocation(normalizedDropoff)
      : "";

    params.set("productType", mappedProductType);
    params.set("rideMode", selectedRideMode);
    if (normalizedPickup) {
      params.set("pickupLocation", normalizedPickup);
    }

    if (sourceCityToken) {
      params.set("sourceCity", sourceCityToken);
    }

    if (destinationCityToken) {
      params.set("destinationCity", destinationCityToken);
    }

    normalizedStops.forEach((stop) => params.append("drop", stop));

    if (normalizedDropoff) {
      params.append("drop", normalizedDropoff);
    }

    if (selectedRideMode === "cityTour") {
      params.set("cityTourPackage", cityTourPackage);
      params.set("estimatedKm", cityTourPackage === "8h80km" ? "80" : "120");
    }

    if (tripStartDate) {
      params.set("tripStartDate", `${tripStartDate}T${tripStartTime}`);
    }

    if (isTourMode && tripEndDate) {
      params.set("tripEndDate", `${tripEndDate}T${tripEndTime}`);
    }

    return `/customer/booking-quote?${params.toString()}`;
  }, [
    cityTourPackage,
    dropoffLocationInput,
    isTourMode,
    pickupLocationInput,
    selectedRideMode,
    stopLocations,
    tripEndDate,
    tripEndTime,
    tripStartDate,
    tripStartTime,
  ]);

  const reservedDays = useMemo(() => {
    if (!tripStartDate || !tripEndDate || !isTourMode) {
      return null;
    }

    const start = new Date(`${tripStartDate}T00:00:00`);
    const end = new Date(`${tripEndDate}T00:00:00`);
    const durationMs = end.getTime() - start.getTime();
    const days = Math.floor(durationMs / (1000 * 60 * 60 * 24)) + 1;

    return days > 0 ? days : 1;
  }, [isTourMode, tripEndDate, tripStartDate]);

  return (
    <div className="space-y-5 sm:space-y-7">
      <section className="relative overflow-hidden border border-border bg-white shadow-sm">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-1/2 hidden h-[82%] w-[50%] -translate-y-1/2 md:block">
            <Image
              src="/images/tamayo-fleet-sticker.jpg"
              alt=""
              fill
              priority
              className="object-contain object-right"
            />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Ride</h2>
          <div className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
            <span>Request a ride</span>
            <span>Reserve a ride</span>
            <span>See prices</span>
            <span>Explore ride options</span>
            <span>Airport rides</span>
          </div>
        </div>

        <div className="relative z-10 p-4 sm:p-6 lg:min-h-[32rem]">
          <div className="max-w-[40rem]">
            <div className="space-y-4">
              <div className="text-sm font-medium text-foreground">
                Pune, IN <span className="ml-1 underline">Change city</span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Request a ride
              </h1>
              <div className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                Schedule my tour
              </div>

              <div className="w-full lg:w-[85%]">
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold uppercase tracking-wide sm:grid-cols-4">
                  {rideModes.map((mode) => {
                    const isSelected = mode.id === selectedRideMode;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedRideMode(mode.id)}
                        className={
                          isSelected
                            ? "rounded-md bg-emerald-600 px-2 py-2 text-white"
                            : "rounded-md border border-emerald-100 bg-emerald-50 px-2 py-2 text-emerald-700"
                        }
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>

                {selectedRideMode === "cityTour" ? (
                  <div className="mt-2 rounded-md border border-emerald-100 bg-emerald-50 p-2.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        City tour package
                      </p>
                      <span className="group relative inline-flex">
                        <Info className="h-3.5 w-3.5 cursor-help text-emerald-700" />
                        <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 hidden w-60 -translate-x-1/2 rounded-md bg-foreground px-2.5 py-2 text-[11px] font-normal normal-case leading-relaxed text-background shadow-lg group-hover:block">
                          City tour means you can travel anywhere within the city. Extra hours
                          and extra kms are charged extra.
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCityTourPackage("8h80km")}
                        className={
                          cityTourPackage === "8h80km"
                            ? "rounded-md bg-emerald-600 px-2 py-2 text-xs font-semibold text-white"
                            : "rounded-md border border-emerald-200 bg-white px-2 py-2 text-xs font-semibold text-emerald-700"
                        }
                      >
                        8 hours / 80 km
                      </button>
                      <button
                        type="button"
                        onClick={() => setCityTourPackage("12h120km")}
                        className={
                          cityTourPackage === "12h120km"
                            ? "rounded-md bg-emerald-600 px-2 py-2 text-xs font-semibold text-white"
                            : "rounded-md border border-emerald-200 bg-white px-2 py-2 text-xs font-semibold text-emerald-700"
                        }
                      >
                        12 hours / 120 km
                      </button>
                    </div>
                  </div>
                ) : null}

                {selectedRideMode === "multiCityRoundTrip" ? (
                  <div className="mt-2 rounded-md border border-emerald-100 bg-emerald-50 p-2.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Multi city / Round trip info
                      </p>
                      <span className="group relative inline-flex">
                        <Info className="h-3.5 w-3.5 cursor-help text-emerald-700" />
                        <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 hidden w-72 -translate-x-1/2 rounded-md bg-foreground px-2.5 py-2 text-[11px] font-normal normal-case leading-relaxed text-background shadow-lg group-hover:block">
                          Select this option if you want to travel to multiple cities. For
                          example, if your route is Nashik to Pune to Chhatrapati Sambhajinagar,
                          you will be charged round trip till Nashik.
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={addStopLocation}
                        disabled={stopLocations.length >= 10}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add stop
                      </button>
                      <span className="group relative inline-flex">
                        <Info className="h-3.5 w-3.5 cursor-help text-emerald-700" />
                        <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 hidden w-72 -translate-x-1/2 rounded-md bg-foreground px-2.5 py-2 text-[11px] font-normal normal-case leading-relaxed text-background shadow-lg group-hover:block">
                          Add another stop between pickup and final dropoff. Multi-city pricing
                          is calculated in round-trip mode from your source city.
                        </span>
                      </span>
                    </div>
                  </div>
                ) : null}

                {selectedRideMode === "oneWay" ? (
                  <div className="mt-2 rounded-md border border-emerald-100 bg-emerald-50 p-2.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        One way info
                      </p>
                      <span className="group relative inline-flex">
                        <Info className="h-3.5 w-3.5 cursor-help text-emerald-700" />
                        <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 hidden w-72 -translate-x-1/2 rounded-md bg-foreground px-2.5 py-2 text-[11px] font-normal normal-case leading-relaxed text-background shadow-lg group-hover:block">
                          One-way fares are available only on selected high-demand routes. If
                          your route is not eligible, choose Multi city / Round trip to continue
                          booking.
                        </span>
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="mt-2 space-y-2">
                  <div className="space-y-1.5">
                    <LocationAutocompleteInput
                      value={pickupLocationInput}
                      onValueChange={setPickupLocationInput}
                      placeholder="Pickup location"
                      leadingIcon={<MapPin className="h-4 w-4 shrink-0 text-emerald-600" />}
                      inputClassName={getFieldTextClass(pickupLocationInput)}
                      trailingContent={
                        <button
                          type="button"
                          onClick={detectPickupLocation}
                          disabled={isDetectingLocation}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <LocateFixed className="h-3.5 w-3.5" />
                          {isDetectingLocation ? "Detecting..." : "Detect my location"}
                        </button>
                      }
                    />
                    {locationHint ? (
                      <p className="text-xs text-muted-foreground">{locationHint}</p>
                    ) : null}
                  </div>

                  {selectedRideMode === "multiCityRoundTrip" ? (
                    <>
                      {stopLocations.map((location, index) => (
                        <LocationAutocompleteInput
                          key={`stop-${index}`}
                          value={location}
                          onValueChange={(value) => updateStopLocation(index, value)}
                          placeholder={`Stop ${index + 1}`}
                          leadingIcon={<MapPinned className="h-4 w-4 shrink-0 text-emerald-600" />}
                          inputClassName={getFieldTextClass(location)}
                          trailingContent={
                            <button
                              type="button"
                              onClick={() => removeStopLocation(index)}
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100"
                              aria-label={`Remove stop ${index + 1}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                      ))}

                      <LocationAutocompleteInput
                        value={dropoffLocationInput}
                        onValueChange={setDropoffLocationInput}
                        placeholder="Dropoff location"
                        leadingIcon={<MapPinned className="h-4 w-4 text-emerald-600" />}
                        inputClassName={getFieldTextClass(dropoffLocationInput)}
                      />
                    </>
                  ) : (
                    <LocationAutocompleteInput
                      value={dropoffLocationInput}
                      onValueChange={setDropoffLocationInput}
                      placeholder="Dropoff location"
                      leadingIcon={<MapPinned className="h-4 w-4 text-emerald-600" />}
                      inputClassName={getFieldTextClass(dropoffLocationInput)}
                    />
                  )}
                </div>

                {isTourMode ? (
                  <div className="mt-2 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Start date
                        </span>
                        <span className="flex items-center gap-2 rounded-md bg-muted px-3 py-3 text-sm">
                          <Clock3 className="h-4 w-4 text-emerald-600" />
                          <input
                            type="date"
                            value={tripStartDate}
                            min={todayDate}
                            onChange={(event) => updateTripStartDate(event.target.value)}
                            className={
                              tripStartDate
                                ? "w-full bg-transparent font-medium text-foreground outline-none"
                                : "w-full bg-transparent text-muted-foreground outline-none"
                            }
                            aria-label="Trip start date"
                          />
                        </span>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Start time
                        </span>
                        <span className="flex items-center gap-2 rounded-md bg-muted px-3 py-3 text-sm">
                          <Clock3 className="h-4 w-4 text-emerald-600" />
                          <TimeDropdown
                            value={tripStartTime}
                            onValueChange={setTripStartTime}
                            ariaLabel="Trip start time"
                            minimumValue={minimumStartTime}
                          />
                        </span>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          End date
                        </span>
                        <span className="flex items-center gap-2 rounded-md bg-muted px-3 py-3 text-sm">
                          <Car className="h-4 w-4 text-emerald-600" />
                          <input
                            type="date"
                            value={tripEndDate}
                            min={tripStartDate || todayDate}
                            max={addDaysToDateString(tripStartDate || todayDate, 6)}
                            onChange={(event) => updateTripEndDate(event.target.value)}
                            className={
                              tripEndDate
                                ? "w-full bg-transparent font-medium text-foreground outline-none"
                                : "w-full bg-transparent text-muted-foreground outline-none"
                            }
                            aria-label="Trip end date"
                          />
                        </span>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          End time
                        </span>
                        <span className="flex items-center gap-2 rounded-md bg-muted px-3 py-3 text-sm">
                          <Clock3 className="h-4 w-4 text-emerald-600" />
                          <TimeDropdown
                            value={tripEndTime}
                            onValueChange={setTripEndTime}
                            ariaLabel="Trip end time"
                            minimumValue={minimumEndTime}
                          />
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum 7 days allowed between start and end dates.
                    </p>
                    {reservedDays ? (
                      <p className="text-sm font-medium text-emerald-700">
                        You are reserving vehicle for {reservedDays} day
                        {reservedDays > 1 ? "s" : ""}.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Pickup date
                      </span>
                      <span className="flex items-center gap-2 rounded-md bg-muted px-3 py-3 text-sm">
                        <Clock3 className="h-4 w-4 text-emerald-600" />
                        <input
                          type="date"
                          value={tripStartDate}
                          min={todayDate}
                          onChange={(event) => updateTripStartDate(event.target.value)}
                          className={
                            tripStartDate
                              ? "w-full bg-transparent font-medium text-foreground outline-none"
                              : "w-full bg-transparent text-muted-foreground outline-none"
                          }
                          aria-label="Pickup date"
                        />
                      </span>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Pickup time
                      </span>
                      <span className="flex items-center gap-2 rounded-md bg-muted px-3 py-3 text-sm">
                        <Car className="h-4 w-4 text-emerald-600" />
                        <TimeDropdown
                          value={tripStartTime}
                          onValueChange={setTripStartTime}
                          ariaLabel="Pickup time"
                          minimumValue={minimumStartTime}
                        />
                      </span>
                    </label>
                  </div>
                )}

                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={quoteHref}
                    className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto sm:min-w-[10rem]"
                  >
                    See prices
                  </Link>
                  <div className="flex items-center gap-4 text-sm text-foreground">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Easy cancellation
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <BadgeCheck className="h-4 w-4 text-emerald-600" />
                      New cars guaranteed
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <BadgeIndianRupee className="h-4 w-4 text-emerald-600" />
                      Best price and best drivers
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 sm:px-6 lg:px-8">
        <section className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group min-w-[14rem] rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  {item.isNew ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  Explore
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-5 space-y-3 sm:mt-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                See how others planned their trips
              </h2>
              <p className="text-sm text-muted-foreground">
                Sample itinerary ideas to help you plan smarter and faster.
              </p>
            </div>
            <Link
              href="/customer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              View all itineraries
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-2">
            {inspirationCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group block rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="space-y-1.5 p-3">
                  <div className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    {card.badge}
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">{card.title}</h3>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {card.highlights.slice(0, 4).map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {card.duration}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPinned className="h-3 w-3" />
                      {card.distance}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    View itinerary idea
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 shadow-sm sm:hidden">
          {trustStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-lg border border-border bg-background p-3">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{stat.value}</p>
                <p className="text-xs font-medium text-foreground">{stat.label}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-5 hidden gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid sm:grid-cols-2 xl:grid-cols-4">
          {trustStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-lg border border-border bg-background p-4">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">{stat.value}</p>
                <p className="text-sm font-medium text-foreground">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.helper}</p>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
