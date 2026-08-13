import "server-only";

import { redirect } from "next/navigation";

import { serverEnv } from "@/config/env/server";
import { LOGIN_PATH } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";

type DevBypassSession = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  session: {
    id: string;
    createdAt: string;
    expiresAt: string;
  };
};

function buildDevBypassSession(callbackUrlPath: string): DevBypassSession {
  if (callbackUrlPath.startsWith("/supplier")) {
    return {
      user: {
        id: "mock-supplier-1",
        email: "supplier.dev@tamaiyyo.local",
        name: "Dev Supplier User",
      },
      session: {
        id: "dev-bypass-session-supplier",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  if (callbackUrlPath.startsWith("/admin")) {
    return {
      user: {
        id: "mock-admin-1",
        email: "admin.dev@tamaiyyo.local",
        name: "Dev Admin User",
      },
      session: {
        id: "dev-bypass-session-admin",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  return {
    user: {
      id: "mock-customer-1",
      email: "customer.dev@tamaiyyo.local",
      name: "Dev Customer User",
    },
    session: {
      id: "dev-bypass-session-customer",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

/**
 * Ensures a Better Auth session exists before rendering a protected layout tree.
 * Complements optimistic `middleware` cookie checks with a server session read.
 */
export async function requireSession(callbackUrlPath: string) {
  const session = await getSession();
  if (session) {
    return session;
  }

  if (serverEnv.devAuthBypassEnabled) {
    return buildDevBypassSession(callbackUrlPath);
  }

  if (!session) {
    const search = new URLSearchParams({ callbackUrl: callbackUrlPath });
    redirect(`${LOGIN_PATH}?${search.toString()}`);
  }
  return session;
}
