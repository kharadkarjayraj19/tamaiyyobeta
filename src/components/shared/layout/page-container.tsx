import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  /** Widen dashboard pages; keep marketing-style pages narrower */
  variant?: "default" | "wide";
};

const variantMax: Record<NonNullable<PageContainerProps["variant"]>, string> = {
  default: "max-w-content",
  wide: "max-w-none",
};

/**
 * Horizontal padding + max width for readable / consistent page gutters.
 */
export function PageContainer({ children, className, variant = "default" }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8",
        variantMax[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
