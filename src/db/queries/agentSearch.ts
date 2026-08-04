import { db } from "@/db";

// Search surface for the Agent API — name/company/email substring match plus
// exact/alt-line phone match, same matching shape as findPossibleDuplicates
// but broader (that one is dedup-specific; this is general lookup) and
// capped so a vague query from an agent can't pull the whole table.
export function searchContacts(q: string, limit = 20) {
  const like = `%${q}%`;
  return db.query.contacts.findMany({
    where: (contacts, { ilike, or, eq, sql }) =>
      or(
        ilike(contacts.name, like),
        ilike(contacts.company, like),
        ilike(contacts.email, like),
        eq(contacts.phone, q),
        sql`${q} = any(${contacts.phoneAlt})`,
      ),
    with: {
      engagements: { with: { product: true } },
    },
    limit,
  });
}
