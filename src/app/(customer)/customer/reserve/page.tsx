import Link from "next/link";

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

export default async function CustomerReservePage({ searchParams }: ReservePageProps) {
  const params = searchParams ? await searchParams : {};

  const bookingRef = readParam(params.bookingRef, "Pending");
  const bookingStatus = readParam(params.bookingStatus, "REQUESTED");
  const vehicle = readParam(params.vehicle, "Selected vehicle");
  const sourceCity = readParam(params.sourceCity, "Source");
  const destinationCity = readParam(params.destinationCity, "Destination");
  const reserveAmount = readParam(params.reserveAmount, "499");
  const estimatedTotal = readParam(params.estimatedTotal, "");
  const routeDistanceKm = readParam(params.routeDistanceKm, "");
  const returnDistanceKm = readParam(params.returnDistanceKm, "");
  const dispatchHubCity = readParam(params.dispatchHubCity, "");

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Reserve your cab"
        description="Review your reservation details and continue to payment."
      />

      <section className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-muted-foreground">
            Booking ref: <span className="font-semibold text-foreground">{bookingRef}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-semibold text-foreground">{bookingStatus}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Vehicle: <span className="font-semibold text-foreground">{vehicle}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Route:{" "}
            <span className="font-semibold text-foreground">
              {sourceCity} to {destinationCity}
            </span>
          </p>
          {dispatchHubCity ? (
            <p className="text-sm text-muted-foreground">
              Cab dispatch city:{" "}
              <span className="font-semibold text-emerald-700">{dispatchHubCity}</span>
            </p>
          ) : null}
          {routeDistanceKm ? (
            <p className="text-sm text-muted-foreground">
              Estimated route distance:{" "}
              <span className="font-semibold text-foreground">
                {routeDistanceKm} kms
                {returnDistanceKm ? ` (including return ${returnDistanceKm} kms)` : ""}
              </span>
            </p>
          ) : null}
        </div>

        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Reserve now
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">Pay ₹{reserveAmount} only</p>
          {estimatedTotal ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated trip fare: ₹{Number(estimatedTotal).toLocaleString("en-IN")}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Payment gateway wiring is in progress. You can keep this page as the post-reserve step.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled>Proceed to payment (coming soon)</Button>
            <Button asChild variant="outline">
              <Link href="/customer/booking-quote">Back to quotes</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
