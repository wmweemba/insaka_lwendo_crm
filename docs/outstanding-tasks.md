# Outstanding tasks for William

Things that came up during the auth (Better Auth) and P1 legacy-import work
that need a human decision or manual action — not blocking further build
work, but shouldn't get lost. Check items off / delete them as they're done.

## Deploy

- [x] Coolify smoke deploy (P0-S1's last remaining item): app on its own
      subdomain with HTTPS, empty-schema smoke deploy, volume-backed Postgres
      confirmed to survive a container restart. Needs real Coolify access.
      Done 2026-08-03: live at https://insaka.nxhub.online, schema migrated,
      admin account created. Along the way, fixed and pushed two real bugs
      surfaced by the deploy (see changelog): `pnpm-workspace.yaml` missing a
      `packages` field (broke the Nixpacks build under pnpm <10), and a
      static `script-src 'self'` CSP blocking Next's own inline hydration
      scripts in production (fixed via a per-request nonce in `src/proxy.ts`
      instead of loosening the policy).
- [x] Once deployed: set real `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` in
      Coolify's env (the `.env.local` values are dev-only, never shared).
      `BETTER_AUTH_URL` must be the real subdomain, not `localhost:3000`.
      Done 2026-08-03: real secret generated and set, service redeployed,
      confirmed login still works under the new secret.

## Legacy import (P1) — go-live

- [x] Confirm the `ndalamahub` product decision: it's not one of doc 01's 5
      seed products, added because `outreach-log.md` references it directly
      (Clement Mweetwa / Manifi Investments) as its own live app. Reversible,
      but a judgment call the docs didn't spell out — say the word if you'd
      rather fold it into `nexus-web` or `other` instead.
      Decided 2026-08-03: keep as its own product — no code change needed,
      `scripts/import-legacy.ts` already does this.
- [ ] Review the ~300 possible-duplicate contact pairs surfaced in
      `scripts/legacy-import-review.md` (regenerate by re-running
      `pnpm import-legacy` — the file is gitignored, real contact PII) and
      merge real dupes via the app's own Merge-contacts tool. Mostly
      Tier-2 phonebook noise (reused/reassigned numbers), not urgent.
- [x] Add "Astral Media" as a contact by hand — it has no phonebook entry in
      `prospects.xlsx` at all despite repeated `outreach-log.md` mentions, so
      the import couldn't create it.
      Done 2026-08-03 via the Quick-add lead flow (BazaBooks). Along the
      way found the `products` table was empty in production — `pnpm
      db:seed` had never been run there (only migrations had) — fixed by
      running it in the app container.
- [ ] Go-live ritual (doc 04, manual, same day): once the Coolify deploy is
      up, freeze `wsm-second-brain/docs/{prospects.xlsx,outreach-log.md}`
      with a header note pointing at the hub, then re-run
      `pnpm import-legacy --commit` against the real production database
      (the local dev run doesn't count — this needs a fresh empty
      `contacts` table, which the script itself enforces).

## Signup webhook (P2)

- [x] Wire the BazaBooks-side emitter: `databaseHooks.user.create.after`
      POSTs to `https://<hub>/api/ingest/signup`, HMAC-SHA256-signed with a
      shared secret, as a third independent fire-and-forget call alongside
      the existing admin-email/Telegram alerts (pattern P-001 — a failure
      here must never block signup or the other two). Lives in the BazaBooks
      repo, not this one.
      Done 2026-08-03 in `payrush_saas_app` (`src/lib/integrations/clientHub.js`
      + `src/lib/auth.js`, BazaBooks changelog `[3.43.6]`). Verified
      end-to-end against a local hub instance: real signup → hub
      creates/links the contact correctly; replay-as-no-op confirmed
      hub-side; **and** signup still succeeds in ~3s with the hub killed
      mid-request (both the abort-timeout and connection-refused paths
      logged and swallowed, doc 02 §3's acceptance bar). Ships inert —
      no-ops until the env vars below are set.
- [x] Generate a real `INGEST_SECRET_BAZABOOKS` value and set it, plus
      `CLIENT_HUB_URL=https://insaka.nxhub.online`, in **both** apps'
      Coolify env, runtime-only (neither var is build-time/`NEXT_PUBLIC_`
      in either app).
      Done 2026-08-04: fresh secret generated, set on both sides, both
      apps redeployed.
- [x] Once both env vars are set: do one real BazaBooks signup in
      production and confirm it shows up in the hub's Pipeline board
      within a minute.
      Done 2026-08-04: confirmed by William — real production signup
      appeared in the hub, correctly flagged `needs_review` (no matching
      prospect). **P2 is fully live end-to-end.**

## Minor / cosmetic

- [x] One imported contact ended up named `1997-04-01 00:00:00` — a genuine
      glitch in the source Google Contacts export (not a parsing bug),
      harmless but odd if you spot it in the Contacts list.
      Resolved 2026-08-03: William identified the real name as "April 97" —
      likely got auto-converted to a date somewhere in the export/parsing
      pipeline since it reads as a date-like string. Fixed in the local dev
      DB (phone `976961863`, contact id `d0111aa7-7632-48e9-baa0-b8965db0d810`).
      **Still needs fixing at the source**: `prospects.xlsx` row 2's "Full
      Name" column still has the same glitched value — if left as-is, the
      pending production legacy-import run will recreate this exact glitch.
      William to fix directly in `wsm-second-brain/docs/prospects.xlsx`
      (this repo treats that file as read-only, per `CLAUDE.md`).
