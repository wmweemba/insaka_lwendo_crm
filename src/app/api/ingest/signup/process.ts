import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, engagements, interactions, products } from "@/db/schema";
import type { SignupPayload } from "./validations";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Doc 01 stage machine — automated transitions only ever move forward.
// SIGNED_UP+ engagements (and DORMANT/LOST, which are their own special
// cases) are left alone by this webhook rather than being reset.
const STAGES_BEFORE_SIGNED_UP = ["LEAD", "CONTACTED", "IN_CONVERSATION", "TRIALING"] as const;

export type ProcessSignupResult =
  | { outcome: "unhandled_event" }
  | { outcome: "unknown_app" }
  | {
      outcome: "linked" | "matched" | "created";
      contactId: string;
      engagementId: string;
      needsReview: boolean;
    };

async function findMatchingContact(
  tx: Tx,
  { email, phone, name, businessName }: { email?: string; phone?: string; name?: string; businessName?: string },
) {
  if (email) {
    const [c] = await tx.select().from(contacts).where(ilike(contacts.email, email)).limit(1);
    if (c) return c;
  }
  if (phone) {
    const [c] = await tx
      .select()
      .from(contacts)
      .where(or(eq(contacts.phone, phone), sql`${phone} = any(${contacts.phoneAlt})`))
      .limit(1);
    if (c) return c;
  }
  if (name || businessName) {
    const conditions = [];
    if (name) conditions.push(ilike(contacts.name, `%${name}%`));
    if (businessName) conditions.push(ilike(contacts.company, `%${businessName}%`));
    const [c] = await tx
      .select()
      .from(contacts)
      .where(or(...conditions))
      .limit(1);
    if (c) return c;
  }
  return null;
}

export async function processSignup(payload: SignupPayload): Promise<ProcessSignupResult> {
  if (payload.event !== "user.signed_up") {
    // Schema-ready for future events (doc 02 §3) — accept and no-op rather
    // than reject, since this isn't an error, just not built yet.
    return { outcome: "unhandled_event" };
  }

  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.slug, payload.app)).limit(1);
    if (!product) {
      return { outcome: "unknown_app" };
    }

    const occurredAt = new Date(payload.occurredAt);
    const happenedAt = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;

    // 1. Already linked to this app_user_id?
    const [existingLinked] = await tx
      .select()
      .from(engagements)
      .where(and(eq(engagements.productId, product.id), eq(engagements.appUserId, payload.user.id)))
      .limit(1);

    if (existingLinked) {
      const shouldAdvance = STAGES_BEFORE_SIGNED_UP.includes(
        existingLinked.stage as (typeof STAGES_BEFORE_SIGNED_UP)[number],
      );
      if (shouldAdvance) {
        await tx
          .update(engagements)
          .set({ stage: "SIGNED_UP", stageChangedAt: new Date(), updatedAt: new Date() })
          .where(eq(engagements.id, existingLinked.id));
      }
      await tx.insert(interactions).values({
        engagementId: existingLinked.id,
        happenedAt,
        channel: "system",
        direction: "note",
        summary: `Signed up in ${payload.app}`,
      });
      return {
        outcome: "linked",
        contactId: existingLinked.contactId,
        engagementId: existingLinked.id,
        needsReview: existingLinked.needsReview,
      };
    }

    // 2. Match to an existing contact — email -> phone -> fuzzy name+business.
    const matchedContact = await findMatchingContact(tx, {
      email: payload.user.email,
      phone: payload.user.phone,
      name: payload.user.name,
      businessName: payload.user.businessName,
    });

    if (matchedContact) {
      const [existingEngagement] = await tx
        .select()
        .from(engagements)
        .where(and(eq(engagements.contactId, matchedContact.id), eq(engagements.productId, product.id)))
        .limit(1);

      let engagementId: string;
      if (existingEngagement) {
        engagementId = existingEngagement.id;
        const shouldAdvance = STAGES_BEFORE_SIGNED_UP.includes(
          existingEngagement.stage as (typeof STAGES_BEFORE_SIGNED_UP)[number],
        );
        await tx
          .update(engagements)
          .set({
            appUserId: payload.user.id,
            updatedAt: new Date(),
            ...(shouldAdvance ? { stage: "SIGNED_UP" as const, stageChangedAt: new Date() } : {}),
          })
          .where(eq(engagements.id, existingEngagement.id));
      } else {
        const [inserted] = await tx
          .insert(engagements)
          .values({
            contactId: matchedContact.id,
            productId: product.id,
            stage: "SIGNED_UP",
            appUserId: payload.user.id,
          })
          .returning({ id: engagements.id });
        engagementId = inserted.id;
      }

      await tx.insert(interactions).values({
        engagementId,
        happenedAt,
        channel: "system",
        direction: "note",
        summary: `Signed up in ${payload.app}`,
      });

      return { outcome: "matched", contactId: matchedContact.id, engagementId, needsReview: false };
    }

    // 3. No match — new contact, flagged for review (doc 02 §3: unknown
    // signups might be an existing prospect under a different name).
    const [newContact] = await tx
      .insert(contacts)
      .values({
        name: payload.user.name || payload.user.businessName || payload.user.email || `${payload.app} user`,
        company: payload.user.businessName,
        email: payload.user.email,
        phone: payload.user.phone,
        source: "inbound",
      })
      .returning({ id: contacts.id });

    const [newEngagement] = await tx
      .insert(engagements)
      .values({
        contactId: newContact.id,
        productId: product.id,
        stage: "SIGNED_UP",
        appUserId: payload.user.id,
        needsReview: true,
      })
      .returning({ id: engagements.id });

    await tx.insert(interactions).values({
      engagementId: newEngagement.id,
      happenedAt,
      channel: "system",
      direction: "note",
      summary: `Signed up in ${payload.app}`,
    });

    return { outcome: "created", contactId: newContact.id, engagementId: newEngagement.id, needsReview: true };
  });
}
