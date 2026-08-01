"use server";

import { db } from "@/db";
import { contacts, engagements, interactions } from "@/db/schema";
import { findPossibleDuplicates, type PossibleDuplicate } from "@/db/queries/duplicates";
import { revalidatePath } from "next/cache";
import { quickAddSchema, type QuickAddFormValues } from "./validations";

export type CreateLeadResult =
  | { success: true; contactId: string; engagementId: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
      duplicates?: PossibleDuplicate[];
    };

function emptyToUndefined(value: string): string | undefined {
  return value === "" ? undefined : value;
}

export async function createLead(
  values: QuickAddFormValues,
  confirmed: boolean,
): Promise<CreateLeadResult> {
  const parsed = quickAddSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  // Doc 01 dedup rule — a warning, never a hard block. The client resubmits
  // with confirmed=true once the operator has looked at the matches.
  if (!confirmed) {
    const duplicates = await findPossibleDuplicates({
      name: data.name,
      phone: emptyToUndefined(data.phone),
    });
    if (duplicates.length > 0) {
      return {
        success: false,
        error: "This might already be someone in the hub.",
        duplicates,
      };
    }
  }

  const source = data.source === "" ? undefined : data.source;

  const [contact] = await db
    .insert(contacts)
    .values({
      name: data.name,
      phone: emptyToUndefined(data.phone),
      source,
      referredBy: emptyToUndefined(data.referredBy),
    })
    .returning({ id: contacts.id });

  const [engagement] = await db
    .insert(engagements)
    .values({
      contactId: contact.id,
      productId: Number(data.productId),
    })
    .returning({ id: engagements.id });

  // The quick-add note becomes the first interaction (doc 02 §1), not
  // interest_note. No channel picker in this minimal form — WhatsApp is the
  // dominant referral channel per doc 00; revisit this default if it's wrong
  // in practice.
  if (data.note !== "") {
    await db.insert(interactions).values({
      engagementId: engagement.id,
      happenedAt: new Date(),
      channel: "whatsapp",
      direction: "inbound",
      summary: data.note,
    });
  }

  revalidatePath("/contacts");
  return { success: true, contactId: contact.id, engagementId: engagement.id };
}
