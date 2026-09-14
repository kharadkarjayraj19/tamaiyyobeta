import { NextRequest, NextResponse } from "next/server";

import {
  buildGoogleOAuthRedirectUriFromOrigin,
  createGoogleOAuthState,
  getGoogleOAuthConfig,
  normalizeInternalCallbackUrl,
} from "@/lib/auth/google-oauth";
import { TAMAYO_GOOGLE_STATE_COOKIE } from "@/lib/auth/constants";

export async function GET(request: NextRequest) {
  try {
    const callbackUrl = normalizeInternalCallbackUrl(request.nextUrl.searchParams.get("callbackUrl"));
    const { clientId } = getGoogleOAuthConfig();
    const { state, token, maxAgeSeconds } = createGoogleOAuthState(callbackUrl);
    const redirectUri = buildGoogleOAuthRedirectUriFromOrigin(request.nextUrl.origin);

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("prompt", "select_account");

    const response = NextResponse.redirect(googleAuthUrl.toString());
    response.cookies.set(TAMAYO_GOOGLE_STATE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: maxAgeSeconds,
    });
    return response;
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(loginUrl);
  }
}
