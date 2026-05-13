import type { ReactNode } from "react";

type RoleShellProps = {
  role: "Customer" | "Supplier" | "Admin";
  children: ReactNode;
};

export function RoleShell({ role, children }: RoleShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {role}
        </p>
        <h1 className="text-lg font-semibold tracking-tight">Tamaiyyo · {role}</h1>
      </header>
      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
