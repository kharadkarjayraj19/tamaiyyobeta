import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { SectionHeader } from "@/components/shared/layout/section-header";
import { Button } from "@/components/ui/button";
import { ReserveRouteAnimation } from "@/features/booking/ui/reserve-route-animation";

type ReservePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ReserveInfoIconName = "route" | "passengers" | "fuel" | "duration";

function readParam(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

function readParamList(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  return value
    .split("|||")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseKmValue(value: string): number | null {
  if (!value) {
    return null;
  }
  const cleaned = value.replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function ReserveInfoIcon({
  name,
  alt,
}: {
  name: ReserveInfoIconName;
  alt: string;
}) {
  return (
    <Image
      src={`/icons/tamayo-3d-green/${name}.svg`}
      alt={alt}
      width={16}
      height={16}
      className="shrink-0 object-contain"
    />
  );
}

function formatDateTime(value: string): string {
  if (!value) {
    return "Not selected";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function inferPerKmRate(vehicle: string, ageBucketLabel: string): string {
  const normalized = vehicle.toLowerCase();
  const isNew = ageBucketLabel.includes("0-3");

  if (normalized.includes("sedan")) return isNew ? "13" : "12";
  if (normalized.includes("ertiga") || normalized.includes("rumion")) return isNew ? "15" : "14";
  if (normalized.includes("carens")) return isNew ? "16" : "15";
  if (normalized.includes("innova")) return isNew ? "20" : "19";
  if (normalized.includes("urbania")) return isNew ? "36" : "35";
  if (normalized.includes("traveller")) return isNew ? "28" : "26";

  return "";
}

function inferFuelLabel(vehicle: string): string {
  const normalized = vehicle.toLowerCase();
  if (normalized.includes("sedan") || normalized.includes("ertiga") || normalized.includes("rumion")) {
    return "CNG/Petrol";
  }
  return "Diesel";
}

function inferCapacity(vehicle: string): string {
  const normalized = vehicle.toLowerCase();
  if (normalized.includes("sedan")) return "4";
  if (normalized.includes("ertiga") || normalized.includes("rumion")) return "6";
  if (normalized.includes("carens")) return "6";
  if (normalized.includes("innova")) return "7";
  if (normalized.includes("urbania")) return "16";
  if (normalized.includes("traveller")) return "21";
  return "4";
}

function resolveVehicleImage(vehicle: string): string {
  const normalized = vehicle.toLowerCase();
  if (normalized.includes("ertiga") || normalized.includes("rumion")) {
    return "https://res.cloudinary.com/m19yxquu/image/upload/v1788501874/tamayo_ertig-50kb.jpg";
  }
  if (normalized.includes("carens")) {
    return "https://res.cloudinary.com/m19yxquu/image/upload/v1788501875/tamayo_ki-50kb.jpg";
  }
  if (normalized.includes("innova")) {
    return "https://res.cloudinary.com/m19yxquu/image/upload/v1788501874/tamayo_innov-50kb.jpg";
  }
  if (normalized.includes("urbania")) {
    return "https://res.cloudinary.com/m19yxquu/image/upload/v1788501875/tamayo_urbani-50kb.jpg";
  }
  if (normalized.includes("traveller")) {
    return "https://res.cloudinary.com/m19yxquu/image/upload/v1788501874/tamayo_21seater_-50kb.jpg";
  }
  return "https://res.cloudinary.com/m19yxquu/image/upload/v1788501874/tamayo_dzir-50kb.jpg";
}

export default async function CustomerReservePage({ searchParams }: ReservePageProps) {
  const params = searchParams ? await searchParams : {};

  const bookingRef = readParam(params.bookingRef, "Pending");
  const vehicle = readParam(params.vehicle, "Sedan - Dzire or Aura");
  const sourceCity = readParam(params.sourceCity, "Source");
  const destinationCity = readParam(params.destinationCity, "Destination");
  const tripStartDate = readParam(params.tripStartDate, "");
  const tripEndDate = readParam(params.tripEndDate, "");
  const reserveAmount = readParam(params.reserveAmount, "499");
  const estimatedTotal = readParam(params.estimatedTotal, "");
  const routeDistanceKm = readParam(params.routeDistanceKm, "");
  const includedDays = readParam(params.includedDays, "");
  const totalIncludedKm = readParam(params.totalIncludedKm, "");
  const operationalOption = readParam(params.operationalOption, "ALL_INCLUSIVE");
  const ageBucketLabel = readParam(params.ageBucketLabel, "0-3 years").trim();
  const quoteReturnUrlParam = readParam(params.quoteReturnUrl, "").trim();
  const perKmRateParam = readParam(params.perKmRate, "").trim();
  const stopLocations = readParamList(params.stop);

  const hasRouteStops = stopLocations.length > 0;
  const endCityFromRoute = hasRouteStops
    ? stopLocations[stopLocations.length - 1] ?? destinationCity
    : destinationCity;
  const intermediateStops = hasRouteStops ? stopLocations.slice(0, -1) : [];

  const fallbackQuoteParams = new URLSearchParams();
  fallbackQuoteParams.set("sourceCity", sourceCity);
  fallbackQuoteParams.set("destinationCity", destinationCity);
  if (tripStartDate) fallbackQuoteParams.set("tripStartDate", tripStartDate);
  if (tripEndDate) fallbackQuoteParams.set("tripEndDate", tripEndDate);
  if (routeDistanceKm) fallbackQuoteParams.set("estimatedKm", routeDistanceKm);
  stopLocations.forEach((stop) => fallbackQuoteParams.append("drop", stop));
  const fallbackQuoteReturnUrl = fallbackQuoteParams.size
    ? `/customer/booking-quote?${fallbackQuoteParams.toString()}`
    : "/customer/booking-quote";
  const quoteReturnUrl =
    quoteReturnUrlParam.startsWith("/customer/booking-quote")
      ? quoteReturnUrlParam
      : fallbackQuoteReturnUrl;

  const resolvedPerKmRate = perKmRateParam || inferPerKmRate(vehicle, ageBucketLabel);
  const fuelLabel = inferFuelLabel(vehicle);
  const paxCount = inferCapacity(vehicle);
  const vehicleImage = resolveVehicleImage(vehicle);
  const pickupTimeLabel = formatDateTime(tripStartDate);
  const endTimeLabel = formatDateTime(tripEndDate);
  const estimatedTotalNumber = Number(estimatedTotal);
  const hasEstimatedTotal = Boolean(estimatedTotal) && !Number.isNaN(estimatedTotalNumber);
  const routeTitle = `${sourceCity} -> ${endCityFromRoute}`;
  const routeDistanceNumber = parseKmValue(routeDistanceKm);
  const includedDistanceNumber = parseKmValue(totalIncludedKm);
  const effectiveIncludedKm = [routeDistanceNumber, includedDistanceNumber].reduce<number | null>(
    (currentMax, value) => {
      if (value === null) return currentMax;
      if (currentMax === null) return value;
      return Math.max(currentMax, value);
    },
    null
  );
  const effectiveIncludedKmLabel =
    effectiveIncludedKm !== null ? `${effectiveIncludedKm} kms included in current fare.` : null;

  const inclusions = [
    effectiveIncludedKmLabel ?? "Package kms included in current fare.",
    "Toll, state tax, and parking charges are included.",
    "Driver allowance is included for selected trip option.",
  ];
  const exclusions = [
    resolvedPerKmRate
      ? `After included kms, additional usage is charged at ₹${resolvedPerKmRate}/km.`
      : "Additional distance beyond package will be charged extra.",
    operationalOption === "ALL_INCLUSIVE"
      ? "Major route/time changes after booking may change fare."
      : "Self-pay selected: toll, parking and driver food are paid during trip.",
  ];

  return (
    <div className="space-y-3 pb-[calc(env(safe-area-inset-bottom)+11rem)] md:space-y-4 md:pb-8">
      <SectionHeader
        title="Review booking"
        description="Cross-check route and fare before payment."
      />

      <section className="space-y-3">
        <article className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 p-3 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-lg font-semibold tracking-tight">{routeTitle}</p>
              <p className="text-[13px] text-emerald-100">
                {pickupTimeLabel}
                {tripEndDate ? ` - ${endTimeLabel}` : ""}
              </p>
              <p className="text-[11px] text-emerald-200">Booking ref: {bookingRef}</p>
            </div>
            <Button
              asChild
              variant="outline"
              className="h-8 border-emerald-200/50 bg-white/15 px-2.5 text-[11px] text-white hover:bg-white/25 hover:text-white"
            >
              <Link href={quoteReturnUrl}>
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Back to quotes
              </Link>
            </Button>
          </div>
          {hasEstimatedTotal ? (
            <p className="mt-2 text-[12px] text-emerald-100">
              Estimated total: ₹{estimatedTotalNumber.toLocaleString("en-IN")}
            </p>
          ) : null}
        </article>

        <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
          <article className="space-y-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-white via-emerald-50/45 to-emerald-100/45 p-3 shadow-[0_10px_26px_rgba(16,185,129,0.14)]">
            <div className="flex gap-3">
              <img
                src={vehicleImage}
                alt={vehicle}
                className="h-[92px] w-[122px] shrink-0 rounded-lg border border-emerald-100 object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-semibold leading-tight text-foreground">{vehicle}</p>
                  <p className="text-[12px] text-muted-foreground">or similar • {ageBucketLabel}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ReserveInfoIcon name="fuel" alt="Fuel type" />
                    {fuelLabel}
                  </span>
                  {routeDistanceKm ? (
                    <span className="inline-flex items-center gap-1">
                      <ReserveInfoIcon name="route" alt="Route distance" />
                      {routeDistanceKm} kms
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <ReserveInfoIcon name="passengers" alt="Passenger capacity" />
                    {paxCount}
                  </span>
                  {includedDays ? (
                    <span className="inline-flex items-center gap-1">
                      <ReserveInfoIcon name="duration" alt="Trip duration" />
                      {includedDays} day{includedDays === "1" ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-emerald-100 bg-white p-2.5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Inclusions</p>
            <ul className="mt-1.5 space-y-1.5">
              {inclusions.map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  <p className="text-[12px] leading-snug text-foreground">{item}</p>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 border-t border-border/70 pt-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Exclusions</p>
              <ul className="mt-1.5 space-y-1.5">
                {exclusions.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                    <p className="text-[12px] leading-snug text-foreground">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>

        <ReserveRouteAnimation
          sourceCity={sourceCity}
          destinationCity={endCityFromRoute}
          intermediateStops={intermediateStops}
          pickupTimeLabel={pickupTimeLabel}
          endTimeLabel={tripEndDate ? endTimeLabel : ""}
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-emerald-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2 text-foreground shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur md:hidden">
        <p className="text-center text-[12px] text-emerald-700">
          {hasEstimatedTotal
            ? `Reserve now at ₹${reserveAmount}. Remaining estimated ₹${estimatedTotalNumber.toLocaleString("en-IN")} on trip.`
            : `Reserve now at ₹${reserveAmount}.`}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Reserve now</p>
            <p className="text-[15px] font-bold text-foreground">₹{reserveAmount}</p>
          </div>
          <Button
            variant="tamayoGradient"
            disabled
            className="h-11 flex-1 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-100"
          >
            Proceed to payment
          </Button>
        </div>
      </div>

      <div className="hidden items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm md:flex">
        <p className="text-sm text-emerald-800">
          {hasEstimatedTotal
            ? `Reserve now at ₹${reserveAmount}. Remaining estimated ₹${estimatedTotalNumber.toLocaleString("en-IN")} on trip.`
            : `Reserve now at ₹${reserveAmount}.`}
        </p>
        <Button variant="tamayoGradient" disabled className="h-10 min-w-[11rem] disabled:opacity-100">
          Proceed to payment
        </Button>
      </div>
    </div>
  );
}
