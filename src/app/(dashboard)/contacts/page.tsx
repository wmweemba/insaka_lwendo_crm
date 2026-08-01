import { Button } from "@/components/ui/Button";
import { listContacts } from "@/db/queries/contacts";
import Link from "next/link";

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
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-left text-body">
            <thead className="sticky top-0 bg-bg-raised text-body-sm text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Engagements</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <Link href={`/contacts/${contact.id}`} className="text-text hover:text-accent">
                      {contact.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-text-muted">{contact.company ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-mono text-text-muted">
                    {contact.phone ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-text-muted">
                    {contact.engagements.length === 0
                      ? "—"
                      : contact.engagements
                          .map((e) => `${e.product.name}: ${e.stage}`)
                          .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
