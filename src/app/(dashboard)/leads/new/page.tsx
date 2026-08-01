import { listContactsForReferralPicker } from "@/db/queries/contacts";
import { listActiveProducts } from "@/db/queries/engagements";
import { QuickAddForm } from "./QuickAddForm";

export default async function QuickAddLeadPage() {
  const [referralOptions, activeProducts] = await Promise.all([
    listContactsForReferralPicker(),
    listActiveProducts(),
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="font-display text-display-sm uppercase tracking-[0.04em] text-text">
          Quick-add lead
        </h1>
        <p className="text-body-sm text-text-muted">
          Name, phone, product — the rest can wait.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-6">
        <QuickAddForm referralOptions={referralOptions} products={activeProducts} />
      </div>
    </div>
  );
}
