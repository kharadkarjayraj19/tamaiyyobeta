import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GooglePhoneCompletionForm } from "@/features/auth/ui/google-phone-completion-form";

type CompleteProfilePageProps = {
  searchParams?: Promise<{ callbackUrl?: string }>;
};

export default async function CompleteProfilePage({
  searchParams,
}: CompleteProfilePageProps) {
  const params = searchParams ? await searchParams : {};
  const callbackUrl = params.callbackUrl;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Complete your profile</h1>
        <p className="text-sm text-muted-foreground">
          Add your mobile number to continue with your booking.
        </p>
      </div>
      <GooglePhoneCompletionForm callbackUrl={callbackUrl} />
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="secondary">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </main>
  );
}
