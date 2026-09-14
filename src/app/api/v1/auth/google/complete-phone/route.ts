import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/db/prisma";
import {
  normalizeInternalCallbackUrl,
  readGooglePendingProfileToken,
} from "@/lib/auth/google-oauth";
import {
  TAMAYO_GOOGLE_PENDING_COOKIE,
  TAMAYO_SESSION_COOKIE,
} from "@/lib/auth/constants";
import { createPhoneSessionTokenForCustomer } from "@/lib/auth/phone-session";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  const pendingCookie = request.cookies.get(TAMAYO_GOOGLE_PENDING_COOKIE)?.value;
  const pendingProfile = readGooglePendingProfileToken(pendingCookie);

  if (!pendingProfile) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GOOGLE_SESSION_EXPIRED",
          message: "Google sign-in session expired. Please sign in again.",
        },
      },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as { phone?: string };
    const normalizedPhone = normalizePhone(body.phone?.trim() ?? "");
    if (normalizedPhone.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number.");
    }

    const googleIdentityKey = `google:${pendingProfile.googleSub}`;
    let identity = await prisma.identity.findUnique({
      where: { betterAuthUserId: googleIdentityKey },
    });

    if (!identity) {
      const phoneOwner = await prisma.identity.findUnique({
        where: { phone: normalizedPhone },
      });

      if (phoneOwner && phoneOwner.betterAuthUserId && phoneOwner.betterAuthUserId !== googleIdentityKey) {
        throw new Error("This phone number is already linked to another account.");
      }

      if (phoneOwner) {
        identity = await prisma.identity.update({
          where: { id: phoneOwner.id },
          data: {
            betterAuthUserId: googleIdentityKey,
            email: pendingProfile.email,
            verifiedAt: new Date(),
          },
        });
      } else {
        identity = await prisma.identity.create({
          data: {
            phone: normalizedPhone,
            email: pendingProfile.email,
            betterAuthUserId: googleIdentityKey,
            verifiedAt: new Date(),
          },
        });
      }
    } else if (identity.phone !== normalizedPhone) {
      throw new Error("This Google account is already linked to a different mobile number.");
    } else {
      identity = await prisma.identity.update({
        where: { id: identity.id },
        data: {
          email: pendingProfile.email,
          verifiedAt: new Date(),
        },
      });
    }

    const customerAccount = await prisma.customerAccount.upsert({
      where: { identityId: identity.id },
      update: pendingProfile.name ? { name: pendingProfile.name } : {},
      create: {
        identityId: identity.id,
        status: "ACTIVE",
        name: pendingProfile.name ?? null,
      },
    });

    const sessionMeta = createPhoneSessionTokenForCustomer({
      customerId: customerAccount.id,
      email: identity.email ?? pendingProfile.email,
      name: customerAccount.name ?? pendingProfile.name ?? null,
      phone: identity.phone,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        redirectTo: normalizeInternalCallbackUrl(pendingProfile.callbackUrl),
      },
    });
    response.cookies.set(TAMAYO_SESSION_COOKIE, sessionMeta.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMeta.sessionMaxAgeSeconds,
    });
    response.cookies.delete(TAMAYO_GOOGLE_PENDING_COOKIE);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GOOGLE_PHONE_LINK_FAILED",
          message: error instanceof Error ? error.message : "Unable to complete sign-in.",
        },
      },
      { status: 400 }
    );
  }
}
