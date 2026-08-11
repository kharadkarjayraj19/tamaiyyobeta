"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { clientEnv } from "@/config/env/client";

import { PostHogPageviewTracker } from "./posthog-pageview-tracker";

/**
 * Initializes PostHog for browser analytics when a project key is configured.
 * Safe no-op in local/dev environments without analytics credentials.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!clientEnv.posthogKey) {
      return;
    }

    posthog.init(clientEnv.posthogKey, {
      api_host: clientEnv.posthogHost,
      capture_pageview: false,
      persistence: "localStorage",
    });
  }, []);

  return (
    <>
      <PostHogPageviewTracker />
      {children}
    </>
  );
}
