import type { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { engagements, products } from "@/db/schema";
import { resolveAgentFromBearer } from "@/lib/agentAuth";
import { logAgentCall } from "@/lib/agentLog";
import { findPossibleDuplicates } from "@/db/queries/duplicates";
import { createLead } from "@/app/(dashboard)/leads/new/actions";
import { LEAD_SOURCE_OPTIONS } from "@/app/(dashboard)/leads/new/validations";

const ENDPOINT = "/api/agent/leads";

const bodySchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().max(40).optional(),
  productSlug: z.string().trim().min(1),
  source: z.enum(LEAD_SOURCE_OPTIONS).optional(),
  referredBy: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
});

// POST /api/agent/leads — doc 02 §4's ZeroClaw quick-capture shape,
// generalized to any bearer-keyed caller. Unlike the UI's Quick-add form
// (which blocks on a possible duplicate and waits for an explicit confirm),
// this always creates — agents don't have a UI to show a blocking prompt in
// — and reports any possible-duplicate match in the response instead. Every
// created engagement is flagged needs_review (2026-08-05 decision: all
// Agent API writes are, regardless of caller), so a real dupe still
// surfaces for William to catch in the Pipeline board.
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

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, data.productSlug))
    .limit(1);
  if (!product) {
    await logAgentCall({
      agent,
      endpoint: ENDPOINT,
      payload: data,
      status: "error",
      error: `unknown product "${data.productSlug}"`,
    });
    return Response.json({ error: `unknown product "${data.productSlug}"` }, { status: 400 });
  }

  const duplicates = await findPossibleDuplicates({ name: data.name, phone: data.phone });

  const result = await createLead(
    {
      name: data.name,
      phone: data.phone ?? "",
      productId: String(product.id),
      source: data.source ?? "",
      referredBy: data.referredBy ?? "",
      note: data.note ?? "",
    },
    true, // confirmed — see comment above; this endpoint never hard-blocks on a dupe
  );

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
    .where(eq(engagements.id, result.engagementId));

  await logAgentCall({ agent, endpoint: ENDPOINT, payload: data, status: "processed" });

  return Response.json({
    contactId: result.contactId,
    engagementId: result.engagementId,
    possibleDuplicates: duplicates.length ? duplicates : undefined,
  });
}
