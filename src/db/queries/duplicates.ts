import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

export type PossibleDuplicate = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
};

// Doc 01 dedup rule: match on any phone in phone/phone_alt, then case-insensitive
// name — surfaced as a warning, never a hard block.
export async function findPossibleDuplicates({
  name,
  phone,
}: {
  name: string;
  phone?: string;
}): Promise<PossibleDuplicate[]> {
  const conditions = [ilike(contacts.name, name)];

  if (phone) {
    conditions.push(eq(contacts.phone, phone));
    conditions.push(sql`${phone} = any(${contacts.phoneAlt})`);
  }

  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(or(...conditions));
}
