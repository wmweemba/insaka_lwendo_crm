import { db } from "@/db";
import { contacts } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export function listContacts() {
  return db.query.contacts.findMany({
    orderBy: [asc(contacts.name)],
    with: {
      engagements: {
        with: { product: true },
      },
    },
  });
}

export function getContactById(id: string) {
  return db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: {
      referredByContact: true,
      referrals: true,
      engagements: {
        with: { product: true },
        orderBy: (engagements, { asc }) => [asc(engagements.createdAt)],
      },
    },
  });
}

export function listContactsForReferralPicker(excludeId?: string) {
  return db.query.contacts.findMany({
    columns: { id: true, name: true, company: true },
    where: excludeId ? (contacts, { ne }) => ne(contacts.id, excludeId) : undefined,
    orderBy: [asc(contacts.name)],
  });
}
