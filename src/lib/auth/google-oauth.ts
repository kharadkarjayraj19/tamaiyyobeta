import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/config/env/server";

const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;
const GOOGLE_PENDING_PROFILE_TTL_SECONDS = 15 * 60;
const AUTH_BASE_URL =
  serverEnv.betterAuthUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const GOOGLE_CALLBACK_PATH = "/api/v1/auth/google/callback";
const COOKIE_SIGNING_SECRET = serverEnv.betterAuthSecret || "tamayo-dev-session-secret";

type GoogleStateTokenPayload = {
  state: string;
  callbackUrl: string;
  expiresAtMs: number;
};

type GooglePendingProfilePayload = {
  googleSub: string;
  email: string;
  name: string | null;
  callbackUrl: string;
  expiresAtMs: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadSegment: string) {
  return createHmac("sha256", COOKIE_SIGNING_SECRET).update(payloadSegment).digest("base64url");
}

function createSignedToken(payload: object) {
  const payloadSegment = toBase64Url(JSON.stringify(payload));
  const signatureSegment = signPayload(payloadSegment);
  return `${payloadSegment}.${signatureSegment}`;
}

function parseSignedToken<T>(token: string): T | null {
  const [payloadSegment, signatureSegment] = token.split(".");
  if (!payloadSegment || !signatureSegment) {
    return null;
  }

  try {
    const expectedSignature = signPayload(payloadSegment);
    const provided = Buffer.from(signatureSegment, "base64url");
    const expected = Buffer.from(expectedSignature, "base64url");
    if (provided.length !== expected.length) {
      return null;
    }
    if (!timingSafeEqual(provided, expected)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(payloadSegment)) as T;
  } catch {
    return null;
  }
}

export function normalizeInternalCallbackUrl(raw: string | null | undefined): string {
  const fallback = "/customer";
  if (!raw) {
    return fallback;
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export function createGoogleOAuthState(callbackUrl: string) {
  const state = randomUUID();
  const expiresAtMs = Date.now() + GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000;
  const token = createSignedToken({
    state,
    callbackUrl: normalizeInternalCallbackUrl(callbackUrl),
    expiresAtMs,
  } satisfies GoogleStateTokenPayload);

  return {
    state,
    token,
    maxAgeSeconds: GOOGLE_OAUTH_STATE_TTL_SECONDS,
  };
}

export function readGoogleOAuthStateToken(
  token: string | undefined | null
): GoogleStateTokenPayload | null {
  if (!token) {
    return null;
  }

  const parsed = parseSignedToken<GoogleStateTokenPayload>(token);
  if (!parsed) {
    return null;
  }
  if (!parsed.state || !parsed.callbackUrl || typeof parsed.expiresAtMs !== "number") {
    return null;
  }
  if (parsed.expiresAtMs <= Date.now()) {
    return null;
  }
  return parsed;
}

export function createGooglePendingProfileToken(input: {
  googleSub: string;
  email: string;
  name: string | null;
  callbackUrl: string;
}) {
  const expiresAtMs = Date.now() + GOOGLE_PENDING_PROFILE_TTL_SECONDS * 1000;
  const token = createSignedToken({
    googleSub: input.googleSub,
    email: input.email,
    name: input.name,
    callbackUrl: normalizeInternalCallbackUrl(input.callbackUrl),
    expiresAtMs,
  } satisfies GooglePendingProfilePayload);

  return {
    token,
    maxAgeSeconds: GOOGLE_PENDING_PROFILE_TTL_SECONDS,
  };
}

export function readGooglePendingProfileToken(
  token: string | undefined | null
): GooglePendingProfilePayload | null {
  if (!token) {
    return null;
  }

  const parsed = parseSignedToken<GooglePendingProfilePayload>(token);
  if (!parsed) {
    return null;
  }
  if (
    !parsed.googleSub ||
    !parsed.email ||
    !parsed.callbackUrl ||
    typeof parsed.expiresAtMs !== "number"
  ) {
    return null;
  }
  if (parsed.expiresAtMs <= Date.now()) {
    return null;
  }
  return parsed;
}

export function getGoogleOAuthRedirectUri() {
  return `${AUTH_BASE_URL}${GOOGLE_CALLBACK_PATH}`;
}

export function getGoogleOAuthConfig() {
  const clientId = serverEnv.googleOauthClientId?.trim();
  const clientSecret = serverEnv.googleOauthClientSecret?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Google login is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.");
  }
  return { clientId, clientSecret };
}
