@AGENTS.md

# claude.md — Insaka Lwendo CRM Development Context

> Load this file at the start of every development session. It is the single source of truth for project context, conventions, and build instructions.

---

## What Insaka Lwendo CRM Is

A small, single-admin mini-CRM ("Client Hub") that ties together every venture William runs — BazaBooks, Chama360, the catering scheduler, Nexus web clients, and future apps — into one pipeline and lead-tracking surface. Working name in the planning docs is "Client Hub"; the repo/product name is **Insaka Lwendo CRM**.

**Core problem it solves:** leads currently arrive scattered across WhatsApp, email, and Telegram, and get logged by hand into `docs/outreach-log.md` and `docs/prospects.xlsx` in `wsm-second-brain` — no pipeline stages, no "next action due" view, no link between a prospect and their in-app account once they sign up.

**Not:** a general-purpose CRM. Single operator, single-digit-hundreds of contacts, no multi-user/team features, no email sending, no campaign automation (see `docs/planning/03-ui-and-dashboard.md` § Deliberately not building).

---

## Second Brain Context

William's cross-venture context and the full planning pack for this product live in a separate repo:
`/Users/williammweemba/Dev_Projects/wsm-second-brain` — read-only from here.

The planning docs that drove this build are copied into this repo at `docs/planning/` (source of truth: `wsm-second-brain/infrastructure/client-hub/`):

- `00-strategy-and-architecture.md` — why a custom build, architecture table, source-of-truth handover rule
- `01-data-model.md` — entity model, stage machine, indexes, **NS-007 migration discipline**
- `02-capture-and-integrations.md` — the four inbound capture paths (manual UI, legacy import, signup webhooks, ZeroClaw, usage rollups)
- `03-ui-and-dashboard.md` — the four screens, explicitly what NOT to build in v1
- `04-build-phases.md` — P0–P4 phase breakdown and acceptance criteria

`ui_spec.md` at repo root is the single source of truth for color, type, layout, motion, and component style — load it alongside this file for any UI-building session. Don't invent visual patterns beyond what's there.

At the start of a new session, or when a task needs context beyond this file, also read from `wsm-second-brain`:
- `WILLIAM.md` — priorities, constraints, time budget
- `systems/NS-007-*.md` — Drizzle migration journal gotcha (directly applicable — same stack as BazaBooks)
- `systems/NS-002-security-audit.md` — before any deploy
- `systems/NS-011-postgres-column-case-convention.md` — snake_case DB convention (Better Auth's 4 tables are the only exception)

If a session surfaces something that looks like it belongs in the second brain (a gotcha, a completed milestone, a system worth extracting), flag it to William explicitly rather than writing it there yourself.

---

## Current Build Phase

**Phase: P0, P1, and P2 are all done and live (`https://insaka.nxhub.online`). The hub is now the sole source of truth for leads/pipeline — `wsm-second-brain/docs/{prospects.xlsx,outreach-log.md}` are frozen.**

Per `docs/planning/04-build-phases.md`, standing rules for every phase:
- Apply the security baseline before any feature code (done at S1 — see below).
- Respect NS-007 migration discipline: apply migrations via `drizzle-kit migrate` against Coolify Postgres through a tunnel confirmed working first, or update `_journal.json` in the same commit as any manually-applied SQL.
- Automated stage transitions on `engagements.stage` are **forward-only**. Never auto-downgrade except the DORMANT/ACTIVE rollup pass described in doc `02`.
- Every inbound endpoint (`/api/ingest/*`, `/api/agent/*`) logs to `ingest_log` **before** processing (or, for `/api/agent/*` reads, doesn't log at all — see the Agent API section below), so write failures are always replayable.

**P3's ZeroClaw-*skill* side is still deferred** until both ZeroClaw instances are working again and the Agent LLM Stack plan lands. Its hub-side API is **not** deferred — see Agent API below, which supersedes the originally-planned ZeroClaw-only `/api/ingest/lead`/`/api/ingest/interaction` endpoints with a generalized, multi-caller version. P4 (usage rollups) is unbuilt, still gated on BazaBooks shipping `scaffold/usage-tracking`.

P0: ✅ done (repo scaffold, Better Auth single-admin, Coolify deploy, full schema, contacts/engagements CRUD, quick-add lead flow, pipeline board, merge-duplicates).

P1: ✅ done 2026-08-05. `scripts/import-legacy.ts` ran for real against production (3407 contacts, 37 engagements, 41 interactions); go-live freeze applied to both source files. Two real bugs surfaced only by running against the actual target environment (hardcoded local-Mac paths; a mis-copied source file that silently produced 0 parsed entries) — fixed, and `scripts/backfill-outreach-log.ts` exists as a permanent, idempotent tool for this specific "matched against existing contacts, not a freshly-parsed xlsx" case, not a one-off patch. Full account in `changelog.md`.

P2: ✅ done. Hub side (`POST /api/ingest/signup`) and the BazaBooks-side emitter (`payrush_saas_app`'s `src/lib/integrations/clientHub.js`) are both live; a real production signup confirmed landing correctly `needs_review`-flagged.

Do not invent features beyond docs `00`–`03` during implementation — if a want emerges mid-build (tags, search, email, charts), write it down as a v2 candidate in `docs/planning/04-build-phases.md`'s margin and keep moving.

---

## Agent API

Built 2026-08-05, per a decision recorded in `wsm-second-brain/infrastructure/client-hub/00`: William's assistants (Claude, Hermes, each ZeroClaw instance) need read/write access to leads/contacts on his behalf — visibility into what he logs via the app, and the ability to create/update records when he discusses a prospect in chat. This generalizes doc `02` §4's original ZeroClaw-only plan (`/api/ingest/lead`, `/api/ingest/interaction`) into a caller-agnostic API; those two stub endpoints no longer exist, superseded by the routes below.

**Auth:** bearer token, one key per caller, env var `AGENT_API_KEY_<NAME>` (e.g. `AGENT_API_KEY_CLAUDE`, `AGENT_API_KEY_HERMES`, `AGENT_API_KEY_ZEROCLAW`). `src/lib/agentAuth.ts` scans all configured `AGENT_API_KEY_*` vars and constant-time-compares each against the provided token — a match returns the caller's name (lowercased), used for `ingest_log`'s `source` field (`agent:claude`, etc.). Generate a new key with `openssl rand -hex 32`, same as `INGEST_SECRET_BAZABOOKS`. No key configured for a given name = that caller simply can't authenticate; nothing else to wire up.

**Review policy:** every write through this API sets `engagements.needs_review = true`, regardless of caller — including Claude's. Deliberately uniform rather than trusting some callers more than others; simplest rule that's still safe, revisit only if it proves too noisy in practice. Clearing the flag is the existing "Mark reviewed" UI action, nothing new needed there.

**Endpoints** (all under `/api/agent/`):

| Method | Path | Does |
|---|---|---|
| GET | `/contacts?q=` | Search by name/company/email/phone (exact or `phone_alt`), capped at 20 results |
| GET | `/contacts/:id` | Full detail — engagements, interaction timeline, open next actions (same query the contact-detail page uses) |
| POST | `/leads` | Create a contact + engagement. `{name, phone?, productSlug, source?, referredBy?, note?}`. Unlike the UI's Quick-add, never blocks on a possible duplicate — always creates, reports `possibleDuplicates` in the response instead (there's no UI to show a blocking prompt in) |
| POST | `/interactions` | Log an interaction on an existing engagement. `{engagementId, channel, direction, summary, happenedAt?}` |
| PATCH | `/engagements/:id` | Update stage/tier/interestNote. `{stage?, tier?, interestNote?, lostReason?}` — reuses the exact `updateEngagement` action the UI calls, so the LOST-reason requirement and `stage_changed_at`/system-interaction bookkeeping behave identically |

Reads aren't logged to `ingest_log` (no side effect to audit); every write is, `status: "processed"` or `"error"`, same shape the signup webhook uses.

Not built: a way for an agent to create/complete next actions directly (use the interaction endpoint + ask William to handle it in-app for now), and no rate limiting beyond what Coolify/the OS provide — fine at this scale (single admin, a handful of trusted callers), revisit if it's ever not.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript, `src/` dir |
| DB | Postgres via Drizzle ORM (`drizzle-orm`, `drizzle-kit`) — new database on the existing Coolify Postgres instance |
| Auth | Better Auth, single admin account, signups disabled after first user |
| Styling | Tailwind CSS v4 (`@theme` tokens per `ui_spec.md` §1/§2/§4) |
| Motion | `motion` (formerly Framer Motion — package renamed, same authors/API family) for in-screen interaction: kanban drag physics, scroll-reveal stagger. **Not** used for route-level transitions — see below |
| Route transitions | Next's native View Transitions (`experimental.viewTransition` in `next.config.ts`) — chosen over a client animation library because App Router's server-rendered routing fights `AnimatePresence`-style exit animations; see `ui_spec.md` §5 |
| Forms | react-hook-form + zod |
| Deploy | Coolify on Hetzner, own subdomain, HTTPS |
| Package manager | pnpm (supply-chain hardening via `pnpm-workspace.yaml` — see below) |

## Security Baseline (applied at S1)

Mirrors `wsm-second-brain/scaffold/security-baseline/`:
- `pnpm-workspace.yaml` — `minimumReleaseAge: 1440` (1-day cooldown on new package versions), `onlyBuiltDependencies` default-deny on install scripts (pnpm 10.x key — re-check `pnpm --version` before assuming `allowBuilds` applies, that's pnpm 11+).
- `.gitignore` / `.dockerignore` — both exclude every `.env*` variant.
- `next.config.ts` — security headers (`X-Frame-Options`, CSP, etc.) merged into Next config. **The CSP `connect-src`/`img-src` will need real origins added once ingest endpoints, Coolify Postgres, or any external asset host are wired up — currently locked to `'self'`.**
- `.husky/pre-push` — blocks pushes containing staged `.env` files or content matching secret patterns (gitleaks if installed, regex fallback otherwise). Emergency bypass is `git push --no-verify` — treat any use of it as a signal to go check why the hook fired.

Still to do before real data touches this app: `scaffold/security-baseline/db-least-privilege-role.postgres.sql` (least-privilege DB role) once the Coolify Postgres database is provisioned.

## Project Structure

```
src/
  app/
    (dashboard)/         # This Week / Pipeline / Contacts / Quick-add screens (doc 03)
      pipeline/
      contacts/
      leads/new/
    api/
      ingest/
        signup/          # POST /api/ingest/signup — doc 02 §3
        usage/            # POST /api/ingest/usage — doc 02 §5 (P4, not built)
      agent/               # Generalized read/write API for William's assistants — see Agent API above
        contacts/          # GET (search), GET /:id (detail)
        leads/              # POST (create)
        interactions/       # POST (log)
        engagements/        # PATCH /:id (stage/tier/interestNote)
  db/
    schema.ts             # Drizzle schema, full doc 01 model
    index.ts               # DB client
    queries/                # Read-side query functions, shared between UI and Agent API
  lib/
    agentAuth.ts           # AGENT_API_KEY_<NAME> bearer resolution
    agentLog.ts             # ingest_log writer for Agent API calls
    ingestAuth.ts            # INGEST_SECRET_<APP> HMAC verification (webhooks)
  components/
    ui/
docs/
  planning/                # copies of the wsm-second-brain client-hub doc pack
```

Folders that don't yet have real files carry a `.gitkeep` — remove it as soon as the first real file lands there.
