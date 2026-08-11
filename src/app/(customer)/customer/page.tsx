import { Inbox } from "lucide-react";
import Link from "next/link";

import { DashboardCard } from "@/components/shared/dashboard/dashboard-card";
import { DataTableShell } from "@/components/shared/data-display/data-table-shell";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { SectionHeader } from "@/components/shared/layout/section-header";

export default function CustomerOverviewPage() {
  return (
    <div className="space-y-10">
      <SectionHeader
        title="Overview"
        description="Customer dashboard overview. Use Quote Builder to test tour and one-way pricing flows."
        actions={
          <Link
            href="/customer/booking-quote"
            className="inline-flex rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Open Quote Builder
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard title="At a glance" description="Reserved for future KPIs.">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">—</p>
        </DashboardCard>
        <DashboardCard title="Activity" description="Reserved for recent events.">
          <p className="text-sm text-muted-foreground">No activity to show yet.</p>
        </DashboardCard>
      </div>
      <DataTableShell footer={<span className="text-muted-foreground">0 rows · example shell</span>}>
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-0" colSpan={3}>
                <EmptyState
                  icon={Inbox}
                  title="Nothing here yet"
                  description="Operational tables render in this shell when connected to real data."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
