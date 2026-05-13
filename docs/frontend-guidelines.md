# Frontend guidelines

Practical conventions for Tamaiyyo’s Next.js + TypeScript + Tailwind + shadcn/ui codebase.

## General principles

- Prefer **clear, boring code** over clever abstractions until a pattern repeats three times.
- **Do not assume product requirements.** When in doubt, ask for clarification before modeling data or flows.
- Keep files **small and focused**; split when a module handles routing, data fetching, and complex UI all at once.
- Match existing **import style**, naming, and formatting (Prettier + ESLint).

## React and Next.js

- Default to **Server Components**. Add `"use client"` only when you need browser-only APIs, local state, or event handlers in that file.
- Co-locate route-specific components under `app/...` only when they are not reused elsewhere; promote to `components/shared` or `features/*` when reuse appears.
- Prefer **named exports** for components unless the file is a Next.js `page.tsx`, `layout.tsx`, or `loading.tsx` entry.

## Styling

- Use **Tailwind** utility classes for layout and spacing.
- Use **shadcn tokens** (`bg-background`, `text-muted-foreground`, etc.) instead of hard-coded hex values unless you are defining design tokens in `globals.css`.
- Use `cn()` from `@/lib/utils` when merging conditional classes.

## shadcn/ui

- Add primitives with the CLI when possible: `npx shadcn@latest add <component>`.
- Do not fork shadcn primitives unless necessary; extend via composition in `components/shared`.

## Data and env (future-friendly)

- Never read `process.env` directly in scattered files once real configuration exists; centralize in `src/config/env/*`.
- Never import `src/config/env/server.ts` from Client Components.

## Testing (to be introduced)

When you add tests, prefer **colocated** `*.test.ts(x)` next to small modules or a dedicated `tests/` tree for integration flows—pick one convention and document it here.

## Accessibility

- Prefer semantic HTML elements (`button`, `nav`, `main`) over clickable `div`s.
- Ensure interactive controls remain keyboard-focusable; shadcn primitives help but custom composites must be verified.
