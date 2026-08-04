import type { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { engagements } from "@/db/schema";
import { resolveAgentFromBearer } from "@/lib/agentAuth";
import { logAgentCall } from "@/lib/agentLog";
import { logInteraction } from "@/app/(dashboard)/contacts/[id]/actions";
import {
  INTERACTION_CHANNEL_OPTIONS,
  INTERACTION_DIRECTION_OPTIONS,
} from "@/app/(dashboard)/contacts/[id]/validations";

const ENDPOINT = "/api/agent/interactions";

const bodySchema = z.object({
  engagementId: z.string().uuid(),
  channel: z.enum(INTERACTION_CHANNEL_OPTIONS),
  direction: z.enum(INTERACTION_DIRECTION_OPTIONS),
  summary: z.string().trim().min(1).max(2000),
  happenedAt: z.string().optional(), // ISO string; defaults to now
});

// POST /api/agent/interactions — doc 02 §4's "log interaction: {name} —
// {summary}" shape, generalized. Logs onto an existing engagement (create
// the lead first via /api/agent/leads if it doesn't exist yet) and, same as
// every Agent API write, flags the parent engagement needs_review.
export async function POST(request: NextRequest) {
  const agent = resolveAgentFromBearer(request.headers.get("Authorization"));
  if (!agent) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

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

  const engagement = await db.query.engagements.findFirst({
    where: eq(engagements.id, data.engagementId),
    columns: { id: true, contactId: true },
  });
  if (!engagement) {
    await logAgentCall({
      agent,
      endpoint: ENDPOINT,
      payload: data,
      status: "error",
      error: "engagement not found",
    });
    return Response.json({ error: "engagement not found" }, { status: 404 });
  }

  const result = await logInteraction(engagement.contactId, {
    engagementId: data.engagementId,
    channel: data.channel,
    direction: data.direction,
    summary: data.summary,
    happenedAt: data.happenedAt ?? new Date().toISOString(),
  });

  if (!result.success) {
    await logAgentCall({
      agent,
      endpoint: ENDPOINT,
      payload: data,
      status: "error",
      error: result.error,
    });
    return Response.json({ error: result.error }, { status: 400 });
  }

  await db
    .update(engagements)
    .set({ needsReview: true })
    .where(eq(engagements.id, data.engagementId));

  await logAgentCall({ agent, endpoint: ENDPOINT, payload: data, status: "processed" });
  return Response.json({ success: true });
}
