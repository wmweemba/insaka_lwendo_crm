"use server";

import { db } from "@/db";
import { contacts, engagements, interactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  contactSchema,
  createEngagementSchema,
  updateEngagementSchema,
  type ContactFormValues,
  type CreateEngagementFormValues,
  type UpdateEngagementFormValues,
} from "./validations";

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// drizzle-orm wraps driver errors in DrizzleQueryError, preserving the original
// postgres.js PostgresError (with its `.code`) on `.cause` — check both levels.
function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  if ("code" in err && typeof err.code === "string") return err.code;
  if ("cause" in err) return pgErrorCode(err.cause);
  return undefined;
}

function isUniqueViolation(err: unknown): boolean {
  return pgErrorCode(err) === "23505";
}

function isForeignKeyViolation(err: unknown): boolean {
  return pgErrorCode(err) === "23503";
}

function emptyToUndefined(value: string): string | undefined {
  return value === "" ? undefined : value;
}

function parsePhoneAlt(raw: string): string[] | undefined {
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

export async function createContact(values: ContactFormValues): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const source = data.source === "" ? undefined : data.source;

  const [row] = await db
    .insert(contacts)
    .values({
      name: data.name,
      company: emptyToUndefined(data.company),
      phone: emptyToUndefined(data.phone),
      phoneAlt: parsePhoneAlt(data.phoneAlt),
      email: emptyToUndefined(data.email),
      source,
      referredBy: emptyToUndefined(data.referredBy),
      notes: emptyToUndefined(data.notes),
    })
    .returning({ id: contacts.id });

  revalidatePath("/contacts");
  redirect(`/contacts/${row.id}`);
}

export async function updateContact(
  id: string,
  values: ContactFormValues,
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  if (data.referredBy === id) {
    return {
      success: false,
      error: "A contact can't be referred by themselves.",
    };
  }

  const source = data.source === "" ? undefined : data.source;

  await db
    .update(contacts)
    .set({
      name: data.name,
      company: emptyToUndefined(data.company),
      phone: emptyToUndefined(data.phone),
      phoneAlt: parsePhoneAlt(data.phoneAlt),
      email: emptyToUndefined(data.email),
      source,
      referredBy: emptyToUndefined(data.referredBy),
      notes: emptyToUndefined(data.notes),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id));

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(id: string): Promise<ActionResult> {
  const existingEngagements = await db.query.engagements.findMany({
    where: eq(engagements.contactId, id),
    columns: { id: true },
  });

  if (existingEngagements.length > 0) {
    return {
      success: false,
      error:
        "This contact still has engagements — remove those first (merge-duplicates handling lands in P0-S3).",
    };
  }

  await db.delete(contacts).where(eq(contacts.id, id));

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function createEngagement(
  contactId: string,
  values: CreateEngagementFormValues,
): Promise<ActionResult> {
  const parsed = createEngagementSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  try {
    await db.insert(engagements).values({
      contactId,
      productId: Number(data.productId),
      tier: data.tier === "" ? undefined : Number(data.tier),
      interestNote: emptyToUndefined(data.interestNote),
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        success: false,
        error: "This contact already has an engagement for that product.",
      };
    }
    throw err;
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function updateEngagement(
  engagementId: string,
  contactId: string,
  values: UpdateEngagementFormValues,
): Promise<ActionResult> {
  const parsed = updateEngagementSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  const current = await db.query.engagements.findFirst({
    where: eq(engagements.id, engagementId),
    columns: { stage: true },
  });
  if (!current) {
    return { success: false, error: "Engagement not found." };
  }

  const stageChanging = current.stage !== data.stage;

  // Doc 01 stage machine — LOST is manual-only and requires a one-line reason,
  // recorded as an interaction (the timeline UI isn't built yet, but the table is).
  if (stageChanging && data.stage === "LOST" && data.lostReason === "") {
    return {
      success: false,
      error: "A reason is required when moving an engagement to Lost.",
      fieldErrors: { lostReason: ["Reason is required"] },
    };
  }

  await db
    .update(engagements)
    .set({
      stage: data.stage,
      tier: data.tier === "" ? undefined : Number(data.tier),
      interestNote: emptyToUndefined(data.interestNote),
      stageChangedAt: stageChanging ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(engagements.id, engagementId));

  if (stageChanging && data.stage === "LOST") {
    await db.insert(interactions).values({
      engagementId,
      happenedAt: new Date(),
      channel: "system",
      direction: "note",
      summary: `Marked LOST — ${data.lostReason}`,
    });
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/pipeline");
  return { success: true };
}

export async function deleteEngagement(
  engagementId: string,
  contactId: string,
): Promise<ActionResult> {
  try {
    await db.delete(engagements).where(eq(engagements.id, engagementId));
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return {
        success: false,
        error: "This engagement has recorded history and can't be deleted.",
      };
    }
    throw err;
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}
