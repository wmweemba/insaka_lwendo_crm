import { createHmac, timingSafeEqual } from "node:crypto";

// Doc 02 §3/§5 — per-app HMAC secrets live in Coolify env vars, never in the
// repo. Named INGEST_SECRET_<APP> so a new emitting app just needs a new env
// var, no code change.
export function webhookSecretFor(app: string): string | undefined {
  const key = `INGEST_SECRET_${app.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  return process.env[key];
}

// Constant-time compare of an HMAC-SHA256 over the raw request body against
// the X-Hub-Signature header (accepts an optional "sha256=" prefix).
export function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");
  const providedHex = signatureHeader.replace(/^sha256=/, "").trim();

  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  if (expected.length !== provided.length) return false;

  return timingSafeEqual(expected, provided);
}
