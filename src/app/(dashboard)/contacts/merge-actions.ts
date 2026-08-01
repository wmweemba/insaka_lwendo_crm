"use server";

import { db } from "@/db";
import { contacts, engagements, interactions, nextActions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "./actions";

// Doc 03 — fold contact B (source) into contact A (target): re-point B's
// engagements onto A, unless A already has an engagement for that product —
// in that case B's interactions/next_actions move onto A's existing
// engagement instead, so we never end up with two engagements for the same
// (contact, product) pair. Union phone/phone_alt, re-point any contacts that
// had B as referred_by, then delete B. All in one transaction.
export async function mergeContacts(
  sourceId: string,
  targetId: string,
): Promise<ActionResult> {
  if (sourceId === targetId) {
    return { success: false, error: "Can't merge a contact into itself." };
  }

  await db.transaction(async (tx) => {
    const source = await tx.query.contacts.findFirst({
      where: eq(contacts.id, sourceId),
      with: { engagements: true },
    });
    const target = await tx.query.contacts.findFirst({
      where: eq(contacts.id, targetId),
      with: { engagements: true },
    });
    if (!source || !target) {
      throw new Error("Contact not found.");
    }

    const targetEngagementByProduct = new Map(
      target.engagements.map((e) => [e.productId, e]),
    );

    for (const sourceEngagement of source.engagements) {
      const clashingTargetEngagement = targetEngagementByProduct.get(
        sourceEngagement.productId,
      );
      if (clashingTargetEngagement) {
        await tx
          .update(interactions)
          .set({ engagementId: clashingTargetEngagement.id })
          .where(eq(interactions.engagementId, sourceEngagement.id));
        await tx
          .update(nextActions)
          .set({ engagementId: clashingTargetEngagement.id })
          .where(eq(nextActions.engagementId, sourceEngagement.id));
        await tx.delete(engagements).where(eq(engagements.id, sourceEngagement.id));
      } else {
        await tx
          .update(engagements)
          .set({ contactId: targetId })
          .where(eq(engagements.id, sourceEngagement.id));
      }
    }

    const phones = new Set(
      [...(target.phoneAlt ?? []), ...(source.phoneAlt ?? []), source.phone].filter(
        (p): p is string => Boolean(p) && p !== target.phone,
      ),
    );

    await tx
      .update(contacts)
      .set({ phoneAlt: phones.size > 0 ? [...phones] : undefined, updatedAt: new Date() })
      .where(eq(contacts.id, targetId));

    await tx
      .update(contacts)
      .set({ referredBy: targetId })
      .where(eq(contacts.referredBy, sourceId));

    await tx.delete(contacts).where(eq(contacts.id, sourceId));
  });

  revalidatePath("/contacts");
  redirect(`/contacts/${targetId}`);
}
