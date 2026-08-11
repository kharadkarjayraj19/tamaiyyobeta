import { SectionHeader } from "@/components/shared/layout/section-header";
import { OneWayCorridorManager } from "@/features/pricing/ui/one-way-corridor-manager";

export default function AdminOneWayCorridorsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="One-way corridors"
        description="Configure hotspot one-way transfer routes and fixed fares used by booking quotes."
      />
      <OneWayCorridorManager />
    </div>
  );
}
