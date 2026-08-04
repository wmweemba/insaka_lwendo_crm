import type { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { engagements } from "@/db/schema";
import { resolveAgentFromBearer } from "@/lib/agentAuth";
import { logAgentCall } from "@/lib/agentLog";
import { updateEngagement } from "@/app/(dashboard)/contacts/actions";
import { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";

const ENDPOINT = "/api/agent/engagements";

const bodySchema = z.object({
  stage: z.enum(STAGE_VALUES).optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  interestNote: z.string().trim().max(2000).optional(),
  // Required by updateEngagement (doc 01: LOST is manual-only, needs a
  // one-line reason, recorded as a system interaction) whenever stage is
  // being set to "LOST".
  lostReason: z.string().trim().max(500).optional(),
});

// PATCH /api/agent/engagements/:id — stage/tier/interestNote update.
// Reuses the exact same updateEngagement action the UI's engagement panel
// calls, so the LOST-reason rule and stage bookkeeping (stage_changed_at,
// the system interaction) behave identically regardless of who's calling.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const agent = resolveAgentFromBearer(request.headers.get("Authorization"));
  if (!agent) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    await logAgentCall({
      agent,
      endpoint: ENDPOINT,
      payload: raw,
      status: "error",
      error: "invalid payload",
    });
    return Response.json(
      { error: "invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const current = await db.query.engagements.findFirst({
    where: eq(engagements.id, id),
    columns: { id: true, contactId: true, stage: true, tier: true, interestNote: true },
  });
  if (!current) {
    await logAgentCall({
      agent,
      endpoint: ENDPOINT,
      payload: data,
      status: "error",
      error: "engagement not found",
    });
    return Response.json({ error: "engagement not found" }, { status: 404 });
  }

  const result = await updateEngagement(id, current.contactId, {
    stage: data.stage ?? current.stage,
    tier:
      data.tier !== undefined
        ? (String(data.tier) as "1" | "2" | "3")
        : current.tier
          ? (String(current.tier) as "1" | "2" | "3")
          : "",
    interestNote: data.interestNote ?? current.interestNote ?? "",
    lostReason: data.lostReason ?? "",
  });

  if (!result.success) {
    await logAgentCall({
      agent,
      endpoint: ENDPOINT,
      payload: data,
      status: "error",
      error: result.error,
    });
    return Response.json(
      { error: result.error, fieldErrors: result.fieldErrors },
      { status: 400 },
    );
  }

  await db.update(engagements).set({ needsReview: true }).where(eq(engagements.id, id));

  await logAgentCall({ agent, endpoint: ENDPOINT, payload: data, status: "processed" });
  return Response.json({ success: true });
}
