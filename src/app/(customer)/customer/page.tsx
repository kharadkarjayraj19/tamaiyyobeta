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
import type { ComponentType, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LocationAutocompleteInput } from "@/components/shared/location/location-autocomplete-input";
import { Button } from "@/components/ui/button";

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

const PICKER_ITEM_HEIGHT = 48;
const PICKER_VIEW_HEIGHT = 144;
const PICKER_LOOP_REPEATS = 7;

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

function formatDateToken(dateValue: string) {
  if (!dateValue) {
    return "Select date";
  }
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatTimeToken(timeValue: string) {
  if (!timeValue) {
    return "Pick time";
  }
  const [hourToken = "09", minuteToken = "00"] = timeValue.split(":");
  const hours24 = Number(hourToken);
  const minutes = Number(minuteToken);
  if (Number.isNaN(hours24) || Number.isNaN(minutes)) {
    return timeValue;
  }
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${`${minutes}`.padStart(2, "0")} ${period}`;
}

function getTwelveHourParts(timeValue: string): { hour: number; minute: number; period: "AM" | "PM" } {
  const [hourToken = "09", minuteToken = "00"] = timeValue.split(":");
  const hours24 = Number(hourToken);
  const minutes = Number(minuteToken);
  if (Number.isNaN(hours24) || Number.isNaN(minutes)) {
    return { hour: 9, minute: 0, period: "AM" };
  }
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hour, minute: minutes, period };
}

function toTwentyFourHourTime(hour: number, minute: number, period: "AM" | "PM") {
  const hours24 = period === "PM" ? (hour % 12) + 12 : hour % 12;
  return `${`${hours24}`.padStart(2, "0")}:${`${minute}`.padStart(2, "0")}`;
}

function getDefaultPickupValues(now: Date = new Date()) {
  const value = new Date(now);
  value.setSeconds(0, 0);
  value.setMinutes(value.getMinutes() + 60);

  const remainder = value.getMinutes() % 15;
  if (remainder !== 0) {
    value.setMinutes(value.getMinutes() + (15 - remainder));
  }

  return {
    date: toDateInputValue(value),
    time: `${`${value.getHours()}`.padStart(2, "0")}:${`${value.getMinutes()}`.padStart(2, "0")}`,
  };
}

function formatCompactDateChip(dateValue: string) {
  if (!dateValue) {
    return "";
  }
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }
  const dayMonth = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
  return dayMonth;
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

function getLoopedIndex(baseIndex: number, laneLength: number) {
  const centerBand = Math.floor(PICKER_LOOP_REPEATS / 2) * laneLength;
  return centerBand + baseIndex;
}

function getFieldTextClass(value: string) {
  return value.trim()
    ? "w-full bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground sm:text-[13px]"
    : "w-full bg-transparent text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground sm:text-[13px]";
}

function getCityTokenFromLocation(location: string) {
  return location
    .split(",")[0]
    ?.trim();
}

export default function CustomerOverviewPage() {
  const defaultPickupRef = useRef(getDefaultPickupValues());
  const [selectedRideMode, setSelectedRideMode] = useState<RideMode>("oneWay");
  const [cityTourPackage, setCityTourPackage] = useState<CityTourPackage>("8h80km");
  const [pickupLocationInput, setPickupLocationInput] = useState("");
  const [dropoffLocationInput, setDropoffLocationInput] = useState("");
  const [stopLocations, setStopLocations] = useState<string[]>([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [tripStartDate, setTripStartDate] = useState(defaultPickupRef.current.date);
  const [tripEndDate, setTripEndDate] = useState(defaultPickupRef.current.date);
  const [tripStartTime, setTripStartTime] = useState(defaultPickupRef.current.time);
  const [tripEndTime, setTripEndTime] = useState("23:00");
  const [isDateTimeOverlayOpen, setIsDateTimeOverlayOpen] = useState(false);
  const [draftTripDate, setDraftTripDate] = useState("");
  const [draftHour, setDraftHour] = useState(9);
  const [draftMinute, setDraftMinute] = useState(0);
  const [draftPeriod, setDraftPeriod] = useState<"AM" | "PM">("AM");
  const [draftTripDurationDays, setDraftTripDurationDays] = useState(1);
  const [nowReference, setNowReference] = useState(() => Date.now());
  const dateTimeDropdownRef = useRef<HTMLDivElement | null>(null);
  const dateTimeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dateColumnRef = useRef<HTMLDivElement | null>(null);
  const hourColumnRef = useRef<HTMLDivElement | null>(null);
  const minuteColumnRef = useRef<HTMLDivElement | null>(null);
  const periodColumnRef = useRef<HTMLDivElement | null>(null);
  const pickerScrollSyncRef = useRef(false);
  const pickerPositionFrameRef = useRef<number | null>(null);
  const pickerStyleRef = useRef<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [dateTimeDropdownStyle, setDateTimeDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const todayDate = useMemo(() => toDateInputValue(new Date()), []);
  const minimumFutureTimeValue = useMemo(
    () => getMinimumFutureTimeValue(new Date(nowReference)),
    [nowReference]
  );
  const isTourMode = selectedRideMode === "multiCityRoundTrip" || selectedRideMode === "cityTour";
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
  const selectedTripDays = useMemo(() => {
    if (!tripStartDate || !tripEndDate) {
      return 1;
    }
    const start = new Date(`${tripStartDate}T00:00:00`);
    const end = new Date(`${tripEndDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 1;
    }
    const durationMs = end.getTime() - start.getTime();
    const days = Math.floor(durationMs / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 1;
  }, [tripEndDate, tripStartDate]);
  const compactDateTimeLabel = tripStartDate
    ? `${formatCompactDateChip(tripStartDate)}, ${formatTimeToken(tripStartTime)} - ${formatCompactDateChip(tripEndDate || tripStartDate)}, ${formatTimeToken(tripEndTime || "23:00")}`
    : "Pick date & time";
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

  useEffect(() => {
    if (!isDateTimeOverlayOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!dateTimeDropdownRef.current?.contains(event.target as Node)) {
        setIsDateTimeOverlayOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDateTimeOverlayOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isDateTimeOverlayOpen]);

  useEffect(() => {
    if (!isDateTimeOverlayOpen) {
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
      pickerScrollSyncRef.current = false;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      pickerScrollSyncRef.current = false;
    };
  }, [isDateTimeOverlayOpen]);

  useEffect(() => {
    if (!isDateTimeOverlayOpen) {
      return;
    }

    function computeDropdownStyle() {
      if (!dateTimeTriggerRef.current) {
        return null;
      }
      const triggerRect = dateTimeTriggerRef.current.getBoundingClientRect();
      const viewportPadding = 12;
      const edgeGap = 8;
      const minPickerHeight = 240;
      const maxPickerHeight = window.innerHeight - viewportPadding * 2;
      const preferredWidth = Math.min(520, Math.max(320, triggerRect.width - 8));
      const width = Math.min(preferredWidth, window.innerWidth - viewportPadding * 2);
      const dropdownHeight = dateTimeDropdownRef.current?.offsetHeight ?? 420;
      const availableBelow = window.innerHeight - (triggerRect.bottom + edgeGap) - viewportPadding;
      const availableAbove = triggerRect.top - edgeGap - viewportPadding;
      const shouldOpenBelow =
        availableBelow >= Math.min(dropdownHeight, minPickerHeight) || availableBelow >= availableAbove;

      const left = Math.min(
        Math.max(viewportPadding, triggerRect.left),
        window.innerWidth - width - viewportPadding
      );

      if (shouldOpenBelow) {
        const top = triggerRect.bottom + edgeGap;
        const maxHeight = Math.max(minPickerHeight, Math.min(maxPickerHeight, availableBelow));
        return { top, left, width, maxHeight };
      }

      const maxHeight = Math.max(minPickerHeight, Math.min(maxPickerHeight, availableAbove));
      const top = triggerRect.top - edgeGap - Math.min(dropdownHeight, maxHeight);

      return { top, left, width, maxHeight };
    }

    function applyDropdownStyle(nextStyle: {
      top: number;
      left: number;
      width: number;
      maxHeight: number;
    }) {
      pickerStyleRef.current = nextStyle;
      const pickerNode = dateTimeDropdownRef.current;
      if (!pickerNode) {
        return;
      }
      pickerNode.style.top = `${nextStyle.top}px`;
      pickerNode.style.left = `${nextStyle.left}px`;
      pickerNode.style.width = `${nextStyle.width}px`;
      pickerNode.style.maxHeight = `${nextStyle.maxHeight}px`;
    }

    function applyDropdownPosition(commitToState: boolean) {
      const nextStyle = computeDropdownStyle();
      if (!nextStyle) {
        return;
      }

      if (commitToState || !pickerStyleRef.current) {
        pickerStyleRef.current = nextStyle;
        setDateTimeDropdownStyle(nextStyle);
        return;
      }

      applyDropdownStyle(nextStyle);
    }

    function scheduleDropdownPositionUpdate() {
      if (pickerPositionFrameRef.current !== null) {
        return;
      }
      pickerPositionFrameRef.current = window.requestAnimationFrame(() => {
        pickerPositionFrameRef.current = null;
        applyDropdownPosition(false);
      });
    }

    applyDropdownPosition(true);
    window.addEventListener("resize", scheduleDropdownPositionUpdate);
    document.addEventListener("scroll", scheduleDropdownPositionUpdate, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", scheduleDropdownPositionUpdate);
      document.removeEventListener("scroll", scheduleDropdownPositionUpdate, true);
      if (pickerPositionFrameRef.current !== null) {
        window.cancelAnimationFrame(pickerPositionFrameRef.current);
        pickerPositionFrameRef.current = null;
      }
    };
  }, [isDateTimeOverlayOpen]);

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

  function openDateTimeOverlay() {
    const safeStartDate = tripStartDate && tripStartDate >= todayDate ? tripStartDate : todayDate;
    setDraftTripDate(safeStartDate);
    const parts = getTwelveHourParts(tripStartTime);
    setDraftHour(parts.hour);
    setDraftMinute(parts.minute);
    setDraftPeriod(parts.period);
    setDraftTripDurationDays(Math.max(1, selectedTripDays));
    setIsDateTimeOverlayOpen(true);
  }

  function adjustDraftTripDuration(delta: number) {
    setDraftTripDurationDays((prev) => Math.min(7, Math.max(1, prev + delta)));
  }

  function getSnapIndex(scrollTop: number, maxIndex: number) {
    const index = Math.round(scrollTop / PICKER_ITEM_HEIGHT);
    return Math.max(0, Math.min(maxIndex, index));
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

  function applyDateTimeSelection() {
    if (!draftTripDate) {
      return;
    }

    const normalizedStart = draftTripDate < todayDate ? todayDate : draftTripDate;
    let nextStartTime = toTwentyFourHourTime(draftHour, draftMinute, draftPeriod);
    const minimumForDraftDate = normalizedStart === todayDate ? minimumFutureTimeValue : null;
    if (minimumForDraftDate && nextStartTime < minimumForDraftDate) {
      nextStartTime = minimumForDraftDate;
    }

    setTripStartDate(normalizedStart);
    setTripStartTime(nextStartTime);

    const nextEndDate = addDaysToDateString(normalizedStart, draftTripDurationDays - 1);
    setTripEndDate(nextEndDate);
    setTripEndTime("23:00");

    setIsDateTimeOverlayOpen(false);
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

        <div className="relative z-10 p-4 sm:p-6 lg:min-h-[32rem]">
          <div className="max-w-[40rem]">
            <div className="space-y-4">
              <div className="space-y-2.5">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Request a ride
                </h1>
                <div className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  Schedule my tour
                </div>
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
                  <div className="mt-2 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        One way info
                      </p>
                      <span className="group relative inline-flex">
                        <Info className="h-3 w-3 cursor-help text-emerald-700" />
                        <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 hidden w-64 -translate-x-1/2 rounded-md bg-foreground px-2 py-1.5 text-[10px] font-normal normal-case leading-relaxed text-background shadow-lg group-hover:block">
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

                <div className="relative mt-2 space-y-2">
                  <button
                    ref={dateTimeTriggerRef}
                    type="button"
                    onClick={openDateTimeOverlay}
                    className="w-full rounded-md border border-emerald-100 bg-muted px-3 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Pickup & Drop Date and Time
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-foreground">{compactDateTimeLabel}</p>
                  </button>
                  {isTourMode ? (
                    <p className="text-xs text-muted-foreground">
                      Return date is auto-managed from selected trip days (max 7 days).
                    </p>
                  ) : null}

                  {isDateTimeOverlayOpen ? (
                    <div
                      ref={dateTimeDropdownRef}
                      className="fixed z-50 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl"
                      style={
                        dateTimeDropdownStyle
                          ? {
                              top: `${dateTimeDropdownStyle.top}px`,
                              left: `${dateTimeDropdownStyle.left}px`,
                              width: `${dateTimeDropdownStyle.width}px`,
                              maxHeight: `${dateTimeDropdownStyle.maxHeight}px`,
                            }
                          : undefined
                      }
                    >
                      <div className="border-b border-emerald-100 bg-white px-4 py-3 text-center">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Pickup & Drop Date and Time
                        </p>
                      </div>

                      <div className="px-4 pb-4 pt-3">
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-12 -translate-y-1/2 rounded-md border-y-2 border-emerald-400/90 bg-emerald-50/20" />
                          <div className="relative z-20 grid grid-cols-[1.6fr_0.5fr_0.2fr_0.5fr_0.6fr] items-center gap-2">
                          <div
                            ref={dateColumnRef}
                            className="h-36 overflow-y-auto overscroll-y-contain scroll-smooth snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{ WebkitOverflowScrolling: "touch" }}
                            onScroll={(event) => {
                              if (pickerScrollSyncRef.current) {
                                return;
                              }
                              const index = getSnapIndex(
                                event.currentTarget.scrollTop,
                                dateOptions.length - 1
                              );
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
                            onScroll={(event) => {
                              if (pickerScrollSyncRef.current) {
                                return;
                              }
                              const index = getSnapIndex(
                                event.currentTarget.scrollTop,
                                loopedHourOptions.length - 1
                              );
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
                                  hour === draftHour
                                    ? "font-semibold text-foreground"
                                    : "text-muted-foreground/55"
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
                            onScroll={(event) => {
                              if (pickerScrollSyncRef.current) {
                                return;
                              }
                              const index = getSnapIndex(
                                event.currentTarget.scrollTop,
                                loopedMinuteOptions.length - 1
                              );
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
                            onScroll={(event) => {
                              if (pickerScrollSyncRef.current) {
                                return;
                              }
                              const index = getSnapIndex(
                                event.currentTarget.scrollTop,
                                loopedPeriodOptions.length - 1
                              );
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

                        <div
                          className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/30 px-3 py-2"
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

                        <Button
                          type="button"
                          variant="tamayoGradient"
                          onClick={applyDateTimeSelection}
                          className="mt-4 h-auto w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-2 space-y-2">
                  {tripStartDate && tripEndDate && selectedTripDays > 1 ? (
                    <p className="text-xs font-medium text-emerald-800">
                      You are reserving cab for {selectedTripDays} day
                      {selectedTripDays > 1 ? "s" : ""}.
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    asChild
                    variant="tamayoGradient"
                    className="h-auto w-full px-4 py-3 text-sm font-semibold sm:w-auto sm:min-w-[10rem]"
                  >
                    <Link href={quoteHref}>See prices</Link>
                  </Button>
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
