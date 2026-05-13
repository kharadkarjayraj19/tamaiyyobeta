import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Tamaiyyo</p>
        <h1 className="text-3xl font-semibold tracking-tight">{siteConfig.name}</h1>
        <p className="text-muted-foreground">{siteConfig.description}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Foundation routes are grouped by role. No business features yet.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/customer">Customer area</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/supplier">Supplier area</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin">Admin area</Link>
        </Button>
      </div>
    </main>
  );
}
