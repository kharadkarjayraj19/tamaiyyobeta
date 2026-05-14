import Link from "next/link";

import { Button } from "@/components/ui/button";

type LoginPageProps = {
  searchParams?: Promise<{ callbackUrl?: string }>;
};

/**
 * Unified login entry (placeholder). Sign-in UI and flows ship in a later milestone.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const callbackUrl = params.callbackUrl;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Authentication is being wired. Email/password, OTP, and Google sign-in will connect
          here per product specs—no flows are active in this milestone.
        </p>
      </div>
      {callbackUrl ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
          After sign-in you would return to{" "}
          <span className="font-mono text-foreground">{callbackUrl}</span>
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="secondary">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
