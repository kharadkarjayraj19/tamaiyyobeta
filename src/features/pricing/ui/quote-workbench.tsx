"use client";

import { useState } from "react";

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
  lineItems: QuoteLineItem[];
};

type BookingResponse = {
  booking: {
    bookingRef: string;
    status: string;
  };
};

const CATEGORY_OPTIONS = [
  "SEDAN",
  "ERTIGA",
  "KIA_CARENS",
  "INNOVA_CRYSTA",
  "TEMPO_TRAVELLER",
] as const;

const AGE_BUCKET_OPTIONS = [
  "ZERO_TO_THREE",
  "THREE_TO_SEVEN",
  "SEVEN_TO_TWELVE",
] as const;

const PRODUCT_TYPE_OPTIONS = ["ONE_WAY", "MULTI_CITY", "ROUND_TRIP"] as const;

type FormState = {
  sourceCity: string;
  destinationCity: string;
  pickupLocation: string;
  destinationStops: string;
  tripStartDate: string;
  tripEndDate: string;
  category: (typeof CATEGORY_OPTIONS)[number];
  ageBucket: (typeof AGE_BUCKET_OPTIONS)[number];
  productType: (typeof PRODUCT_TYPE_OPTIONS)[number];
  estimatedKm: string;
  returnDistanceKm: string;
};

const defaultFormState: FormState = {
  sourceCity: "Nashik",
  destinationCity: "Aurangabad",
  pickupLocation: "Nashik City Center",
  destinationStops: "Aurangabad",
  tripStartDate: "",
  tripEndDate: "",
  category: "INNOVA_CRYSTA",
  ageBucket: "ZERO_TO_THREE",
  productType: "ROUND_TRIP",
  estimatedKm: "900",
  returnDistanceKm: "180",
};

function currency(value: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function parseDestinationStops(raw: string) {
  return raw
    .split(",")
    .map((stop) => stop.trim())
    .filter(Boolean)
    .map((location) => ({ location }));
}

export function QuoteWorkbench() {
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
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
      tripEndDate: form.tripEndDate
        ? new Date(form.tripEndDate).toISOString()
        : undefined,
      category: form.category,
      ageBucket: form.ageBucket,
      productType: form.productType,
      estimatedKm: form.estimatedKm ? Number(form.estimatedKm) : undefined,
      returnDistanceKm: form.returnDistanceKm
        ? Number(form.returnDistanceKm)
        : undefined,
    };
  }

  async function generateQuote() {
    setError(null);
    setBooking(null);
    setLoadingQuote(true);

    try {
      const payload = buildPayload();
      const response = await fetch("/api/v1/bookings/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mock-customer-id": "demo-customer-ui",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message ?? "Unable to generate quote.");
      }

      setQuote(result.data as QuoteResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate quote.");
    } finally {
      setLoadingQuote(false);
    }
  }

  async function createBooking() {
    setError(null);
    setLoadingBooking(true);

    try {
      const payload = buildPayload();
      const response = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mock-customer-id": "demo-customer-ui",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message ?? "Unable to create booking.");
      }

      setBooking(result.data as BookingResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create booking.");
    } finally {
      setLoadingBooking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium">Source city</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.sourceCity}
            onChange={(event) => updateField("sourceCity", event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Destination city</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.destinationCity}
            onChange={(event) => updateField("destinationCity", event.target.value)}
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium">Pickup location</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.pickupLocation}
            onChange={(event) => updateField("pickupLocation", event.target.value)}
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium">Destination stops (comma-separated)</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.destinationStops}
            onChange={(event) => updateField("destinationStops", event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Trip start</span>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.tripStartDate}
            onChange={(event) => updateField("tripStartDate", event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Trip end</span>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.tripEndDate}
            onChange={(event) => updateField("tripEndDate", event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Vehicle category</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.category}
            onChange={(event) =>
              updateField("category", event.target.value as FormState["category"])
            }
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Age bucket</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.ageBucket}
            onChange={(event) =>
              updateField("ageBucket", event.target.value as FormState["ageBucket"])
            }
          >
            {AGE_BUCKET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Trip type</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.productType}
            onChange={(event) =>
              updateField("productType", event.target.value as FormState["productType"])
            }
          >
            {PRODUCT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Estimated km (Google Maps)</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.estimatedKm}
            onChange={(event) => updateField("estimatedKm", event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Return km (optional)</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.returnDistanceKm}
            onChange={(event) => updateField("returnDistanceKm", event.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={generateQuote} disabled={loadingQuote || loadingBooking}>
          {loadingQuote ? "Generating..." : "Generate Quote"}
        </Button>
        <Button
          variant="outline"
          onClick={createBooking}
          disabled={loadingQuote || loadingBooking}
        >
          {loadingBooking ? "Creating..." : "Create Booking"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {quote ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
          <h3 className="text-base font-semibold">Quote summary</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <p>
              <span className="text-muted-foreground">Estimated total:</span>{" "}
              <span className="font-medium">{currency(quote.estimatedTotal)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Included km:</span>{" "}
              <span className="font-medium">{quote.totalIncludedKm}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Billable km:</span>{" "}
              <span className="font-medium">{quote.billableKm}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Per km rate:</span>{" "}
              <span className="font-medium">{currency(quote.perKmRate)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Operational bundle:</span>{" "}
              <span className="font-medium">
                {currency(quote.operationalBundleAmount)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Usable km:</span>{" "}
              <span className="font-medium">{quote.usableDistanceKm ?? "—"}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Billable km rule: max(route km, included km). Operational charges are bundled as
            one total amount.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Line item</th>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="px-2 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item, index) => (
                  <tr key={`${item.lineType}-${index}`} className="border-b border-border/50">
                    <td className="px-2 py-2 font-medium">{item.lineType}</td>
                    <td className="px-2 py-2">{item.description}</td>
                    <td className="px-2 py-2 text-right">{currency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
