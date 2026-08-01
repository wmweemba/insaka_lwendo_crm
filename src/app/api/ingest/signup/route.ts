import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ingestLog } from "@/db/schema";
import { verifyHmacSignature, webhookSecretFor } from "@/lib/ingestAuth";
import { signupPayloadSchema } from "./validations";
import { processSignup } from "./process";

const ENDPOINT = "/api/ingest/signup";

async function logIngest(params: {
  source: string;
  payload: unknown;
  status: "processed" | "duplicate" | "error";
  error?: string;
}) {
  const [row] = await db
    .insert(ingestLog)
    .values({
      source: params.source,
      endpoint: ENDPOINT,
      payload: params.payload,
      status: params.status,
      error: params.error,
    })
    .returning({ id: ingestLog.id });
  return row.id;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // We don't know the app yet (need it to look up the secret), so do a
  // best-effort parse purely to get `app` for logging/secret lookup before
  // any signature check — the signature is still verified over the raw body.
  let appGuess = "unknown";
  try {
    appGuess = (JSON.parse(rawBody)?.app as string) || "unknown";
  } catch {
    // malformed JSON — appGuess stays "unknown", handled below
  }

  const secret = webhookSecretFor(appGuess);
  const signatureHeader = request.headers.get("X-Hub-Signature");

  if (!secret || !verifyHmacSignature(rawBody, signatureHeader, secret)) {
    // CLAUDE.md standing rule: every inbound endpoint logs to ingest_log
    // before/regardless of processing, so failures are always replayable.
    await logIngest({
      source: appGuess,
      payload: safeJsonOrRaw(rawBody),
      status: "error",
      error: "invalid or missing signature",
    });
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  const parsed = signupPayloadSchema.safeParse(safeJsonOrRaw(rawBody));
  if (!parsed.success) {
    await logIngest({
      source: appGuess,
      payload: safeJsonOrRaw(rawBody),
      status: "error",
      error: `payload validation failed: ${parsed.error.message}`,
    });
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;

  // Idempotency on (app, event, user.id) — a replayed webhook is a no-op.
  const [priorSuccess] = await db
    .select({ id: ingestLog.id })
    .from(ingestLog)
    .where(
      and(
        eq(ingestLog.source, payload.app),
        eq(ingestLog.status, "processed"),
        sql`${ingestLog.payload}->>'event' = ${payload.event}`,
        sql`${ingestLog.payload}->'user'->>'id' = ${payload.user.id}`,
      ),
    )
    .limit(1);

  if (priorSuccess) {
    await logIngest({ source: payload.app, payload, status: "duplicate" });
    return Response.json({ duplicate: true }, { status: 200 });
  }

  const logId = await logIngest({ source: payload.app, payload, status: "processed" });

  try {
    const result = await processSignup(payload);

    if (result.outcome === "unknown_app") {
      await db
        .update(ingestLog)
        .set({ status: "error", error: `no product with slug "${payload.app}"` })
        .where(eq(ingestLog.id, logId));
      return Response.json({ error: "unknown app" }, { status: 400 });
    }

    return Response.json({ success: true, ...result }, { status: 200 });
  } catch (err) {
    await db
      .update(ingestLog)
      .set({ status: "error", error: err instanceof Error ? err.message : String(err) })
      .where(eq(ingestLog.id, logId));
    return Response.json({ error: "processing failed" }, { status: 500 });
  }
}

function safeJsonOrRaw(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    return { raw: rawBody };
  }
}
