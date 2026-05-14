import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Authenticated but not permitted (403-style) — placeholder until RBAC UX is specified.
 */
export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You are signed in, but this area is not available for your account. Contact support if
          you believe this is a mistake.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
