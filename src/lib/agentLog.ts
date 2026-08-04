import { db } from "@/db";
import { ingestLog } from "@/db/schema";

// Every Agent API write logs here — same ingest_log table the signup
// webhook uses, `source` prefixed "agent:" so the two families of caller
// (other apps' webhooks vs. William's assistants) stay easy to tell apart
// when scanning the log. Reads aren't logged — ingest_log is for auditing
// side effects, and a search/lookup has none.
export async function logAgentCall(params: {
  agent: string;
  endpoint: string;
  payload: unknown;
  status: "processed" | "error";
  error?: string;
}) {
  await db.insert(ingestLog).values({
    source: `agent:${params.agent}`,
    endpoint: params.endpoint,
    payload: params.payload as object,
    status: params.status,
    error: params.error,
  });
}
