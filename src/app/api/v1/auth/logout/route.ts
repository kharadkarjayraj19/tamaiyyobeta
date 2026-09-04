import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { clearPhoneSession } from "@/lib/auth/phone-session";
import { TAMAYO_SESSION_COOKIE } from "@/lib/auth/constants";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TAMAYO_SESSION_COOKIE)?.value;
  clearPhoneSession(token);

  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set(TAMAYO_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
