"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const CATEGORY_OPTIONS = [
  "SEDAN",
  "ERTIGA",
  "KIA_CARENS",
  "INNOVA_CRYSTA",
  "TEMPO_TRAVELLER",
] as const;

type Corridor = {
  id: string;
  sourceCity: string;
  destinationCity: string;
  vehicleCategory: (typeof CATEGORY_OPTIONS)[number];
  fareAmount: string;
  routeDistanceKm: number | null;
  returnDistanceKm: number | null;
  isActive: boolean;
};

type FormState = {
  sourceCity: string;
  destinationCity: string;
  vehicleCategory: (typeof CATEGORY_OPTIONS)[number];
  fareAmount: string;
  routeDistanceKm: string;
  returnDistanceKm: string;
};

const defaultFormState: FormState = {
  sourceCity: "Nashik",
  destinationCity: "Aurangabad",
  vehicleCategory: "INNOVA_CRYSTA",
  fareAmount: "10800.00",
  routeDistanceKm: "180",
  returnDistanceKm: "180",
};

function formatCurrency(amount: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function OneWayCorridorManager() {
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [rows, setRows] = useState<Corridor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadCorridors() {
    setLoadingList(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/admin/one-way-corridors?limit=100");
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message ?? "Unable to load corridors.");
      }
      setRows(result.data as Corridor[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load corridors.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void loadCorridors();
  }, []);

  async function createCorridor() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/admin/one-way-corridors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mock-admin-id": "demo-admin-ui",
        },
        body: JSON.stringify({
          sourceCity: form.sourceCity.trim(),
          destinationCity: form.destinationCity.trim(),
          vehicleCategory: form.vehicleCategory,
          fareAmount: form.fareAmount,
          routeDistanceKm: form.routeDistanceKm
            ? Number(form.routeDistanceKm)
            : undefined,
          returnDistanceKm: form.returnDistanceKm
            ? Number(form.returnDistanceKm)
            : undefined,
          isActive: true,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message ?? "Unable to create corridor.");
      }

      await loadCorridors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create corridor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <label className="space-y-1">
          <span className="text-sm font-medium">Vehicle category</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.vehicleCategory}
            onChange={(event) =>
              updateField(
                "vehicleCategory",
                event.target.value as FormState["vehicleCategory"]
              )
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
          <span className="text-sm font-medium">Fixed fare amount</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.fareAmount}
            onChange={(event) => updateField("fareAmount", event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Route distance km</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.routeDistanceKm}
            onChange={(event) => updateField("routeDistanceKm", event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Return distance km</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.returnDistanceKm}
            onChange={(event) => updateField("returnDistanceKm", event.target.value)}
          />
        </label>
      </div>

      <div className="flex gap-3">
        <Button onClick={createCorridor} disabled={loading || loadingList}>
          {loading ? "Saving..." : "Add corridor"}
        </Button>
        <Button variant="outline" onClick={loadCorridors} disabled={loading || loadingList}>
          {loadingList ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Route</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Fare</th>
              <th className="px-3 py-2 font-medium">Route km</th>
              <th className="px-3 py-2 font-medium">Return km</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                  No corridors configured yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/40">
                  <td className="px-3 py-2 font-medium">
                    {row.sourceCity} → {row.destinationCity}
                  </td>
                  <td className="px-3 py-2">{row.vehicleCategory}</td>
                  <td className="px-3 py-2">{formatCurrency(row.fareAmount)}</td>
                  <td className="px-3 py-2">{row.routeDistanceKm ?? "—"}</td>
                  <td className="px-3 py-2">{row.returnDistanceKm ?? "—"}</td>
                  <td className="px-3 py-2">
                    {row.isActive ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
