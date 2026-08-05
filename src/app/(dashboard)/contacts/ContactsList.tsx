"use client";

import { Input } from "@/components/ui/Input";
import type { listContacts } from "@/db/queries/contacts";
import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Contact = Awaited<ReturnType<typeof listContacts>>[number];

function matches(contact: Contact, query: string): boolean {
  const q = query.toLowerCase();
  return (
    contact.name.toLowerCase().includes(q) ||
    (contact.company?.toLowerCase().includes(q) ?? false) ||
    (contact.phone?.toLowerCase().includes(q) ?? false) ||
    (contact.phoneAlt?.some((p) => p.toLowerCase().includes(q)) ?? false)
  );
}

export function ContactsList({ contacts }: { contacts: Contact[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (q === "") return contacts;
    return contacts.filter((c) => matches(c, q));
  }, [contacts, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, or phone…"
          className="pl-9"
          aria-label="Search contacts"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-body text-text-muted">No contacts match &quot;{query}&quot;.</p>
      ) : (
        <>
          {/* Mobile: stacked cards, no horizontal scroll — a table can't shrink to fit a phone */}
          <ul className="flex flex-col gap-2 sm:hidden">
            {filtered.map((contact) => (
              <li key={contact.id}>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex flex-col gap-1 rounded-sm border border-border px-4 py-3"
                >
                  <span className="text-body text-text">{contact.name}</span>
                  {contact.company ? (
                    <span className="text-body-sm text-text-muted">{contact.company}</span>
                  ) : null}
                  {contact.phone ? (
                    <span className="font-mono text-mono text-body-sm text-text-muted">
                      {contact.phone}
                    </span>
                  ) : null}
                  {contact.engagements.length > 0 ? (
                    <span className="text-body-sm text-text-muted">
                      {contact.engagements
                        .map((e) => `${e.product.name}: ${e.stage}`)
                        .join(", ")}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop / tablet: table */}
          <div className="hidden overflow-x-auto rounded-sm border border-border sm:block">
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
                {filtered.map((contact) => (
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
        </>
      )}
    </div>
  );
}
