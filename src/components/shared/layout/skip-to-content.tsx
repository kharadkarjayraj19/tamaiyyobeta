import { MAIN_CONTENT_ID } from "./main-content-id";

/**
 * Skip to primary content (`#main-content`). First focusable element in tab order.
 */
export function SkipToContent() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-transform"
    >
      Skip to main content
    </a>
  );
}
