"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type PhoneLoginFormProps = {
  callbackUrl?: string;
};

export function PhoneLoginForm({ callbackUrl }: PhoneLoginFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: {
          debugCode?: string;
          resendAvailableInSeconds?: number;
          attemptsRemaining?: number;
          provider?: string;
        };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Unable to send OTP.");
      }

      setStep("otp");
      setMessage(
        payload.data?.debugCode
          ? `OTP sent. Dev code: ${payload.data.debugCode}. Attempts: ${payload.data.attemptsRemaining ?? 3}. Resend in ${payload.data.resendAvailableInSeconds ?? 30}s.`
          : `OTP sent to your phone. Resend available in ${payload.data?.resendAvailableInSeconds ?? 30}s.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Invalid OTP.");
      }

      setMessage("Login successful. Redirecting...");
      router.replace(callbackUrl || "/customer");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Phone OTP login</h2>
        <p className="text-xs text-muted-foreground">
          Enter your mobile number to receive a one-time password.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Mobile number</span>
        <input
          inputMode="numeric"
          maxLength={10}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Enter 10-digit mobile number"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"
          disabled={loading || step === "otp"}
        />
      </label>

      {step === "otp" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">OTP</span>
          <input
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="Enter 6-digit OTP"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"
            disabled={loading}
          />
        </label>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}

      <div className="flex gap-2">
        {step === "phone" ? (
          <Button type="button" onClick={requestOtp} disabled={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </Button>
        ) : (
          <>
            <Button type="button" onClick={verifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError(null);
                setMessage(null);
              }}
              disabled={loading}
            >
              Edit number
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
