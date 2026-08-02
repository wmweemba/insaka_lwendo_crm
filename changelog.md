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
- Quick-add lead flow (`/leads/new`, doc 02 §1 / doc 03 screen 4): the four
  quick fields (name, phone, product, source/referred-by/note), reachable
  from the now-live "Quick-add" nav item and a global `⌘K`/`Ctrl+K` shortcut
  (`(dashboard)/QuickAddShortcut.tsx`). Doc 01's dedup rule — a warning, never
  a hard block — surfaces phone/name matches with a link to the existing
  contact and a "this is someone new" override
  (`src/db/queries/duplicates.ts`). Success state offers "Add next action
  now" or "Done".
- Contact detail: unified interaction timeline (`Timeline.tsx`) across all of
  a contact's engagements, sorted by `happened_at`, with channel icons and
  muted/dashed styling for `system`-channel entries. Inline log-interaction
  composer (`LogInteractionForm.tsx`) that flows into doc 01's "what's the
  next action?" prompt in the same component. Open next actions shown per
  engagement panel (`NextActionsList.tsx`) with Done/Cancel actions.
- `getContactById` (`src/db/queries/contacts.ts`) extended to load
  `interactions` and open `nextActions` per engagement, feeding the timeline
  and next-actions list without a new query file.
- Pipeline board (`/pipeline`, doc 03 screen 2): 9 kanban columns in the
  locked stage order, `ui_spec.md` §7.2 temperature palette on column top
  borders + card stage dot, glass cards (`PipelineCard.tsx`) with tier badge,
  days-in-stage, and next-action date (danger color if overdue). Drag-to-
  change-stage via `motion/react`, with the doc 01 required-reason modal
  blocking drops onto `LOST` (`LostReasonModal.tsx`) — confirms write a
  `system` interaction row, same rule as the engagement panel and quick-add.
  The "reached SIGNED_UP+" warm-pulse animation from §5.3 on successful moves.
- Product tabs (`ProductTabs.tsx`) + an "All" tab that swaps the board for a
  flat table (`AllTable.tsx`, doc 03: name/product/stage/tier/last
  interaction/next action) with client-side CSV export (`ExportCsvButton.tsx`).
- `.card-glass` (`ui_spec.md` §4.1 recipe) added to `globals.css` — the first
  screen that needed the actual glass CSS, not just the underlying tokens.
  Includes `contain: layout paint` per §10's guidance for the "dozens of
  cards on screen" case the pipeline board is.
- Merge-duplicates (doc 03 screen 3): "Merge into another contact" on the
  contact detail page (`MergeContactForm.tsx` + `contacts/merge-actions.ts`).
  Transactional — re-points engagements onto the target contact, or (when
  both contacts already have an engagement for the same product) moves the
  source's interactions/next_actions onto the target's existing engagement
  instead of creating a duplicate; unions `phone`/`phone_alt`; re-points any
  contacts that had the source as `referred_by`; deletes the source.
- `src/lib/now.ts` — a named `currentTimestamp()` wrapper around `Date.now()`,
  used to pass "now" down from server components as a plain prop rather than
  reading the wall clock inside component render bodies (see Fixed).
- Better Auth single-admin wiring (closes out P0-S1's last item): email/password
  auth (`src/lib/auth.ts`, `src/lib/auth-client.ts`), the
  `/api/auth/[...all]` route handler, and Better Auth's 4 tables
  (`src/db/auth-schema.ts` — camelCase columns per NS-011's naming exception,
  included in `drizzle.config.ts`'s schema glob and migrated normally;
  `drizzle-kit migrate` had no NS-007-style hang against local Postgres.app).
  A `databaseHooks.user.create.before` hook closes sign-ups after the first
  account exists — enforced at the API layer (verified: a second
  `/api/auth/sign-up/email` call 403s), not just hidden in the UI. `/sign-in`
  reads the user count server-side to switch between "create admin account"
  (first run) and "sign in" (every run after). `src/proxy.ts` (Next 16
  renamed `middleware.ts` → `proxy.ts`) does an optimistic cookie-only redirect
  per Better Auth's guidance for Proxy; the `(dashboard)` layout does the real
  `auth.api.getSession()` check server-side as the actual gate. Sign-out lives
  in the sidebar (`SignOutButton.tsx`).
- `scripts/import-legacy.ts` (P1, doc 02 §2 / doc 04): one-time legacy import
  from `wsm-second-brain/docs/{prospects.xlsx,outreach-log.md}` (read-only
  source — never written to by this script). Two-stage per doc 02: a dry run
  prints a summary and writes `scripts/legacy-import-review.md` (gitignored —
  real contact PII, regenerated on each run); `--commit` writes everything in
  one transaction. Refuses to `--commit` a second time once `contacts` is
  non-empty, since the table has no unique constraint that would make a
  re-run idempotent — this is meant to run once, at go-live.
  - xlsx (`Prospects` sheet, all 3448 rows) → `contacts`, always — including
    Tier-2 rows with no business signal, per doc 02 ("canonical contact
    list"). Engagements are only created for the ~31 rows that actually have
    a Product Fit set.
  - Product Fit → product slug: `BazaBooks`/`Chama360` map 1:1; `Web
    Design/Hosting` → `nexus-web`; `NdalamaHub` doesn't match any doc-01 seed
    slug and isn't folded into "other" — added as a new `ndalamahub` product
    row instead (products grows by insert per doc 01, and outreach-log.md
    references it as its own live app, distinct from Nexus's web/hosting
    client work). **Flagged for William to confirm** — a judgment call the
    docs don't spell out.
  - Outreach Status → stage via doc 02's literal inference rule ("responded/
    in dialogue → IN_CONVERSATION... when ambiguous, choose the earlier
    stage"), plus the two free-text variants actually used in the sheet
    ("Signed Up", "Stalled / Went Quiet") that aren't in the xlsx's own
    dropdown legend.
  - Explicit hand-flagged duplicates (Internal Notes containing "DUPLICATE" —
    the sheet already annotates these, e.g. Kanyika Kawandami's 3 phonebook
    lines) are merged into the row they name as canonical, phones folded into
    `phone_alt`. Rows that merely *share* a phone number but aren't flagged
    are deliberately **not** auto-merged — the raw export turned out to have
    real cases of two different people sharing a number (e.g. "Jason Mfula
    II" / "Jay Mumba Photography"); silently merging on phone alone would
    have overwritten Jay's SIGNED_UP fixture with an unrelated name. These
    ~300 pairs (almost all genuine Tier-2 phonebook noise — reused/reassigned
    numbers, not real duplicate signups) are listed in the review file for
    manual merge via the app's own Merge-contacts tool instead, per doc 01's
    "surface a warning, never hard-block" dedup rule.
  - A small hardcoded fixture table covers the cases doc 04 calls out by name
    where one xlsx row doesn't cleanly become one engagement: Annette Mazaba
    /Tasty Food Boutique (BazaBooks CONTACTED + catering-scheduler
    IN_CONVERSATION) and Grace Kalele MFIN (BazaBooks CONTACTED + Chama360
    IN_CONVERSATION), plus two referral links that only exist as prose in the
    source (Mulenga Bwalya → Mathan; Julie Mwamba → her village bank's
    chairperson), setting `contacts.referred_by`.
  - `outreach-log.md`'s `## Outreach` / `## Outreach Follow ups` (pipe-
    delimited) and `## Feedback` (dated prose) sections parse into
    `interactions`, matched to contacts by name (never auto-creating a
    contact from the log, per doc 02) and to the product-specific engagement
    named/implied in each entry; channel/direction are inferred (keyword
    scan for "call"/"in person", default `whatsapp`) since the log itself
    doesn't record them per line. Entries whose product can't be inferred, or
    whose name doesn't match any imported contact (e.g. "Weekly batch",
    "Grocery Champions" — not individuals), go to the review file instead of
    being guessed at.
  - Verified against local dev Postgres: Kanyika Kawandami consolidated
    correctly (3 phone lines → one `phone_alt` array, SIGNED_UP), Jay Mumba
    Photography SIGNED_UP, the Mulenga Bwalya → Mathan and Julie Mwamba →
    chairperson referral links resolved, and Annette/Grace both landed with
    their two respective engagements — all matching doc 04's named test
    fixtures. Spot-checked in the actual UI (pipeline board, contacts table).

- `POST /api/ingest/signup` (P2, doc 02 §3): HMAC-SHA256-verified webhook
  (`X-Hub-Signature`, constant-time compare, per-app secret from
  `INGEST_SECRET_<APP>` env vars — `src/lib/ingestAuth.ts`), idempotent on
  `(app, event, user.id)` via `ingest_log`. Every request is logged before
  processing regardless of outcome (invalid signature, bad payload, or
  success), per the standing ingest rule in `CLAUDE.md`.
  - Matching (`src/app/api/ingest/signup/process.ts`): existing engagement by
    `app_user_id` first; else contact by email → phone → fuzzy name+business;
    else a new contact (`source: inbound`). Stage only auto-advances to
    `SIGNED_UP` from `LEAD`/`CONTACTED`/`IN_CONVERSATION`/`TRIALING` — doc
    01's forward-only rule means an engagement already at `SIGNED_UP` or
    beyond, `DORMANT`, or `LOST` is left alone (still logs the "Signed up in
    {app}" system interaction and backfills `app_user_id` either way).
  - New `engagements.needs_review` column (migration `0002`) — set `true`
    only on the no-match/new-contact path, so an unrecognized signup surfaces
    for review rather than silently assuming it's really a new person.
  - Unrecognized `event` values 200/no-op rather than reject (doc 02: the
    endpoint is schema-ready for `subscription.activated`/`payment.recorded`,
    not yet built) — avoids BazaBooks retrying forever on something that
    isn't actually an error.
  - Verified against local dev Postgres with real HMAC-signed curl requests:
    matched-by-phone (existing Jay Mumba Photography engagement, already
    `SIGNED_UP`, correctly left in place), a brand-new contact + `needs_review`
    flag, replay idempotency, bad-signature 401, and an unhandled future
    event no-op — all five requests correctly logged in `ingest_log`.
  - The BazaBooks-side emitter (`databaseHooks.user.create.after`, doc 02 §3)
    lives in a different repo and isn't part of this change.
- `docs/outstanding-tasks.md` — a running list of items from this session
  that need a William decision or manual action rather than more build work:
  confirming the `ndalamahub` product call, reviewing the ~300
  possible-duplicate contacts, adding the missing "Astral Media" contact by
  hand, the Coolify deploy + real env secrets, and the go-live freeze ritual.
- Surfaced `engagements.needs_review` in the UI — added when the signup
  webhook was built, but nothing displayed it. A "Needs review" badge (warm
  `--color-warning` pill, matching the existing tier-badge pattern) now
  shows on the pipeline card, the "All" table row (next to the contact
  name), and the contact-detail engagement panel, where a "Mark reviewed"
  button (`markEngagementReviewed` server action) clears the flag once a
  human has looked at it. Verified in the browser: a webhook-created
  needs_review engagement showed the badge in all three places, and "Mark
  reviewed" cleared it immediately.

### Fixed

- `next.config.ts` CSP `script-src 'self'` blocked Next dev's own inline
  HMR/bootstrap scripts, breaking `next dev` entirely — relaxed to
  `'unsafe-inline' 'unsafe-eval'` in development only; production stays locked
  to `'self'`.
- Unique/foreign-key violation detection in the contacts/engagements server
  actions was checking `err.code` directly, but drizzle-orm wraps driver
  errors in `DrizzleQueryError` with the real Postgres error on `.cause` —
  fixed to check both levels.
- Kanban drag-and-drop was silently resolving every drop to the card's own
  source column: `elementFromPoint` at drop time hits the dragged card itself
  (still positioned under the pointer), whose nearest `[data-stage-column]`
  ancestor is the source, not whatever's underneath it. Fixed by disabling
  `pointer-events` on the dragged card for that one synchronous lookup.
- Two React Compiler purity violations (`Date.now()`/`new Date()` called
  directly in component render bodies, in the pipeline board/cards) — fixed
  by computing the timestamp once in the server component and threading it
  down as a plain `now` prop instead.
- `PipelineBoard` was syncing local state from props via a
  `useEffect(() => setEngagements(initial), [initial])` — a documented React
  anti-pattern. Replaced with a `key={product}` on the component so switching
  product tabs remounts it with fresh state instead.
- Sidebar/mobile-tab nav had no active-route detection — every "live" item
  (Pipeline, Contacts, Quick-add) always rendered in the active/accent-glow
  style regardless of the current page, contrary to `ui_spec.md` §3.2's
  "active item gets a left-edge vertical accent bar." Extracted nav rendering
  into a client component (`NavLinks.tsx`, uses `usePathname()`) so only the
  current route is highlighted; inactive live items now render muted with a
  hover state, matching the "soon" items' visual weight class but without the
  disabled look.
- `.env.example` listed stale placeholder secret names
  (`BAZABOOKS_WEBHOOK_SECRET`, `CHAMA360_WEBHOOK_SECRET`) that don't match the
  `INGEST_SECRET_<APP>` convention `src/lib/ingestAuth.ts` actually reads —
  updated to match.
- Re-verified `/api/ingest/signup` end-to-end against local dev Postgres with
  a real HMAC-signed request (valid signup, replay, and bad-signature cases)
  after noticing `ingest_log` was empty despite an earlier claimed
  verification — all three cases behaved correctly and logged as expected;
  the empty table was from a subsequent local DB reset (legacy-import
  requires an empty `contacts` table to run), not a broken webhook. Test rows
  cleaned up afterward.
- Production deploy rendered a blank `/sign-in` page: `next.config.ts`'s
  `Content-Security-Policy` locked `script-src` to `'self'` with no
  `'unsafe-inline'`/nonce, and browsers block Next's own inline
  hydration/RSC-payload scripts under that policy regardless of environment
  (this had only ever been exercised in dev, where the policy was relaxed).
  Fixed the framework-recommended way — a per-request nonce — rather than
  loosening to `'unsafe-inline'`: `src/proxy.ts` (Next 16 renamed
  `middleware.ts` to `proxy.ts`) now generates a nonce, sets it on both the
  request (`x-nonce`) and response `Content-Security-Policy` headers, and
  Next auto-stamps that nonce onto its own framework/page scripts during SSR.
  Moved the CSP header out of `next.config.ts` (which only runs once at
  build/route-definition time and can't carry a per-request value) down to
  proxy.ts, alongside the existing session-cookie redirect; the other static
  security headers (`X-Frame-Options`, etc.) stay in `next.config.ts`. Nonce
  support requires dynamic rendering, which sign-in and the dashboard layout
  already opt into (`headers()`) for the session check, so no page needed
  extra changes. Verified locally: `pnpm build` (10 routes rendered/proxy
  compiled) and `pnpm start` with a real `curl`, confirming both the CSP
  response header and matching `nonce="..."` attributes on the rendered
  inline scripts.
- First Coolify smoke deploy failed the build with `ERROR packages field
  missing or empty` during `pnpm i --frozen-lockfile`. Root cause: Coolify's
  Nixpacks build resolved pnpm 9.15.9 (no `packageManager` field pins a
  version), and pnpm <10 requires an explicit `packages` field in
  `pnpm-workspace.yaml` even when the file exists only for its security
  settings — pnpm 10.x (used locally) doesn't enforce this, so local installs
  never surfaced it. Fixed by adding `packages: - "."` (this is a
  single-package repo, not a real monorepo). Verified by running
  `pnpm@9.15.9 i --frozen-lockfile` directly against the fixed file.

### Notes

- P3 (ZeroClaw quick-capture) is deferred until both ZeroClaw instances are
  working again and the Agent LLM Stack plan lands — see `CLAUDE.md`.
- No deploy yet. First entry under a real version number lands at the
  P0-S1 Coolify smoke deploy.
- Auth is now wired up (Better Auth single-admin, email/password, sign-ups
  closed after the first account) — verified end-to-end in a real browser:
  first-run sign-up creates the admin and lands on `/contacts`, sign-out
  returns to `/sign-in` which then shows "Sign in" instead of "Create admin
  account", sign-in with those credentials works, unauthenticated requests to
  `/` 307-redirect to `/sign-in`, and a second `/api/auth/sign-up/email` call
  403s. `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` added to `.env.local`
  (gitignored) for local dev — both need real values in Coolify's env before
  the smoke deploy, and `BETTER_AUTH_URL` must be the real subdomain, not
  `localhost:3000`.
- P0 (doc 04) is now feature-complete: S1 schema/seed + auth, S2
  contacts/engagements CRUD + quick-add with dedup + timeline/composer/
  next-actions, and S3 pipeline board + "All" table + merge-duplicates are
  all built. Only outstanding item before P0's own acceptance bar is fully
  met: the Coolify smoke deploy (needs real infra access, not done in this
  session). P1+ (legacy import, signup webhooks, ZeroClaw, usage rollups)
  haven't been started.
- Kanban drag currently requires all 9 stage columns to fit in the viewport
  (or be scrolled into view) for a drop to register correctly — there's no
  auto-scroll-on-drag-near-edge yet. Fine on a wide desktop window; a real
  gap on laptop-width screens or anything narrower. Flagged as a follow-up,
  not fixed in this pass.

[Unreleased]: https://github.com/wmweemba/insaka_lwendo_crm/compare/main...HEAD
