import { Inbox } from "lucide-react";

import { DashboardCard } from "@/components/shared/dashboard/dashboard-card";
import { DataTableShell } from "@/components/shared/data-display/data-table-shell";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { SectionHeader } from "@/components/shared/layout/section-header";

export default function SupplierOverviewPage() {
  return (
    <div className="space-y-10">
      <SectionHeader
        title="Overview"
        description="Supplier operations placeholder. Fleet and trip management will connect here per future feature specs."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard title="Operations" description="Reserved for dispatch KPIs.">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">—</p>
        </DashboardCard>
        <DashboardCard title="Coverage" description="Reserved for route or region summaries.">
          <p className="text-sm text-muted-foreground">No coverage data yet.</p>
        </DashboardCard>
      </div>
      <DataTableShell footer={<span className="text-muted-foreground">0 rows · example shell</span>}>
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">State</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-0" colSpan={3}>
                <EmptyState
                  icon={Inbox}
                  title="No supplier rows"
                  description="Use this wrapper for operational tables with horizontal scroll on small screens."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
