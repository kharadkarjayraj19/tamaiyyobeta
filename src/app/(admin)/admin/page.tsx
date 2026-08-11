import { Inbox } from "lucide-react";
import Link from "next/link";

import { DashboardCard } from "@/components/shared/dashboard/dashboard-card";
import { DataTableShell } from "@/components/shared/data-display/data-table-shell";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { SectionHeader } from "@/components/shared/layout/section-header";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-10">
      <SectionHeader
        title="Overview"
        description="Administration overview. Corridor pricing can now be configured from this role."
        actions={
          <Link
            href="/admin/one-way-corridors"
            className="inline-flex rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Manage Corridors
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard title="Platform health" description="Reserved for incident or queue counts.">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">—</p>
        </DashboardCard>
        <DashboardCard title="Queues" description="Reserved for review workloads.">
          <p className="text-sm text-muted-foreground">No queue metrics yet.</p>
        </DashboardCard>
      </div>
      <DataTableShell footer={<span className="text-muted-foreground">0 rows · example shell</span>}>
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-0" colSpan={3}>
                <EmptyState
                  icon={Inbox}
                  title="No admin records"
                  description="Dense admin tables can use the same shell with optional toolbar and footer slots."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
