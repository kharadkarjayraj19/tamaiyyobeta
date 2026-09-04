import { NextRequest, NextResponse } from "next/server";

import { verifyPhoneOtp } from "@/lib/auth/phone-session";
import { TAMAYO_SESSION_COOKIE } from "@/lib/auth/constants";
import { captureServerEvent } from "@/lib/observability/posthog-server";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  let normalizedPhone = "";
  try {
    const body = (await request.json()) as { phone?: string; otp?: string };
    const phone = body.phone?.trim() ?? "";
    normalizedPhone = normalizePhone(phone);
    const otp = body.otp?.trim() ?? "";
    const sessionMeta = await verifyPhoneOtp({ phone, otp });

    captureServerEvent({
      distinctId: `otp:${normalizedPhone || "unknown"}`,
      event: "otp_verified",
      properties: {
        phoneLast4: normalizedPhone.slice(-4) || null,
      },
    }).catch(() => undefined);

    const response = NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );

    response.cookies.set(TAMAYO_SESSION_COOKIE, sessionMeta.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMeta.sessionMaxAgeSeconds,
    });

    return response;
  } catch (error) {
    captureServerEvent({
      distinctId: `otp:${normalizedPhone || "unknown"}`,
      event: "otp_verify_failed",
      properties: {
        phoneLast4: normalizedPhone.slice(-4) || null,
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Unable to verify OTP.",
          code: "OTP_VERIFY_FAILED",
        },
      },
      { status: 400 }
    );
  }
}
