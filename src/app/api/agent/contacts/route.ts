import type { NextRequest } from "next/server";
import { resolveAgentFromBearer } from "@/lib/agentAuth";
import { searchContacts } from "@/db/queries/agentSearch";

// GET /api/agent/contacts?q=... — search by name/company/email/phone.
// Bearer-authenticated (AGENT_API_KEY_<NAME>). Read-only, not logged to
// ingest_log (see src/lib/agentLog.ts).
export async function GET(request: NextRequest) {
  const agent = resolveAgentFromBearer(request.headers.get("Authorization"));
  if (!agent) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ error: "q query param is required" }, { status: 400 });
  }

  const results = await searchContacts(q);
  return Response.json({ contacts: results });
}
