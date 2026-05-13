/**
 * Centralized layout / chrome class strings (Tailwind + design tokens).
 * Prefer these over repeating long class lists in shells and pages.
 */
export const uiLayout = {
  /** Primary scroll region inside role dashboards */
  mainScroll: "min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
  /** Sticky top chrome (navbar) */
  topBar:
    "sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-elevated/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-elevated/80 sm:px-6",
  /** Desktop sidebar inner padding */
  sidebarPad: "flex h-full flex-col gap-1 p-3",
  /** Nav link base (active + inactive layered in component) */
  navLinkBase:
    "flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
} as const;
