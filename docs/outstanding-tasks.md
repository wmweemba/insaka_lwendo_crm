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
- [ ] Re-add "Astral Media" as a contact by hand (again) — it was added
      2026-08-03 via Quick-add, but had to be deleted 2026-08-05 along with a
      throwaway test signup so the go-live import's empty-`contacts`-table
      check would pass. Not in `prospects.xlsx` at all, so the import can't
      recreate it. Details: `Masuzyo`, `+260977284023`, BazaBooks.
- [x] Go-live ritual (doc 04, manual, same day): freeze
      `wsm-second-brain/docs/{prospects.xlsx,outreach-log.md}` with a header
      note pointing at the hub, then re-run `pnpm import-legacy --commit`
      against the real production database.
      Done 2026-08-05. Hit two real problems along the way, both fixed:
      (1) `scripts/import-legacy.ts` hardcoded the source file paths to
      William's local Mac — worked in every local dry run but could never
      have worked against the Coolify container, which only has this one
      repo checked out. Made the paths env-var-overridable
      (`SECOND_BRAIN_PATH`/`PROSPECTS_XLSX_PATH`/`OUTREACH_LOG_PATH`);
      files copied into the container via `scp`+`docker cp` rather than
      committed to this repo, which is **public** on GitHub and the source
      files contain real contact PII.
      (2) The `outreach-log.md` copy that reached the container the first
      time parsed to 0 entries (turned out to be the wrong file entirely —
      131 lines expected, 549 got copied by mistake) — caught via a
      byte-for-byte `shasum`/`wc -l` check before trusting the next attempt,
      not caught in time to avoid one bad `--commit` run first. Since
      `import-legacy.ts` refuses to re-run against a non-empty `contacts`
      table by design, wrote `scripts/backfill-outreach-log.ts` — matches
      log entries against contacts that already exist rather than a
      freshly-parsed xlsx, skips anything already present so it's safe to
      re-run. Ran once the correct file was verified byte-identical
      (checksum-matched): 41 interactions + 9 fallback engagements created.
      **All doc 04 fixtures verified in production afterward**: Kanyika one
      contact with 3 phone lines ✓, Mulenga→Mathan referral link ✓, Tasty
      Food Boutique (stored as "Annette Mazaba") with two engagements —
      BazaBooks `CONTACTED` + catering-scheduler `IN_CONVERSATION` ✓, Jay at
      `SIGNED_UP` ✓, `ndalamahub` product row exists ✓. Totals: 3407
      contacts, 37 engagements, 41 interactions. **P1 is done — the hub is
      now the sole source of truth**, per doc 00's handover rule.

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

## Agent API

- [ ] Deploy: generate a real `AGENT_API_KEY_CLAUDE` value
      (`openssl rand -hex 32`) and set it in Coolify's env for this app,
      runtime-only. Redeploy. Built and verified locally 2026-08-05 (see
      changelog) but not yet usable in production without this — no key
      configured means Claude can't authenticate against the live app at
      all yet.
- [ ] Whenever Hermes and/or a ZeroClaw instance are ready to use this:
      generate `AGENT_API_KEY_HERMES` / `AGENT_API_KEY_ZEROCLAW` the same
      way, one key per caller, set in this app's Coolify env only (nothing
      needed on their side beyond having the key). No code change required
      either way — see CLAUDE.md's "Agent API" section.

## Minor / cosmetic

- [x] One imported contact ended up named `1997-04-01 00:00:00` — a genuine
      glitch in the source Google Contacts export (not a parsing bug),
      harmless but odd if you spot it in the Contacts list.
      Resolved 2026-08-03: William identified the real name as "April 97" —
      likely got auto-converted to a date somewhere in the export/parsing
      pipeline since it reads as a date-like string. Fixed in the local dev
      DB (phone `976961863`, contact id `d0111aa7-7632-48e9-baa0-b8965db0d810`).
      Source fixed by William 2026-08-04 (`prospects.xlsx` row ~740 now reads
      "April Zaloumis 97") before the 2026-08-05 production import ran, so
      the glitch was not recreated there.
