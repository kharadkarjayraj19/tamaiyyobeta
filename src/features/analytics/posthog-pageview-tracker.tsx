"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

import { clientEnv } from "@/config/env/client";

/**
 * Captures pageview events on client-side route transitions.
 */
export function PostHogPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!clientEnv.posthogKey || !pathname) {
      return;
    }

    const query = searchParams.toString();
    const currentUrl = query.length > 0 ? `${pathname}?${query}` : pathname;

    posthog.capture("$pageview", {
      $current_url: currentUrl,
      app: "tamayo-web",
    });
  }, [pathname, searchParams]);

  return null;
}
