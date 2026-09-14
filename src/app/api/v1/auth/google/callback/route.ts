import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/db/prisma";
import {
  createGooglePendingProfileToken,
  getGoogleOAuthConfig,
  getGoogleOAuthRedirectUri,
  readGoogleOAuthStateToken,
} from "@/lib/auth/google-oauth";
import {
  TAMAYO_GOOGLE_PENDING_COOKIE,
  TAMAYO_GOOGLE_STATE_COOKIE,
  TAMAYO_SESSION_COOKIE,
} from "@/lib/auth/constants";
import { createPhoneSessionTokenForCustomer } from "@/lib/auth/phone-session";

type GoogleTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
};

async function exchangeCodeForGoogleToken(params: { code: string; redirectUri: string }) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: params.code,
    grant_type: "authorization_code",
    redirect_uri: params.redirectUri,
  });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const tokenError = await tokenResponse.text();
    throw new Error(`Google token exchange failed: ${tokenError.slice(0, 240)}`);
  }

  return (await tokenResponse.json()) as GoogleTokenResponse;
}

async function fetchGoogleUserInfo(accessToken: string) {
  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!userInfoResponse.ok) {
    const userInfoError = await userInfoResponse.text();
    throw new Error(`Google profile fetch failed: ${userInfoError.slice(0, 240)}`);
  }

  return (await userInfoResponse.json()) as GoogleUserInfo;
}

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const rawState = request.nextUrl.searchParams.get("state");
  const rawCode = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const stateCookie = request.cookies.get(TAMAYO_GOOGLE_STATE_COOKIE)?.value;
  const parsedState = readGoogleOAuthStateToken(stateCookie);

  const finalize = (response: NextResponse) => {
    response.cookies.delete(TAMAYO_GOOGLE_STATE_COOKIE);
    return response;
  };

  if (!parsedState || !rawState || rawState !== parsedState.state) {
    loginUrl.searchParams.set("error", "google_state_invalid");
    return finalize(NextResponse.redirect(loginUrl));
  }

  if (oauthError || !rawCode) {
    loginUrl.searchParams.set("error", "google_signin_cancelled");
    return finalize(NextResponse.redirect(loginUrl));
  }

  try {
    const tokenData = await exchangeCodeForGoogleToken({
      code: rawCode,
      redirectUri: getGoogleOAuthRedirectUri(),
    });
    const userInfo = await fetchGoogleUserInfo(tokenData.access_token);

    if (!userInfo.sub || !userInfo.email) {
      throw new Error("Google profile did not return required fields.");
    }

    const googleIdentityKey = `google:${userInfo.sub}`;
    const existingIdentity = await prisma.identity.findUnique({
      where: { betterAuthUserId: googleIdentityKey },
      include: { customerAccount: true },
    });

    if (existingIdentity?.customerAccount) {
      const sessionMeta = createPhoneSessionTokenForCustomer({
        customerId: existingIdentity.customerAccount.id,
        email: existingIdentity.email ?? userInfo.email,
        name: existingIdentity.customerAccount.name ?? userInfo.name ?? null,
        phone: existingIdentity.phone,
      });

      const callbackUrl = parsedState.callbackUrl || "/customer";
      const response = finalize(NextResponse.redirect(new URL(callbackUrl, request.url)));
      response.cookies.set(TAMAYO_SESSION_COOKIE, sessionMeta.sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: sessionMeta.sessionMaxAgeSeconds,
      });
      response.cookies.delete(TAMAYO_GOOGLE_PENDING_COOKIE);
      return response;
    }

    const pendingProfile = createGooglePendingProfileToken({
      googleSub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name ?? null,
      callbackUrl: parsedState.callbackUrl || "/customer",
    });

    const completeUrl = new URL("/login/complete-profile", request.url);
    completeUrl.searchParams.set("callbackUrl", parsedState.callbackUrl || "/customer");
    const response = finalize(NextResponse.redirect(completeUrl));
    response.cookies.set(TAMAYO_GOOGLE_PENDING_COOKIE, pendingProfile.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: pendingProfile.maxAgeSeconds,
    });
    return response;
  } catch {
    loginUrl.searchParams.set("error", "google_signin_failed");
    return finalize(NextResponse.redirect(loginUrl));
  }
}
