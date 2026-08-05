import { Button } from "@/components/ui/Button";
import { listContacts } from "@/db/queries/contacts";
import Link from "next/link";
import { ContactsList } from "./ContactsList";

export default async function ContactsPage() {
  const contacts = await listContacts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-sm uppercase tracking-[0.04em] text-text">
          Contacts
        </h1>
        <Link href="/contacts/new">
          <Button>Add contact</Button>
        </Link>
      </div>

      {contacts.length === 0 ? (
        <p className="text-body text-text-muted">
          No one&apos;s at the fire yet — add your first lead.
        </p>
      ) : (
        <ContactsList contacts={contacts} />
      )}
    </div>
  );
}
