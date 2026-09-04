import { SectionHeader } from "@/components/shared/layout/section-header";
import { QuoteWorkbench } from "@/features/pricing/ui/quote-workbench";

export default function CustomerBookingQuotePage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="See prices"
        description="Compare your fare, included distance, and reserve quickly with transparent pricing."
      />
      <QuoteWorkbench />
    </div>
  );
}
