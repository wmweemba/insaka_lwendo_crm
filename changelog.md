# Changelog

All notable changes to Insaka Lwendo CRM are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Pre-1.0.0: minor version bumps may include breaking changes; this stays true
until the app reaches its first production deploy with real client data.

## [Unreleased]

### Added

- Performance audit (`/pa --full`) fixes, both scoped after a self-review
  ruled out a broader "add pagination everywhere" pass as actively wrong —
  `thisWeek.ts` and `listEngagementsForBoard` deliberately fetch full
  datasets for correct in-JS aggregation (goneQuiet/freshSignups/stage
  counts), so limiting those queries would have produced wrong numbers, not
  just faster ones; left as-is.
  - `contacts` table indexing: was fully unindexed. Added a GIN trigram
    index on `contacts.name` (`pg_trgm` extension, migration
    `drizzle/0003_numerous_mastermind.sql`) so `agentSearch.ts`'s
    `ilike '%term%'` and `duplicates.ts`'s bare `ilike` dedup check can both
    use an index — a plain btree index would not have been usable by the
    planner for either query shape (confirmed via `EXPLAIN` against local
    dev: Bitmap Index Scan instead of Seq Scan). Plus a plain btree index
    on `contacts.phone` for the exact-match lookups. Purely additive
    (`CREATE EXTENSION IF NOT EXISTS` + `CREATE INDEX`), no data touched.
  - Pipeline board re-render fix (`PipelineBoard.tsx`, `PipelineCard.tsx`):
    replaced 9x-per-render `.filter()` calls (once per stage column) with a
    single `useMemo`'d grouping by stage; wrapped `applyMove`/`handleDrop`
    in `useCallback` and `PipelineCard` in `React.memo` so a card drag no
    longer re-renders every card in every column. No React Compiler is
    configured in this project (a stale code comment implied otherwise),
    so this manual memoization is real, not redundant. Behavior-preserving
    by construction — same partition logic, just computed once instead of
    once per stage; verified with `tsc --noEmit`, `eslint`, and a full
    `next build`.
- PWA installability (Tier 1 baseline): `src/app/manifest.ts` (native Next
  `MetadataRoute.Manifest`), PNG icons at `public/icons/` (192, 512,
  maskable — rasterized from the existing firelight-hut `icon.svg` mark,
  20% safe-zone padding on the maskable variant), `src/app/apple-icon.png`
  (180×180, opaque, via Next's `apple-icon` file convention), `viewport`
  export with `viewport-fit=cover` and `themeColor`, and `appleWebApp`
  metadata in `src/app/layout.tsx`. Safe-area inset padding added to
  `body` in `globals.css`. Verified via production build + local serve:
  `/manifest.webmanifest` and all icon routes return 200 with correct
  MIME types, and `<link rel="manifest">`/Apple meta tags render on
  `/sign-in`. Tier 2 (offline/service worker) deliberately deferred —
  every route past `/sign-in` is authenticated, so caching would need to
  be scoped to the app shell only, and that's a separate, riskier pass.
- Custom favicon replacing the Next.js default — a thatched conical roof
  over an open-sided pole frame with a glowing hearth-fire dot underneath,
  built directly from `ui_spec.md` §0's design thesis ("no doors, no walls
  to hide behind — just a circle, a fire") and §6's guidance to use "a
  minimal circular hut silhouette or radiating fire-glow mark" for
  insaka-specific icon moments. Colors pulled from the existing dark-mode
  token table (`--color-accent`, `--color-gold`, `--color-bg-raised`), no
  new palette invented. First attempt (a pinwheel of thatch wedges viewed
  from above) was rejected before shipping — at any size it read as a
  radiation/hazard symbol, not a hut. `src/app/favicon.ico` (16/32/48px
  multi-resolution), `src/app/icon.svg` (Next's modern SVG-favicon
  convention), and `src/app/apple-icon.png` (180×180, iOS home screen) —
  rendered via a real browser at each target size to confirm the shape
  still reads at 16px, then verified all three routes serve with correct
  content-types against a production build.

- **This Week screen (doc 03 Screen 1) built** — the last of the four
  planned dashboard screens; `/` had been redirecting straight to `/contacts`
  since P0 with the nav item muted "soon." Now shows: overdue next actions,
  due-this-week next actions, fresh signups with no outbound follow-up yet,
  a "gone quiet" list, and a 4-number metrics strip (new leads this month,
  signups this month, active clients, open next actions). `db/queries/thisWeek.ts`
  computes all of it in JS over a full engagement fetch rather than SQL
  subqueries — the dataset is small enough (~40 live engagements) that this
  stays fast and is far easier to read/adjust than nested EXISTS clauses.
  Two honest simplifications, both commented in the query file: "gone quiet"
  uses last-logged-interaction as the activity signal since
  `usage_rollups.last_active_at` (the doc 03 spec's intended signal) doesn't
  exist yet — P4/usage-tracking is still gated on BazaBooks shipping
  `scaffold/usage-tracking`; and "signups this month" counts by current
  `stage_changed_at`, which slightly over-counts engagements that advanced
  further (e.g. ACTIVE → PAYING) within the month, since the schema has no
  dedicated signed-up-at timestamp. `NavLinks.tsx`'s "This Week" item flipped
  from `live: false` to `live: true`; `src/app/page.tsx` (the old
  unconditional redirect-to-/contacts) deleted now that `(dashboard)/page.tsx`
  owns `/` directly, behind the same auth-gated dashboard layout.
- Contacts page search — instant client-side filter by name/company/phone as
  you type (`ContactsList.tsx`), on both the mobile card list and the desktop
  table. Doc 03's original "table filter suffices at this scale" call turned
  out wrong in practice at 3000+ contacts (flagged directly by William after
  using the app for real); all contacts were already being fetched
  client-side with no pagination, so this is a pure client-side filter with
  no new query.
- Pipeline engagement quick panel (`pipeline/EngagementQuickPanel.tsx`) —
  clicking/tapping a pipeline card now opens a panel to change stage/tier/
  interest note, add/complete/reschedule/cancel next actions, and log an
  interaction, without leaving the board. Previously a card only supported
  moving between stages (desktop drag, or the old mobile-only "Move to…"
  sheet, now retired in favor of this same panel on both surfaces — tap
  opens it on mobile too). Desktop drag-and-drop is unchanged and still the
  fastest way to move a card; the panel uses Motion's `onTap` gesture so it
  doesn't fire mid-drag. Reuses the existing contact-detail-page server
  actions (`updateEngagement`, `logInteraction`, `createNextAction`,
  `completeNextAction`, `cancelNextAction`, `markEngagementReviewed`) rather
  than duplicating logic, plus one new one, `rescheduleNextAction` — none of
  the existing next-action actions supported changing a due date before.
  Those actions' `revalidatePath` calls extended to cover `/pipeline` and
  `/` too, since they're now reachable from there. Stage changes apply
  optimistically to the board immediately (same mechanism the existing drag
  flow already used), including the LOST-reason modal for that case; other
  edits (tier/note/next actions) patch the open panel and the underlying
  card locally without a full page reload.
- Pipeline product tabs (`BazaBooks` / `Catering Scheduler` / …) now scroll
  horizontally on mobile instead of forcing the whole page wide — same
  `overflow-x-auto` treatment the kanban columns already had, just missing
  from the tab strip.
- Desktop pipeline board gets scroll-snap columns and a stage-jump pill
  strip above the board (tap a pill to snap-scroll to that column) — doesn't
  change the drag-and-drop UX, just makes the 9 stages easier to navigate to
  without blind horizontal scrolling.
- All four of the above verified live against local dev (real data copy,
  throwaway local-only credential — see engineering notes, not committed
  anywhere) via the Chrome extension: search narrowing 3448 contacts to 1,
  a real stage move reflecting instantly on the board, a next action
  added/cancelled, a test interaction logged, and This Week rendering real
  fresh-signup/gone-quiet data before any of it shipped.
- First production deploy: live on Coolify at `https://insaka.nxhub.online`
  (Nixpacks build, shared Postgres instance with a dedicated
  `insaka_lwendo_crm` database, HTTPS via Coolify/Let's Encrypt). Schema
  migrated with `drizzle-kit migrate` run inside the app container
  (`docker exec ... pnpm db:migrate` — devDependencies aren't pruned from
  the Nixpacks image, so this works without a separate tunnel/build step),
  real `BETTER_AUTH_SECRET` generated and set, admin account created and
  login verified post-redeploy. Two real bugs surfaced and fixed along the
  way — see below. `docs/outstanding-tasks.md` and `CLAUDE.md`'s phase
  tracker updated to reflect P0 being deployed, not just code-complete.
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

- **P1 legacy import go-live, complete (2026-08-05).** `wsm-second-brain/docs/{prospects.xlsx,outreach-log.md}`
  frozen with pointer-note headers; `pnpm import-legacy --commit` run
  against the real production database via `docker exec` on the Coolify
  container (source files transferred with `scp`+`docker cp`, never
  committed to this repo — it's public and they contain real contact PII).
  Production now has 3407 contacts / 37 engagements / 41 interactions. All
  doc 04 fixtures verified afterward: Kanyika one contact with 3 phone
  lines, Mulenga→Mathan referral link, Tasty Food Boutique (contact stored
  as "Annette Mazaba") with two engagements at the expected stages, Jay at
  `SIGNED_UP`, `ndalamahub` product row present. **The hub is now the sole
  source of truth for leads/pipeline** per doc 00's handover rule — see
  `docs/outstanding-tasks.md` for the two real bugs hit along the way (fixed
  separately, see below) and what's still open (re-adding Astral Media, the
  non-urgent duplicate review).

- **Agent API (2026-08-05)** — generalized read/write access for William's
  assistants (Claude, Hermes, each ZeroClaw instance), superseding doc 02
  §4's original ZeroClaw-only `/api/ingest/lead`/`/api/ingest/interaction`
  plan (those stub endpoints are gone; the hub-side API doesn't actually
  need ZeroClaw to be up, only the ZeroClaw-specific Telegram skill does —
  so it's built now rather than staying gated on ZeroClaw's own status).
  - `src/lib/agentAuth.ts` — bearer-token auth, one key per caller,
    `AGENT_API_KEY_<NAME>` env var (same "one var, no code change" pattern
    as `INGEST_SECRET_<APP>`), constant-time compared.
  - `src/lib/agentLog.ts` — every write logs to `ingest_log` with
    `source: "agent:<name>"`; reads aren't logged (no side effect to audit).
  - `GET /api/agent/contacts?q=` (search) and `GET /api/agent/contacts/:id`
    (full detail) — new `src/db/queries/agentSearch.ts`, reuses the existing
    `getContactById` query for detail.
  - `POST /api/agent/leads` — reuses the `createLead` server action
    (always creates rather than blocking on a possible duplicate like the
    UI does — no UI to show a blocking prompt in — reports
    `possibleDuplicates` in the response instead).
  - `POST /api/agent/interactions` — reuses `logInteraction`.
  - `PATCH /api/agent/engagements/:id` — reuses `updateEngagement`, so the
    LOST-reason requirement behaves identically regardless of caller.
  - Every write sets `engagements.needs_review = true`, uniformly across
    all callers including Claude (2026-08-05 decision: simplest rule that's
    still safe over a trust-tiered one).
  - Verified locally end-to-end with a throwaway bearer key: unauthorized/
    wrong-key requests correctly 401; search and detail reads work; a
    created lead's initial note became its first interaction and the
    engagement was flagged `needs_review`; logging a second interaction and
    a stage update both worked; moving to `LOST` without a reason was
    correctly blocked (same rule as the UI), with a reason it succeeded;
    the full `ingest_log` audit trail (including the blocked attempt)
    matched every call made. Test data cleaned up afterward.

- Mobile navigation/UX pass, prompted by William flagging misalignment on
  the Contacts page and no way to sign out on mobile:
  - `(dashboard)/MobileHeader.tsx` — slim `lg:hidden` top bar (wordmark +
    sign-out icon button) above page content. Mobile had no equivalent of
    the desktop sidebar's sign-out button; the bottom tab bar has no room
    for a 5th slot (4 tabs, center one raised for Quick-add per
    `ui_spec.md` §3.3), so account actions get their own bar instead.
  - Contacts list (`(dashboard)/contacts/page.tsx`) now renders a stacked
    card list below `sm` instead of the desktop `<table>` — a table can't
    shrink to a phone width, and this repo has 3000+ contacts, so a
    horizontally-scrollable table was a real usability problem, not just
    the layout bug below.
  - Pipeline board mobile redesign (`(dashboard)/pipeline/MobilePipelineBoard.tsx`,
    `MoveStageSheet.tsx`): below `lg`, the 9-stage kanban is replaced with
    a horizontally-scrollable stage-tab strip showing one stage's cards at
    a time, and tapping a card opens a bottom sheet to pick the destination
    stage — instead of `PipelineCard`'s drag-and-drop, which is unreliable
    on touch once the target column is off-screen (no drag-to-edge
    auto-scroll implemented, and 9 columns rarely all fit). Discussed
    three options with William (scroll-snap only / tap-to-move / collapsed
    swimlane groups) before building; he picked tap-to-move for mobile.
    Desktop keeps the existing drag-and-drop board, with scroll-snap
    columns and a stage-jump pill strip added on top so reaching a
    far-right column doesn't require blind scrolling.

### Fixed

- This Week card text overflowed into single-word-per-line on mobile
  (flagged by William with screenshots after the This Week screen shipped).
  Root cause was the same "unshrinkable flex row" shape as the earlier
  contacts-page overflow bug, just one level down: the Done/Reschedule/Log
  interaction button group was `shrink-0` with no wrap, and the text column
  next to it had no `min-w-0`, so on a narrow viewport the buttons held
  their full width and the text column got squeezed to almost nothing
  instead of either side giving way. Same shape existed in two more places
  that hadn't been reported yet — the next-actions list inside
  `EngagementQuickPanel.tsx` and the older `NextActionsList.tsx` on the
  contact detail page — fixed all three: text column gets `min-w-0`, the
  row stacks vertically (`flex-col` → `sm:flex-row`) and the button group
  wraps (`flex-wrap`) below `sm`. Verified at an actual 390px viewport via
  Playwright (window-resize through the Chrome extension doesn't reliably
  shrink below its default size, per the earlier round's testing notes) —
  reproduced the exact reported overflow first, then confirmed the fix
  wraps buttons onto their own line instead of squeezing the text.
- Contacts page (and, latently, any future page with a wide table) could
  force the entire viewport to scroll horizontally on mobile, clipping the
  "Add contact" button and dragging the fixed bottom tab bar sideways as
  the page scrolled. Root cause: the table's `overflow-x-auto` wrapper
  can only contain the table if its flex ancestors are allowed to shrink
  below the table's intrinsic width, but `(dashboard)/layout.tsx`'s flex
  chain around `<main>` had no `min-w-0` — flex items default to
  `min-width: auto`, so the table's width bled through the whole chain up
  to `<body>`. Fixed by adding `min-w-0` to the flex wrapper and `<main>`,
  plus `overflow-x-hidden` on `<body>` as a backstop against the same
  class of bug elsewhere.
- `scripts/import-legacy.ts` hardcoded its source file paths to
  `/Users/williammweemba/Dev_Projects/wsm-second-brain` — worked in every
  local dry run (that path exists there) but could never have worked
  against the Coolify container, which only ever has this one repo checked
  out. First real go-live attempt failed with `ENOENT`. Made
  `SECOND_BRAIN`/`PROSPECTS_XLSX`/`OUTREACH_LOG` overridable via
  `SECOND_BRAIN_PATH`/`PROSPECTS_XLSX_PATH`/`OUTREACH_LOG_PATH` env vars,
  defaults unchanged. Deliberately not fixed by committing the source
  files into this repo — it's public on GitHub.
- The `outreach-log.md` copy used in the actual `--commit` run turned out
  to be the wrong file (549 lines copied instead of the real 131-line
  file), so it parsed to 0 entries and production ended up with the 3407
  contacts/28 xlsx-engagements but none of the ~41 outreach-log-derived
  interactions. Caught after the fact by checking totals against the local
  dry run; root-caused with a `shasum`/`wc -l` integrity check that should
  have run *before* the first attempt, not after. Since
  `import-legacy.ts` refuses to re-run against a non-empty `contacts`
  table by design, added `scripts/backfill-outreach-log.ts` — matches log
  entries against contacts that already exist instead of a freshly-parsed
  xlsx, skips any interaction that already exists (same
  engagement+summary+happenedAt) so it's safe to re-run. Verified locally
  (identical parse/match counts to the original script, and running
  `--commit` twice produced identical zero-duplicate results both times)
  before running for real once the correct file was byte-for-byte
  verified: 41 interactions + 9 fallback engagements created, closing the
  gap.
- One legacy-imported contact (local dev DB) had the name `1997-04-01
  00:00:00` instead of "April 97" — the real name apparently got
  auto-converted to a date somewhere in the Google Contacts export/parsing
  pipeline since it reads as a date-like string. William identified the
  real name from the phone number; corrected directly in the dev DB. The
  same glitch still exists in `prospects.xlsx` row 2's source data and
  needs fixing there before the pending production legacy-import run, or
  it'll recreate the same bad name — flagged to William, not fixed here
  since this repo treats that file as read-only.
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
- After the CSP fix, `/sign-in` 500'd with `relation "user" does not exist`
  — expected, since no migration had ever been run against the Coolify
  Postgres (deliberately deferred per `CLAUDE.md`'s S1 plan). Running
  `pnpm db:migrate` inside the app container the first time no-opped with
  "already exists, skipping" notices and created no tables — because the
  app's `DATABASE_URL` env var in Coolify still pointed at the default
  `postgres` database, not `insaka_lwendo_crm` (a leftover from before the
  dedicated database existed on this shared Postgres instance). Fixed by
  correcting the database name in the Coolify env var and redeploying, then
  re-running the migration, which applied cleanly with all 10 expected
  tables present afterward.
- The Quick-add lead form's Product dropdown was empty in production —
  `drizzle-kit migrate` had been run there (creating the schema) but
  `pnpm db:seed` (which inserts the 5 reference `products` rows) never had.
  Fixed by running `pnpm db:seed` in the app container; dropdown now lists
  all 5. (`ndalamahub` won't appear until the pending production
  legacy-import run, which is what actually creates that product row — not
  the seed script.)

- BazaBooks-side signup-webhook emitter (P2, doc 02 §3) — built and
  committed in `payrush_saas_app` (`src/lib/integrations/clientHub.js` +
  `src/lib/auth.js`, that repo's changelog `[3.43.6]`), not this repo.
  Verified end-to-end against a local instance of this app: a real BazaBooks
  signup correctly HMAC-signs and reaches `/api/ingest/signup`, creates a
  `needs_review`-flagged contact/engagement, replays as a no-op, and — doc
  02 §3's actual acceptance bar — signup still succeeds in ~3s with this
  app's dev server killed mid-request. Not live in production yet: needs
  `CLIENT_HUB_URL` + a real `INGEST_SECRET_BAZABOOKS` set in both apps'
  Coolify env (tracked in `docs/outstanding-tasks.md`).
- **P2 confirmed fully live in production (2026-08-04):** `CLIENT_HUB_URL`
  and a real `INGEST_SECRET_BAZABOOKS` set runtime-only in both apps'
  Coolify env, both redeployed. A real BazaBooks production signup showed
  up in the hub's Pipeline board within a minute, correctly flagged
  `needs_review`. Signup webhook (P2) is done end-to-end.

### Notes

- P3 (ZeroClaw quick-capture) is deferred until both ZeroClaw instances are
  working again and the Agent LLM Stack plan lands — see `CLAUDE.md`.
- Deployed 2026-08-03: `https://insaka.nxhub.online` — the P0-S1 Coolify
  smoke deploy referenced below. First entry under a real version number
  still lands once P1's go-live legacy import runs against this database.
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
