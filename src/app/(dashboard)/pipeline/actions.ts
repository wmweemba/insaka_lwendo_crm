"use server";

import { db } from "@/db";
import { engagements, interactions } from "@/db/schema";
import { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/(dashboard)/contacts/actions";

// Kanban drag → stage change. Deliberately separate from updateEngagement
// (contacts/actions.ts): a drop only ever changes stage, never tier/interestNote,
// so sending those unrelated fields through just to reuse that action isn't worth it.
// Same LOST-reason rule as the engagement panel (doc 01: manual-only, required reason).
export async function moveEngagementStage(
  engagementId: string,
  newStage: (typeof STAGE_VALUES)[number],
  lostReason?: string,
): Promise<ActionResult> {
  const current = await db.query.engagements.findFirst({
    where: eq(engagements.id, engagementId),
    columns: { stage: true },
  });
  if (!current) {
    return { success: false, error: "Engagement not found." };
  }

  if (current.stage === newStage) {
    return { success: true };
  }

  if (newStage === "LOST" && !lostReason) {
    return {
      success: false,
      error: "A reason is required when moving an engagement to Lost.",
    };
  }

  await db
    .update(engagements)
    .set({ stage: newStage, stageChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(engagements.id, engagementId));

  if (newStage === "LOST") {
    await db.insert(interactions).values({
      engagementId,
      happenedAt: new Date(),
      channel: "system",
      direction: "note",
      summary: `Marked LOST — ${lostReason}`,
    });
  }

  revalidatePath("/pipeline");
  revalidatePath("/contacts");
  return { success: true };
}
