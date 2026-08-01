import { listContactsForReferralPicker } from "@/db/queries/contacts";
import { ContactForm } from "../ContactForm";

export default async function NewContactPage() {
  const referralOptions = await listContactsForReferralPicker();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-display-sm uppercase tracking-[0.04em] text-text">
        Add contact
      </h1>
      <ContactForm mode="create" referralOptions={referralOptions} />
    </div>
  );
}
