# Insaka Lwendo CRM

A small, single-admin mini-CRM that ties William Mweemba's ventures (BazaBooks, Chama360, and future apps) into one lead-tracking and client pipeline surface. Internally referred to as "Client Hub" in planning docs.

**Status:** early scaffold (P0-S1). Not deployed yet.

## Why this exists

Leads currently arrive scattered across WhatsApp, email, and Telegram, and get logged by hand into a spreadsheet and a prose log. This app replaces that with pipeline stages, a "what's due this week" view, a per-contact history across every product, and a spot for usage rollups from each app once signed up.

Full rationale, data model, integrations, UI spec, and build phases are in [`docs/planning/`](docs/planning/) — copied from the source-of-truth pack in `wsm-second-brain/infrastructure/client-hub/`. Read `docs/planning/00-strategy-and-architecture.md` first.

## Stack

Next.js 16 (App Router, TypeScript) · Drizzle ORM + Postgres · Better Auth (single admin) · Tailwind v4 · pnpm

## Getting started

```bash
cp .env.example .env.local   # fill in DATABASE_URL and BETTER_AUTH_SECRET
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm lint         # eslint
pnpm db:generate  # generate a Drizzle migration from schema changes
pnpm db:migrate   # apply migrations
pnpm db:studio    # Drizzle Studio
```

## Conventions

See [`CLAUDE.md`](CLAUDE.md) for the full development context, current build phase, and security baseline notes — load it at the start of any AI-assisted session on this repo.
