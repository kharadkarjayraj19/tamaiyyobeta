import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PageSkeletonProps = {
  className?: string;
};

/**
 * Lightweight full-page loading skeleton (route-level `loading.tsx`).
 */
export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6 px-4 py-8 sm:px-6 lg:px-8", className)} aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full sm:col-span-2 lg:col-span-1" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
