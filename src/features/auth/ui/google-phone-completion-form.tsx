"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type GooglePhoneCompletionFormProps = {
  callbackUrl?: string;
};

export function GooglePhoneCompletionForm({ callbackUrl }: GooglePhoneCompletionFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeProfile() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/google/complete-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        data?: { redirectTo?: string };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Unable to complete sign-in.");
      }

      router.replace(payload.data?.redirectTo || callbackUrl || "/customer");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete sign-in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Mobile number</span>
        <input
          inputMode="numeric"
          maxLength={10}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Enter 10-digit mobile number"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"
          disabled={loading}
        />
      </label>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Button type="button" onClick={completeProfile} disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </div>
  );
}
