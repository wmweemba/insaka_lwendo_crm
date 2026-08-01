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

### Notes

- P3 (ZeroClaw quick-capture) is deferred until both ZeroClaw instances are
  working again and the Agent LLM Stack plan lands — see `CLAUDE.md`.
- No deploy yet. First entry under a real version number lands at the
  P0-S1 Coolify smoke deploy.

[Unreleased]: https://github.com/wmweemba/insaka_lwendo_crm/compare/main...HEAD
