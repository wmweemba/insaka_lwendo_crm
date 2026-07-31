# Client Hub — Strategy & Architecture

**Status:** PLANNED — awaiting implementation. No build date committed; sits behind current BazaBooks/Chama360 prospecting and the Agent LLM Stack (end of July 2026).
**Working name:** "Client Hub" — placeholder, rename at build time if a better name lands.
**Docs in this pack:** `00` strategy (this file) · `01` data model · `02` capture & integrations · `03` UI & dashboard · `04` build phases.

## The problem

Leads arrive on WhatsApp (referrals, outreach replies), signups arrive as email + Telegram alerts, and everything gets logged by hand into `docs/outreach-log.md` (append-only prose) and `docs/prospects.xlsx`. That combo captures rich history but has no pipeline stages, no "next action due" view, no link between a prospect and their in-app account once they sign up, and no way to see who's gone quiet. Every venture (BazaBooks, Chama360, catering scheduler, Nexus web clients) has the same need.

## The decision

**Build a small custom mini-CRM on the existing stack** rather than adopt Twenty/EspoCRM/Notion. Decided 2026-07-19. Rationale:

- The three planned integrations — signup webhooks from own apps, ZeroClaw Telegram quick-capture, nightly usage rollups from each app (see `scaffold/usage-tracking/PLAN.md`) — are all first-class in a custom build and all awkward bolt-ons against a generic CRM's API and data model.
- One operator (William), single-digit-hundreds of contacts. This is the scale where "CRM" is a weekend of CRUD, not a product category.
- Stack reuse: identical to BazaBooks (Next.js App Router + Drizzle + Postgres + Better Auth), so every pattern, scaffold, and gotcha (incl. NS-007 migration journal drift) transfers.
- Resource cost on the Hetzner/Coolify box: one small container + one extra database on the existing Postgres instance. No new always-on heavyweight service (an OSS CRM would cost 500MB–1GB RAM for features that would go 90% unused).

**Rejected:** Twenty/EspoCRM (RAM cost + integration friction), Notion (third-party custody of client data, API-mediated integrations), structured-files-only (no webhooks, unusable from phone mid-conversation).

## What it is

A single-admin web app that answers, at a glance:

1. **Who is in my pipeline, per product, and at what stage?** (kanban per product)
2. **What am I supposed to do this week?** (next actions due + overdue, fresh signups to welcome, clients gone quiet)
3. **What is the full history with this person?** (every interaction, across products, in one timeline)
4. **Who is actually using my apps?** (usage rollups: last active, key counts — fed by the usage-tracking scaffold)

Core model insight: a **contact** can have multiple **engagements** (one per product — Tumeyo can be a BazaBooks client and a catering-scheduler lead simultaneously). Stage lives on the engagement, not the contact. See doc `01`.

## Architecture

| Layer | Choice |
|---|---|
| App | Next.js (App Router), server components + server actions |
| DB | Postgres (new database on existing Coolify instance) via Drizzle |
| Auth | Better Auth, **single admin account**, signups disabled after first user |
| UI | Tailwind + same component approach as BazaBooks; mobile-usable (quick-add lead from phone) |
| Deploy | Coolify on Hetzner, own subdomain, HTTPS |
| Security | Apply `scaffold/security-baseline/` at project start (headers, env exclusions, least-privilege DB role, pre-push hook) |

Inbound integrations (all detailed in doc `02`):

- `POST /api/ingest/signup` — HMAC-signed webhooks from BazaBooks (later Chama360) fired from the same signup hook that already sends the email/Telegram alert (per pattern P-001: independent fire-and-forget side effects, never blocking signup).
- `POST /api/ingest/lead` — API-key-authenticated endpoint for ZeroClaw: message the bot from the phone the moment a WhatsApp referral lands; it parses and creates the lead.
- `POST /api/ingest/usage` — nightly batch rollups from each app running the usage-tracking scaffold.
- One-time legacy import of `docs/prospects.xlsx` + `docs/outreach-log.md`.

## Source-of-truth handover

At go-live (end of build phase P1): the hub becomes the **only** place new leads, stage changes, and interactions are recorded. `docs/outreach-log.md` and `docs/prospects.xlsx` are frozen with a pointer note at the top of each. Until then, current practice continues unchanged — do not half-migrate.

## Success criteria

- Adding a WhatsApp referral lead takes <30 seconds from the phone (via ZeroClaw) with no laptop.
- A BazaBooks signup appears in the hub within a minute of account creation, auto-linked to an existing prospect record when one matches.
- The "This Week" view alone is enough to run the weekly outreach/follow-up session — no cross-referencing spreadsheets.
- A client who signed up but hasn't opened the app in 14 days surfaces without being looked for.

## Non-goals (v1)

No email/message sending from the hub (WhatsApp stays the channel; the hub records, it doesn't send). No campaign automation. No multi-user/team features. No billing or invoicing (that's each app's admin module). No public-facing anything.
