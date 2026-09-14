import Link from "next/link";

import { Button } from "@/components/ui/button";

type LoginPageProps = {
  searchParams?: Promise<{ callbackUrl?: string; error?: string }>;
};

/**
 * Unified login entry (placeholder). Sign-in UI and flows ship in a later milestone.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const callbackUrl = params.callbackUrl;
  const error = params.error;
  const googleStartParams = new URLSearchParams();
  if (callbackUrl) {
    googleStartParams.set("callbackUrl", callbackUrl);
  }
  const googleStartUrl = `/api/v1/auth/google/start${
    googleStartParams.toString() ? `?${googleStartParams.toString()}` : ""
  }`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Continue with Google to access your dashboard.
        </p>
      </div>
      {callbackUrl ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
          After sign-in you would return to{" "}
          <span className="font-mono text-foreground">{callbackUrl}</span>
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive">
          {error === "google_not_configured"
            ? "Google sign-in is not configured yet. Add Google OAuth keys."
            : error === "google_state_invalid"
              ? "Google sign-in session expired. Please try again."
              : error === "google_signin_cancelled"
                ? "Google sign-in was cancelled. Please try again."
                : "Unable to sign in with Google right now. Please retry."}
        </p>
      ) : null}
      <Button asChild variant="outline">
        <Link href={googleStartUrl} prefetch={false}>
          Continue with Google
        </Link>
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        We will ask for your mobile number in the next step to continue booking.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="secondary">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
