# Client Hub — Capture Flows & Integrations

**Status:** PLANNED. Four inbound paths, in build order: manual UI → legacy import → signup webhooks → ZeroClaw quick-capture → usage rollups.

## 1. Manual UI (baseline)

Quick-add form reachable in ≤2 taps from the hub home, mobile-friendly: name, phone, product, source, referred-by (contact picker), one-line note. Creates contact + engagement (`LEAD`) + optional first interaction in one submit. Runs the dedup check (doc 01) and shows a "possible duplicate — merge instead?" prompt on match.

## 2. One-time legacy import

Script: `scripts/import-legacy.ts`, run once at go-live, in two stages (parse → review → commit) so nothing lands unseen.

**Sources & mapping:**

- `docs/prospects.xlsx` → `contacts` (name, company, phone(s), source) + `engagements` (product, tier, stage from Outreach Status column). This is the canonical contact list — import it first.
- `docs/outreach-log.md` → `interactions`. The `## Outreach` / `## Outreach Follow ups` sections are pipe-delimited (`date | [name] | action | status`) and parse mechanically. The `## Feedback` section is dated prose per contact — import each entry as one interaction with the prose as `summary`. Name-match against already-imported contacts; unmatched names go to a review list, not auto-created.
- Known people already in the log (Tumeyo, Tasty Food Boutique/Annette, Julie, Mulenga→Mathan referral chain, Kanyika incl. phone_alt lines, Jay, etc.) should come out of import with correct stages and referral links — use them as the import's test fixtures.

**Stage inference for import:** signed up → `SIGNED_UP` (or `ACTIVE` if usage known); responded/in dialogue → `IN_CONVERSATION`; messaged no reply → `CONTACTED`; marked for coming week → `LEAD`. When ambiguous, choose the earlier stage — promoting later is cheap.

**After commit:** freeze both source files with a header note pointing at the hub (per doc 00 handover rule).

## 3. Signup webhooks — `POST /api/ingest/signup`

**Emitter side (BazaBooks first):** fired from the same signup hook that already sends the admin email + Telegram alert — `databaseHooks.user.create.after` — as a third independent fire-and-forget call, per pattern P-001: failure must never block signup or the other alerts. Chama360 wires the equivalent in its Clerk webhook/Express layer when its turn comes.

**Payload:**

```json
{
  "app": "bazabooks",
  "event": "user.signed_up",
  "occurredAt": "2026-07-19T09:14:00Z",
  "user": { "id": "usr_abc", "email": "x@y.com", "name": "Jay", "businessName": "Jay Mumba Photography", "phone": "+2609..." }
}
```

**Auth:** HMAC-SHA256 of raw body with per-app shared secret, sent as `X-Hub-Signature`. Constant-time compare. Reject on failure with 401; log to `ingest_log` either way.

**Processing (idempotent on `(app, event, user.id)` via ingest_log):**

1. Match to existing engagement by `app_user_id`; else contact by email → phone → fuzzy name+business.
2. Matched → set `app_user_id`, advance stage to `SIGNED_UP` (forward-only), log `system` interaction "Signed up in {app}".
3. No match → create contact (`source: inbound`) + engagement at `SIGNED_UP`, flag `needs_review` so unknown signups get looked at (they may be an existing prospect under a different name).

**Future events on the same endpoint (build later, schema-ready now):** `subscription.activated` → `PAYING`; `payment.recorded` → system interaction.

## 4. ZeroClaw Telegram quick-capture — `POST /api/ingest/lead`

The moment a referral lands on WhatsApp, message ZeroClaw from the phone:

> "new lead: Mathan, SACCO chairman at MLIFE, chama360, referred by Mulenga Bwalya, high priority — confirm fit before pitching"

**ZeroClaw skill spec (new SKILL.md entry on the moneypi instance at implementation time):**

- Trigger: message starting "new lead" (plus natural variants).
- Parse to: `{ name, phone?, company?, product (slug — must be one of the known slugs, ask if unclear), source, referredByName?, tier?, note }`.
- POST to `https://<hub>/api/ingest/lead` with `Authorization: Bearer <API key>` (long random key, hub-side constant-time check, distinct from webhook secrets so it can be rotated independently).
- Hub creates contact + engagement (`LEAD`) + first interaction + (if `note` implies one) an open next_action; responds with created record + any dedup warning.
- ZeroClaw replies with a one-line confirmation incl. the dedup warning if present ("⚠ possible duplicate of existing contact 'Mathan Mlife'").
- Also support: "log interaction: {name} — {summary}" → `POST /api/ingest/interaction` (same auth) appending to the newest matching engagement. This makes the phone the primary logging device, not just for new leads.

Guardrail carried from the nexus-prospect-pipeline-fix experience: the skill must never fabricate a success — it reports the hub's actual HTTP response, and on non-2xx it says so and preserves the message so it can be retried.

## 5. Usage rollups — `POST /api/ingest/usage`

Producer side is specified in `scaffold/usage-tracking/PLAN.md` (nightly job per app). Hub side:

- Batch payload: `{ "app": "bazabooks", "periodDate": "2026-07-19", "users": [ { "appUserId": "usr_abc", "lastActiveAt": "...", "counts": { ... } } ] }`, HMAC-signed like signups.
- Upsert into `usage_rollups` on `(product_id, app_user_id, period_date)`.
- Post-ingest pass: engagements `SIGNED_UP`/`ACTIVE` with `last_active_at` older than 30 days → `DORMANT` (+ system interaction); `DORMANT` with fresh activity → `ACTIVE`.

## Secrets & config

Per-app webhook secrets and the ZeroClaw API key live in Coolify env vars on both ends (hub + emitting app), never in either repo — per `scaffold/security-baseline/env-exclusions.fragment`. Rotation: change env var both sides, no code change.
