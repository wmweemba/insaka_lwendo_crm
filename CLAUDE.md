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

**Phase: P0-S1 — repo scaffold. Not yet deployed.**

Per `docs/planning/04-build-phases.md`, standing rules for every phase:
- Apply the security baseline before any feature code (done at S1 — see below).
- Respect NS-007 migration discipline: apply migrations via `drizzle-kit migrate` against Coolify Postgres through a tunnel confirmed working first, or update `_journal.json` in the same commit as any manually-applied SQL.
- Automated stage transitions on `engagements.stage` are **forward-only**. Never auto-downgrade except the DORMANT/ACTIVE rollup pass described in doc `02`.
- Every inbound endpoint (`/api/ingest/*`) logs to `ingest_log` **before** processing, so failures are always replayable.

**P3 (ZeroClaw quick-capture) is deferred** until both ZeroClaw instances are working again and the Agent LLM Stack plan lands — do not build the ZeroClaw skill side or `/api/ingest/lead`/`/api/ingest/interaction` until that's confirmed with William. P0–P2 are unaffected by this and proceed in order.

Order of operations (P0):
1. ✅ S1: repo scaffold — Next.js App Router + Drizzle + Better Auth deps installed, security baseline applied, planning docs copied in.
2. ✅ S1: Better Auth single-admin wired up (email/password, sign-ups closed after the first account, `/sign-in`, `src/proxy.ts` + dashboard-layout session gate). Verified in-browser.
3. ⬜ S1 (remaining): Coolify deploy on subdomain with HTTPS, empty-schema smoke deploy. Needs real Coolify access — not doable from a coding session alone.
4. ✅ S2: full schema from `docs/planning/01-data-model.md`, seed products, contacts/engagements CRUD, quick-add lead flow with dedup warning, contact detail with timeline.
5. ✅ S3: pipeline board (drag = stage change, LOST-reason prompt), "All" table view, merge-duplicates action.

P0 is code-complete. P1 (`docs/planning/04-build-phases.md`) is next in sequence:
1. ✅ `scripts/import-legacy.ts` written and run (dry-run + `--commit`) against local dev Postgres — see changelog for review-report findings. **Not yet run against production/Coolify Postgres — that's the actual go-live import, still pending the P0-S1 deploy.**
2. ⬜ Go-live ritual: freeze `wsm-second-brain/docs/{prospects.xlsx,outreach-log.md}` with a header note once the real import runs — deliberately manual, deliberately not automated by this script or by Claude. William's call on timing.

Do not invent features beyond docs `00`–`03` during implementation — if a want emerges mid-build (tags, search, email, charts), write it down as a v2 candidate in `docs/planning/04-build-phases.md`'s margin and keep moving.

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
        lead/             # POST /api/ingest/lead — doc 02 §4 (ZeroClaw, deferred)
        interaction/      # POST /api/ingest/interaction — doc 02 §4 (ZeroClaw, deferred)
        usage/            # POST /api/ingest/usage — doc 02 §5
  db/
    schema.ts             # Drizzle schema — empty at S1, populated in S2 per doc 01
    index.ts               # DB client
  components/
    ui/
docs/
  planning/                # copies of the wsm-second-brain client-hub doc pack
```

Folders that don't yet have real files carry a `.gitkeep` — remove it as soon as the first real file lands there.
