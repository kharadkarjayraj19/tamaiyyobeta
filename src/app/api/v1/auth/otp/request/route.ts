import { NextRequest, NextResponse } from "next/server";

import { requestPhoneOtp } from "@/lib/auth/phone-session";
import { captureServerEvent } from "@/lib/observability/posthog-server";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  let normalizedPhone = "";
  try {
    const body = (await request.json()) as { phone?: string };
    const phone = body.phone?.trim() ?? "";
    normalizedPhone = normalizePhone(phone);
    const otpMeta = await requestPhoneOtp(phone);

    captureServerEvent({
      distinctId: `otp:${normalizedPhone || "unknown"}`,
      event: "otp_requested",
      properties: {
        phoneLast4: normalizedPhone.slice(-4) || null,
        provider: otpMeta.provider,
        resendCooldownSec: otpMeta.resendAvailableInSeconds,
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        success: true,
        data: {
          expiresInSeconds: otpMeta.expiresInSeconds,
          resendAvailableInSeconds: otpMeta.resendAvailableInSeconds,
          attemptsRemaining: otpMeta.attemptsRemaining,
          provider: otpMeta.provider,
          debugCode: otpMeta.debugCode,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    captureServerEvent({
      distinctId: `otp:${normalizedPhone || "unknown"}`,
      event: "otp_request_failed",
      properties: {
        phoneLast4: normalizedPhone.slice(-4) || null,
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unable to send OTP.",
          code: "OTP_REQUEST_FAILED",
        },
      },
      { status: 400 }
    );
  }
}
