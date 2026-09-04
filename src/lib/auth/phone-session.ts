import "server-only";

import { randomInt, randomUUID } from "node:crypto";

import prisma from "@/lib/db/prisma";
import { serverEnv } from "@/config/env/server";

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_VERIFY_ATTEMPTS = 3;

type OtpRecord = {
  phone: string;
  code: string;
  expiresAt: number;
  lastSentAt: number;
  attemptsUsed: number;
};

type SessionRecord = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string;
  };
  session: {
    id: string;
    createdAt: string;
    expiresAt: string;
  };
  expiresAtMs: number;
};

type ProviderOtpSendResult = {
  provider: "MSG91" | "LOCAL";
  debugCode?: string;
};

const otpStore = new Map<string, OtpRecord>();
const sessionStore = new Map<string, SessionRecord>();

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function buildOtp(): string {
  return randomInt(100000, 1000000).toString();
}

function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [phone, record] of otpStore.entries()) {
    if (record.expiresAt <= now) {
      otpStore.delete(phone);
    }
  }

  for (const [token, record] of sessionStore.entries()) {
    if (record.expiresAtMs <= now) {
      sessionStore.delete(token);
    }
  }
}

async function sendOtpViaMsg91(params: {
  phone: string;
  otp: string;
}): Promise<ProviderOtpSendResult> {
  const authKey = serverEnv.msg91AuthKey;
  const templateId = serverEnv.msg91TemplateId;

  if (!authKey || !templateId) {
    return {
      provider: "LOCAL",
      debugCode: params.otp,
    };
  }

  const qs = new URLSearchParams({
    mobile: `91${params.phone}`,
    otp: params.otp,
    authkey: authKey,
    template_id: templateId,
    otp_expiry: String(Math.floor(OTP_TTL_MS / 1000)),
  });

  const response = await fetch(`https://control.msg91.com/api/v5/otp?${qs.toString()}`, {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `MSG91 OTP send failed (${response.status}): ${errorText.slice(0, 240)}`
    );
  }

  return { provider: "MSG91" };
}

export async function requestPhoneOtp(phone: string) {
  cleanupExpiredRecords();

  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) {
    throw new Error("Please enter a valid 10-digit mobile number.");
  }

  const now = Date.now();
  const existing = otpStore.get(normalized);
  if (existing && existing.lastSentAt + RESEND_COOLDOWN_MS > now) {
    const retryAfterSeconds = Math.ceil(
      (existing.lastSentAt + RESEND_COOLDOWN_MS - now) / 1000
    );
    throw new Error(`Please wait ${retryAfterSeconds}s before requesting OTP again.`);
  }

  const code = buildOtp();
  const providerResult = await sendOtpViaMsg91({
    phone: normalized,
    otp: code,
  });

  otpStore.set(normalized, {
    phone: normalized,
    code,
    expiresAt: now + OTP_TTL_MS,
    lastSentAt: now,
    attemptsUsed: 0,
  });

  return {
    phone: normalized,
    provider: providerResult.provider,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    resendAvailableInSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
    attemptsRemaining: MAX_VERIFY_ATTEMPTS,
    debugCode: process.env.NODE_ENV === "development" ? providerResult.debugCode : undefined,
  };
}

export async function verifyPhoneOtp(params: { phone: string; otp: string }) {
  cleanupExpiredRecords();

  const normalizedPhone = normalizePhone(params.phone);
  const normalizedOtp = params.otp.trim();
  const record = otpStore.get(normalizedPhone);

  if (!record || record.expiresAt <= Date.now()) {
    throw new Error("Invalid or expired OTP. Please request a new code.");
  }

  if (record.attemptsUsed >= MAX_VERIFY_ATTEMPTS) {
    throw new Error("Maximum OTP attempts reached. Please request a new OTP.");
  }

  if (record.code !== normalizedOtp) {
    record.attemptsUsed += 1;
    otpStore.set(normalizedPhone, record);

    const attemptsLeft = Math.max(0, MAX_VERIFY_ATTEMPTS - record.attemptsUsed);
    if (attemptsLeft === 0) {
      throw new Error("Maximum OTP attempts reached. Please request a new OTP.");
    }

    throw new Error(`Incorrect OTP. ${attemptsLeft} attempt(s) remaining.`);
  }

  otpStore.delete(normalizedPhone);

  const identity = await prisma.identity.upsert({
    where: { phone: normalizedPhone },
    update: {
      verifiedAt: new Date(),
    },
    create: {
      phone: normalizedPhone,
      verifiedAt: new Date(),
    },
  });

  const customerAccount = await prisma.customerAccount.upsert({
    where: { identityId: identity.id },
    update: {},
    create: {
      identityId: identity.id,
      status: "ACTIVE",
    },
  });

  const sessionToken = randomUUID();
  const now = Date.now();
  const expiresAtMs = now + SESSION_TTL_MS;

  sessionStore.set(sessionToken, {
    user: {
      id: customerAccount.id,
      email: identity.email ?? null,
      name: customerAccount.name ?? null,
      phone: normalizedPhone,
    },
    session: {
      id: sessionToken,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    },
    expiresAtMs,
  });

  return {
    sessionToken,
    sessionMaxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function getPhoneSession(token: string | undefined | null) {
  cleanupExpiredRecords();
  if (!token) {
    return null;
  }

  const record = sessionStore.get(token);
  if (!record) {
    return null;
  }

  if (record.expiresAtMs <= Date.now()) {
    sessionStore.delete(token);
    return null;
  }

  return {
    user: {
      id: record.user.id,
      email: record.user.email,
      name: record.user.name,
      phone: record.user.phone,
    },
    session: {
      id: record.session.id,
      createdAt: record.session.createdAt,
      expiresAt: record.session.expiresAt,
    },
  };
}

export function clearPhoneSession(token: string | undefined | null) {
  if (!token) {
    return;
  }
  sessionStore.delete(token);
}
