import Link from "next/link";
import {
  Building2,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock3,
  CircleDot,
  Flag,
  Milestone,
  MapPin,
  Route,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { SectionHeader } from "@/components/shared/layout/section-header";
import { Button } from "@/components/ui/button";

type ReservePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  value: string | string[] | undefined,
  fallback: string
): string {
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

function inferFuelType(vehicle: string): string {
  const normalized = vehicle.toLowerCase();
  if (normalized.includes("sedan") || normalized.includes("ertiga") || normalized.includes("rumion")) {
    return "CNG + Petrol";
  }
  return "Diesel";
}

function inferAgeBucketLabel(vehicle: string, perKmRate: string): string {
  const normalized = vehicle.toLowerCase();
  const rate = Number(perKmRate);

  if (!rate || Number.isNaN(rate)) {
    return "";
  }

  if (normalized.includes("sedan")) return rate === 13 ? "0-3 years" : rate === 12 ? "4-7 years" : "";
  if (normalized.includes("ertiga") || normalized.includes("rumion"))
    return rate === 15 ? "0-3 years" : rate === 14 ? "4-7 years" : "";
  if (normalized.includes("carens")) return rate === 16 ? "0-3 years" : rate === 15 ? "4-7 years" : "";
  if (normalized.includes("innova")) return rate === 20 ? "0-3 years" : rate === 19 ? "4-7 years" : "";
  if (normalized.includes("urbania")) return rate === 36 ? "0-3 years" : rate === 35 ? "4-7 years" : "";
  if (normalized.includes("traveller")) return rate === 28 ? "0-3 years" : rate === 26 ? "4-7 years" : "";

  return "";
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

export default async function CustomerReservePage({ searchParams }: ReservePageProps) {
  const params = searchParams ? await searchParams : {};

  const bookingRef = readParam(params.bookingRef, "Pending");
  const vehicle = readParam(params.vehicle, "Selected vehicle");
  const sourceCity = readParam(params.sourceCity, "Source");
  const destinationCity = readParam(params.destinationCity, "Destination");
  const pickupLocation = readParam(params.pickupLocation, "");
  const tripStartDate = readParam(params.tripStartDate, "");
  const tripEndDate = readParam(params.tripEndDate, "");
  const reserveAmount = readParam(params.reserveAmount, "499");
  const estimatedTotal = readParam(params.estimatedTotal, "");
  const routeDistanceKm = readParam(params.routeDistanceKm, "");
  const returnDistanceKm = readParam(params.returnDistanceKm, "");
  const dispatchHubCity = readParam(params.dispatchHubCity, "");
  const includedDays = readParam(params.includedDays, "");
  const totalIncludedKm = readParam(params.totalIncludedKm, "");
  const operationalOption = readParam(params.operationalOption, "ALL_INCLUSIVE");
  const ageBucketParam = readParam(params.ageBucketLabel, "").trim();
  const fuelTypeParam = readParam(params.fuelType, "").replaceAll("+", " + ").trim();
  const productType = readParam(params.productType, "ROUND_TRIP");
  const quoteReturnUrlParam = readParam(params.quoteReturnUrl, "").trim();
  const perKmRateParam = readParam(params.perKmRate, "").trim();
  const stopLocations = readParamList(params.stop);
  // The booking quote handoff includes the full destination chain in `stop`.
  // The final item is the end city; everything before it is intermediate stops.
  const hasRouteStops = stopLocations.length > 0;
  const endCityFromRoute = hasRouteStops
    ? stopLocations[stopLocations.length - 1] ?? destinationCity
    : destinationCity;
  const intermediateStops = hasRouteStops ? stopLocations.slice(0, -1) : [];
  const inferredAgeBucketLabel = inferAgeBucketLabel(vehicle, perKmRateParam);
  const resolvedAgeBucketLabel = ageBucketParam || inferredAgeBucketLabel || "0-3 years";
  const resolvedFuelType = fuelTypeParam || inferFuelType(vehicle);
  const resolvedPerKmRate = perKmRateParam || inferPerKmRate(vehicle, resolvedAgeBucketLabel);
  const fallbackQuoteParams = new URLSearchParams();
  if (productType) fallbackQuoteParams.set("productType", productType);
  if (sourceCity && sourceCity !== "Source") fallbackQuoteParams.set("sourceCity", sourceCity);
  if (destinationCity && destinationCity !== "Destination")
    fallbackQuoteParams.set("destinationCity", destinationCity);
  if (tripStartDate) fallbackQuoteParams.set("tripStartDate", tripStartDate);
  if (tripEndDate) fallbackQuoteParams.set("tripEndDate", tripEndDate);
  if (routeDistanceKm) fallbackQuoteParams.set("estimatedKm", routeDistanceKm);
  if (returnDistanceKm) fallbackQuoteParams.set("returnDistanceKm", returnDistanceKm);
  if (pickupLocation && pickupLocation !== "Pickup pending")
    fallbackQuoteParams.set("pickupLocation", pickupLocation);
  stopLocations.forEach((stop) => fallbackQuoteParams.append("drop", stop));
  const fallbackQuoteReturnUrl = fallbackQuoteParams.size
    ? `/customer/booking-quote?${fallbackQuoteParams.toString()}`
    : "/customer/booking-quote";
  const quoteReturnUrl =
    quoteReturnUrlParam.startsWith("/customer/booking-quote")
      ? quoteReturnUrlParam
      : fallbackQuoteReturnUrl;

  const isAllInclusive = operationalOption === "ALL_INCLUSIVE";
  const fuelTypeLine = "Fuel,";
  const inclusions = [
    `${vehicle} with ${resolvedAgeBucketLabel} vehicle age.`,
    `${fuelTypeLine} Professional driver and Air conditioned vehicle.`,
    productType === "ONE_WAY"
      ? "One-way fare applies on hotspot routes; otherwise round-trip pricing is used."
      : "This trip follows round-trip pricing.",
    isAllInclusive
      ? "Toll, parking and driver food allowance is all inclusive."
      : "Toll, parking and driver food allowance is self pay.",
  ];
  const exclusions = [
    resolvedPerKmRate
      ? `Kilometers beyond included package should be paid at ₹${resolvedPerKmRate}/km.`
      : "Kilometers beyond included package should be paid as per selected rate.",
    isAllInclusive
      ? "Route/time changes beyond booking terms may add extra charges."
      : "Self-pay selected: toll, parking and driver food allowance ₹300/day should be paid separately.",
  ];

  return (
    <div className="space-y-8 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] sm:pb-12">
      <SectionHeader
        title="Review your booking"
        description="Confirm trip details, inclusions, and exclusions before proceeding to payment."
      />

      <section className="grid gap-4 lg:grid-cols-[1.35fr,0.9fr]">
        <div className="space-y-4 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Trip details
              </p>
              <p className="text-xs text-muted-foreground">
                Booking ref: <span className="font-semibold text-foreground">{bookingRef}</span>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Route overview
            </p>
            <div className="mt-2 space-y-2">
              <div className="flex items-start gap-2 rounded-md bg-white px-3 py-2">
                <MapPin className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Start city
                  </p>
                  <p
                    title={sourceCity}
                    className="max-w-[18rem] truncate text-sm font-medium text-foreground"
                  >
                    {sourceCity}
                  </p>
                </div>
              </div>
              {intermediateStops.map((stop, index) => (
                <div key={`${stop}-${index}`} className="flex items-start gap-2 rounded-md bg-white px-3 py-2">
                  <CircleDot className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      Stop {index + 1}
                    </p>
                    <p
                      title={stop}
                      className="max-w-[18rem] truncate text-sm font-medium text-foreground"
                    >
                      {stop}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-2 rounded-md bg-white px-3 py-2">
                <Flag className="mt-0.5 h-4 w-4 text-emerald-800" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    End city
                  </p>
                  <p
                    title={endCityFromRoute}
                    className="max-w-[18rem] truncate text-sm font-medium text-foreground"
                  >
                    {endCityFromRoute}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Trip at a glance
            </p>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              <div className="rounded-md border border-emerald-100 bg-white p-1 shadow-sm">
                <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  <CarFront className="h-3 w-3" />
                  Vehicle
                </p>
                <p className="mt-0.5 text-xs font-semibold leading-snug text-foreground">{vehicle}</p>
              </div>

              <div className="rounded-md border border-emerald-100 bg-white p-1 shadow-sm">
                <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  <ShieldCheck className="h-3 w-3" />
                  Toll, parking and driver food
                </p>
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  {isAllInclusive ? "All inclusive" : "Self pay"}
                </p>
              </div>

              <div className="rounded-md border border-emerald-100 bg-white p-1 shadow-sm">
                <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  <CalendarClock className="h-3 w-3" />
                  Pickup time
                </p>
                <p className="mt-0.5 text-xs font-semibold leading-snug text-foreground">
                  {formatDateTime(tripStartDate)}
                </p>
              </div>

              <div className="rounded-md border border-emerald-100 bg-white p-1 shadow-sm">
                <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  <Clock3 className="h-3 w-3" />
                  End time
                </p>
                <p className="mt-0.5 text-xs font-semibold leading-snug text-foreground">
                  {formatDateTime(tripEndDate)}
                </p>
              </div>

              {dispatchHubCity ? (
                <div className="rounded-md border border-emerald-100 bg-white p-1 shadow-sm">
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                    <Building2 className="h-3 w-3 text-emerald-700" />
                    <span className="text-[10px] uppercase tracking-wide text-emerald-700">
                      Dispatch city -
                    </span>
                    <span className="text-xs text-emerald-700">{dispatchHubCity}</span>
                  </p>
                </div>
              ) : null}

              {routeDistanceKm ? (
                <div className="rounded-md border border-emerald-100 bg-white p-1 shadow-sm">
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                    <Route className="h-3 w-3 text-emerald-700" />
                    <span className="text-[10px] uppercase tracking-wide text-emerald-700">
                      Route distance -
                    </span>
                    <span className="text-xs">{routeDistanceKm} kms</span>
                  </p>
                  {returnDistanceKm ? (
                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                      Includes return {returnDistanceKm} kms
                    </p>
                  ) : null}
                </div>
              ) : null}

              {includedDays ? (
                <div className="rounded-md border border-emerald-100 bg-white p-1 shadow-sm">
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                    <CalendarClock className="h-3 w-3 text-emerald-700" />
                    <span className="text-[10px] uppercase tracking-wide text-emerald-700">
                      Trip duration -
                    </span>
                    <span className="text-xs">
                      {includedDays} day{includedDays === "1" ? "" : "s"}
                    </span>
                  </p>
                </div>
              ) : null}

              {totalIncludedKm ? (
                <div className="rounded-md border border-emerald-100 bg-white p-1 shadow-sm">
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                    <Milestone className="h-3 w-3 text-emerald-700" />
                    <span className="text-[10px] uppercase tracking-wide text-emerald-700">
                      Included distance -
                    </span>
                    <span className="text-xs">{totalIncludedKm} kms</span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Inclusions
              </p>
              <ul className="mt-1.5 space-y-0.5 text-[11px] font-medium text-foreground sm:text-[11px]">
                {inclusions.map((item) => (
                  <li key={item} className="inline-flex items-start gap-1 rounded-md bg-white px-1.5 py-0.5">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-700" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                <TriangleAlert className="h-4 w-4" />
                Exclusions
              </p>
              <ul className="mt-1.5 space-y-0.5 text-[11px] font-medium text-foreground sm:text-[11px]">
                {exclusions.map((item) => (
                  <li key={item} className="inline-flex items-start gap-1 rounded-md bg-white px-1.5 py-0.5">
                    <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-700" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Booking review
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">Pay ₹{reserveAmount} only</p>
          {estimatedTotal ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated trip fare: ₹{Number(estimatedTotal).toLocaleString("en-IN")}
            </p>
          ) : null}
          {totalIncludedKm || includedDays ? (
            <div className="mt-3 rounded-md border border-emerald-100 bg-white p-2.5">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <Route className="h-3.5 w-3.5" />
                Fare package summary
              </p>
              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                {includedDays ? <p>Duration included: {includedDays} day{includedDays === "1" ? "" : "s"}</p> : null}
                {totalIncludedKm ? <p>Distance included: {totalIncludedKm} kms</p> : null}
              </div>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            By proceeding, you agree that final payable amounts may vary if route, time, or usage
            differs from current estimate.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled>Proceed to payment (coming soon)</Button>
            <Button asChild variant="outline">
              <Link href={quoteReturnUrl}>Back to quotes</Link>
            </Button>
          </div>
        </aside>
      </section>
    </div>
  );
}
