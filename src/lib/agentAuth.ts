import { timingSafeEqual } from "node:crypto";

// Doc 02 §4, generalized beyond ZeroClaw per the 2026-08-05 decision (see
// wsm-second-brain/infrastructure/client-hub/00): any of William's
// assistants — Claude, Hermes, each ZeroClaw instance — gets its own bearer
// key, named AGENT_API_KEY_<NAME> in Coolify env. Same "one var, no code
// change" pattern as INGEST_SECRET_<APP> in ingestAuth.ts, but bearer-token
// auth (agent-initiated calls) rather than HMAC (payload-signed webhooks
// from other apps) — there's no shared secret to sign a body with here,
// just "is this caller who they say they are."
//
// Returns the caller's name (lowercased, e.g. "claude", "hermes",
// "zeroclaw") on a match, or null. Every configured key is compared in
// constant time; a real deployment only has a handful of keys, so the
// linear scan is not a performance concern.
export function resolveAgentFromBearer(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const provided = Buffer.from(token);

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("AGENT_API_KEY_") || !value) continue;
    const expected = Buffer.from(value);
    if (expected.length !== provided.length) continue;
    if (timingSafeEqual(expected, provided)) {
      return key.slice("AGENT_API_KEY_".length).toLowerCase();
    }
  }
  return null;
}
