"use server";

import { db } from "@/db";
import { interactions, nextActions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../actions";
import {
  logInteractionSchema,
  nextActionSchema,
  type LogInteractionFormValues,
  type NextActionFormValues,
} from "./validations";

export async function logInteraction(
  contactId: string,
  values: LogInteractionFormValues,
): Promise<ActionResult> {
  const parsed = logInteractionSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  await db.insert(interactions).values({
    engagementId: data.engagementId,
    happenedAt: new Date(data.happenedAt),
    channel: data.channel,
    direction: data.direction,
    summary: data.summary,
  });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

// Doc 01 rule of practice — closing an interaction should prompt "what's the
// next action?"; every live engagement should have exactly one open
// next_action or a deliberate none.
export async function createNextAction(
  contactId: string,
  values: NextActionFormValues,
): Promise<ActionResult> {
  const parsed = nextActionSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  await db.insert(nextActions).values({
    engagementId: data.engagementId,
    description: data.description,
    dueDate: data.dueDate === "" ? undefined : data.dueDate,
  });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function completeNextAction(
  nextActionId: string,
  contactId: string,
): Promise<ActionResult> {
  await db
    .update(nextActions)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(nextActions.id, nextActionId));

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function cancelNextAction(
  nextActionId: string,
  contactId: string,
): Promise<ActionResult> {
  await db
    .update(nextActions)
    .set({ status: "cancelled" })
    .where(eq(nextActions.id, nextActionId));

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}
