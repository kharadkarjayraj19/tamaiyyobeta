import "server-only";

import { PostHog } from "posthog-node";

import { serverEnv } from "@/config/env/server";

type CaptureServerEventParams = {
  distinctId: string;
  event: string;
  properties?: Record<string, string | number | boolean | null | undefined>;
};

const POSTHOG_HOST = serverEnv.posthogHost ?? "https://us.i.posthog.com";
const PROJECT_KEY = serverEnv.posthogProjectApiKey;

const posthogClient = PROJECT_KEY
  ? new PostHog(PROJECT_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    })
  : null;

/**
 * Fire-and-forget server analytics capture for API/service events.
 * Never throws; observability must not break product flows.
 */
export async function captureServerEvent({
  distinctId,
  event,
  properties,
}: CaptureServerEventParams): Promise<void> {
  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.capture({
      distinctId,
      event,
      properties,
    });

    await posthogClient.flush();
  } catch (error) {
    console.error("PostHog server capture failed:", error);
  }
}
