import { SectionHeader } from "@/components/shared/layout/section-header";
import { QuoteWorkbench } from "@/features/pricing/ui/quote-workbench";

export default function CustomerBookingQuotePage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Quote builder"
        description="Generate tour and one-way quotes with billable km and bundled operational charges."
      />
      <QuoteWorkbench />
    </div>
  );
}
