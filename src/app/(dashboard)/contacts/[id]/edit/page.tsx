import { getContactById, listContactsForReferralPicker } from "@/db/queries/contacts";
import { notFound } from "next/navigation";
import { ContactForm } from "../../ContactForm";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, referralOptions] = await Promise.all([
    getContactById(id),
    listContactsForReferralPicker(id),
  ]);

  if (!contact) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-display-sm uppercase tracking-[0.04em] text-text">
        Edit contact
      </h1>
      <ContactForm
        mode="edit"
        contactId={contact.id}
        referralOptions={referralOptions}
        defaultValues={{
          name: contact.name,
          company: contact.company ?? "",
          phone: contact.phone ?? "",
          phoneAlt: contact.phoneAlt?.join(", ") ?? "",
          email: contact.email ?? "",
          source: contact.source ?? "",
          referredBy: contact.referredBy ?? "",
          notes: contact.notes ?? "",
        }}
      />
    </div>
  );
}
