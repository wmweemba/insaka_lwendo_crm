import type { NextRequest } from "next/server";
import { resolveAgentFromBearer } from "@/lib/agentAuth";
import { getContactById } from "@/db/queries/contacts";

// GET /api/agent/contacts/:id — full contact detail: engagements,
// interaction timeline, open next actions. Same query the contact-detail
// page uses. Bearer-authenticated, read-only, not logged (see agentLog.ts).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const agent = resolveAgentFromBearer(request.headers.get("Authorization"));
  if (!agent) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ contact });
}
