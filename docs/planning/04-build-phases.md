# Client Hub — Build Phases

**Status:** PLANNED — awaiting implementation by sonnet, phase by phase, in order. Evening-session sizing, same convention as the compass phase briefs. Each phase ends deployed and usable; stop between phases is always safe.

**Standing rules for the implementing session:** apply `scaffold/security-baseline/` in P0 before any feature code · respect the NS-007 migration discipline (doc 01) · forward-only automated stage transitions · every inbound endpoint logs to `ingest_log` before processing.

## P0 — Foundation + manual CRM (~2–3 sessions)

- **S1:** repo scaffold (Next.js App Router + Drizzle + Better Auth single-admin with signups disabled after first user), security baseline applied, Coolify deploy on subdomain with HTTPS, empty-schema smoke deploy.
- **S2:** full schema from doc 01 + seed products, contacts/engagements CRUD, quick-add lead flow with dedup warning, contact detail with timeline + interaction composer + next-action prompt.
- **S3:** pipeline board (drag = stage change, LOST-reason prompt), "All" table view, merge-duplicates action.
- **Acceptance:** add a lead from the phone browser in <30s · a full lead→contacted→conversation flow logged entirely in the hub · deploy survives container restart with data intact (volume-backed Postgres confirmed).

## P1 — Legacy import + go-live (~1 session)

- `scripts/import-legacy.ts` per doc 02 §2: parse both sources → review table (staging output printed/held for manual approval) → commit.
- **Acceptance:** the known fixtures come out right — Kanyika one contact with 3 lines; Mulenga→Mathan referral link; Tasty Food Boutique with two engagements (BazaBooks LOST-or-CONTACTED + catering-scheduler IN_CONVERSATION); Jay at SIGNED_UP; interaction counts spot-checked against outreach-log.md.
- **Go-live ritual (manual, same day):** freeze prospects.xlsx + outreach-log.md with pointer headers; hub is now sole source of truth (doc 00).

## P2 — Signup webhook (~1 session)

- Hub: `/api/ingest/signup` with HMAC + idempotency per doc 02 §3.
- BazaBooks: emit from `databaseHooks.user.create.after` as third independent side effect (P-001 pattern), secret in Coolify env.
- **Acceptance:** test signup on BazaBooks appears in hub in <1 min, auto-linked when a matching prospect exists, `needs_review`-flagged when not · replayed webhook is a no-op · signup succeeds even with hub down (kill hub container, sign up, confirm).

## P3 — ZeroClaw quick-capture (~1 session)

- Hub: `/api/ingest/lead` + `/api/ingest/interaction` (bearer key).
- ZeroClaw moneypi: SKILL.md entry per doc 02 §4 with the no-fabricated-success guardrail.
- **Acceptance:** the Mathan-style message from Telegram creates the right record and ZeroClaw echoes the hub's real response · a hub 500 is reported as a failure, not success · dedup warning surfaces in the Telegram reply.

## P4 — Usage rollups + This Week completion (~1–2 sessions)

- **Depends on:** `scaffold/usage-tracking` implemented in BazaBooks (admin-module phase 03) — do not start P4 before it ships.
- Hub: `/api/ingest/usage` upsert + DORMANT/ACTIVE post-pass per doc 02 §5; "gone quiet" + "fresh signups" sections and metrics strip complete the This Week screen (doc 03 §1).
- **Acceptance:** seeded rollup batch produces correct last-active + counts on contact detail · 31-day-stale engagement auto-moves to DORMANT with system interaction · fresh activity flips it back.

## Sequencing note

P0+P1 alone already replace the spreadsheet workflow and are worth shipping without the rest. P2–P4 are independent of each other except P4's scaffold dependency; reorder freely if (e.g.) a Chama360 trial makes its webhook more urgent than ZeroClaw capture.

## Stop here

No feature invention beyond docs 00–03 during implementation. If a want emerges mid-build (tags, search, email, charts), write it down in this file's margin as a candidate for v2 and keep moving — the shiny-object failure mode is known and named.
