# Changelog

All notable changes to Insaka Lwendo CRM are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Pre-1.0.0: minor version bumps may include breaking changes; this stays true
until the app reaches its first production deploy with real client data.

## [Unreleased]

### Added

- Repo scaffold — Next.js 16 (App Router, TypeScript, `src/` layout), pnpm.
- Core dependencies: `drizzle-orm` + `drizzle-kit` (Postgres), `better-auth`,
  `zod`, `react-hook-form`, Tailwind CSS v4.
- Security baseline (mirrored from `wsm-second-brain/scaffold/security-baseline/`):
  - `pnpm-workspace.yaml` supply-chain hardening (1-day minimum release age,
    default-deny install scripts with `esbuild` allowlisted).
  - Security headers (CSP, `X-Frame-Options`, etc.) merged into `next.config.ts`.
  - `.gitignore` / `.dockerignore` env-file exclusions.
  - Husky `pre-push` hook blocking staged `.env` files and secret-shaped diffs
    (gitleaks-backed).
- Planning doc pack copied into `docs/planning/` from
  `wsm-second-brain/infrastructure/client-hub/` (strategy & architecture,
  data model, capture & integrations, UI & dashboard, build phases).
- Initial folder structure for the four dashboard screens
  (`(dashboard)/{pipeline,contacts,leads/new}`) and the four ingest
  endpoints (`api/ingest/{signup,lead,interaction,usage}`) per the doc 01
  data model and doc 03 UI spec.
- `src/db/` — Drizzle client (`index.ts`) and schema entry point
  (`schema.ts`, intentionally empty pending P0-S2).
- Full Drizzle schema (`src/db/schema.ts`) for the doc 01 data model: `products`,
  `contacts`, `engagements`, `interactions`, `next_actions`, `usage_rollups`,
  `ingest_log` — snake_case columns per `NS-011`, the locked stage-machine enum
  (`LEAD` → … → `PAYING`/`DORMANT`/`LOST`), the `(contact_id, product_id)` and
  `(product_id, app_user_id, period_date)` unique constraints, and all 5 indexes
  from doc 01's "Indexes that matter."
- `src/db/seed.ts` + `pnpm db:seed` — seeds the 5 reference products
  (`bazabooks`, `chama360`, `catering-scheduler`, `nexus-web`, `other`).
- Generated first migration (`drizzle/0000_flimsy_ultimates.sql`) via
  `drizzle-kit generate`, reviewed against doc 01. Not yet applied to any
  database — gated on the Coolify Postgres tunnel being confirmed working
  first, per `NS-007` migration discipline.
- `CLAUDE.md` and `README.md` with project context, current build phase,
  and stack/security notes.
- `ui_spec.md` — full design spec ("Firelight glass" / insaka design thesis):
  color system (dark/light), typography, layout & nav, glass surface/elevation
  system, motion system, iconography, per-screen component patterns, voice,
  accessibility floor, and implementation notes.
- `motion` dependency (the current package for what was Framer Motion) for
  in-screen interaction (kanban drag physics, scroll-reveal stagger).
- `experimental.viewTransition` enabled in `next.config.ts` for route-level
  fade/rise transitions via the browser's native View Transitions API,
  rather than a client animation library — see `ui_spec.md` §5 for why.
- `ui_spec.md` §1/§2/§4 design tokens (dark palette, type scale, radius/shadow)
  wired into `globals.css`; Montserrat/Inter/JetBrains Mono loaded via
  `next/font/google` in `layout.tsx`.
- Dashboard shell (`(dashboard)/layout.tsx`) — sidebar (desktop) / bottom tab
  bar (mobile) per `ui_spec.md` §3.2/§3.3, with This Week/Pipeline/Quick-add
  rendered muted ("soon") until those screens are built; only Contacts is live.
- Drizzle `relations()` for `contacts` ↔ `engagements` ↔ `products`, including
  the self-referential `referredBy` chain, enabling the relational query API.
- Contacts CRUD (P0-S2): list, create, edit, and detail pages
  (`(dashboard)/contacts/**`) with react-hook-form + zod validation
  (`@hookform/resolvers` added), server actions for all writes, and a
  blocked-delete guard when a contact still has engagements.
- Engagements CRUD, embedded in the contact detail page: add/edit/remove per
  product, with the doc 01-mandated required-reason prompt when a stage moves
  to `LOST` (writes a `system` `interactions` row and bumps `stage_changed_at`),
  and duplicate-product / has-history delete guards.
- Shared form primitives (`src/components/ui/{Input,Select,Textarea,Label,Button}.tsx`)
  and a `cn()` helper (`src/lib/cn.ts`), flat-styled per `ui_spec.md` §7.3.
- Local dev workflow: Postgres.app-backed `insaka_lwendo_crm_dev` database,
  `.env.local` (gitignored), separate from the still-unconfirmed Coolify
  tunnel — migrations applied here don't touch NS-007's open question.

### Fixed

- `next.config.ts` CSP `script-src 'self'` blocked Next dev's own inline
  HMR/bootstrap scripts, breaking `next dev` entirely — relaxed to
  `'unsafe-inline' 'unsafe-eval'` in development only; production stays locked
  to `'self'`.
- Unique/foreign-key violation detection in the contacts/engagements server
  actions was checking `err.code` directly, but drizzle-orm wraps driver
  errors in `DrizzleQueryError` with the real Postgres error on `.cause` —
  fixed to check both levels.

### Notes

- P3 (ZeroClaw quick-capture) is deferred until both ZeroClaw instances are
  working again and the Agent LLM Stack plan lands — see `CLAUDE.md`.
- No deploy yet. First entry under a real version number lands at the
  P0-S1 Coolify smoke deploy.
- Auth (Better Auth single-admin) is still not wired up — Contacts CRUD is
  unauthenticated for now; tracked in `CLAUDE.md`'s "still to do" list.
- Quick-add-with-dedup flow, the unified interaction timeline/composer, and
  the next-action prompt are separate doc 04 P0-S2 items, not yet built.

[Unreleased]: https://github.com/wmweemba/insaka_lwendo_crm/compare/main...HEAD
