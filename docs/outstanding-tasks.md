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

- [ ] Confirm the `ndalamahub` product decision: it's not one of doc 01's 5
      seed products, added because `outreach-log.md` references it directly
      (Clement Mweetwa / Manifi Investments) as its own live app. Reversible,
      but a judgment call the docs didn't spell out — say the word if you'd
      rather fold it into `nexus-web` or `other` instead.
- [ ] Review the ~300 possible-duplicate contact pairs surfaced in
      `scripts/legacy-import-review.md` (regenerate by re-running
      `pnpm import-legacy` — the file is gitignored, real contact PII) and
      merge real dupes via the app's own Merge-contacts tool. Mostly
      Tier-2 phonebook noise (reused/reassigned numbers), not urgent.
- [ ] Add "Astral Media" as a contact by hand — it has no phonebook entry in
      `prospects.xlsx` at all despite repeated `outreach-log.md` mentions, so
      the import couldn't create it.
- [ ] Go-live ritual (doc 04, manual, same day): once the Coolify deploy is
      up, freeze `wsm-second-brain/docs/{prospects.xlsx,outreach-log.md}`
      with a header note pointing at the hub, then re-run
      `pnpm import-legacy --commit` against the real production database
      (the local dev run doesn't count — this needs a fresh empty
      `contacts` table, which the script itself enforces).

## Signup webhook (P2)

- [ ] Wire the BazaBooks-side emitter: `databaseHooks.user.create.after`
      POSTs to `https://<hub>/api/ingest/signup`, HMAC-SHA256-signed with a
      shared secret, as a third independent fire-and-forget call alongside
      the existing admin-email/Telegram alerts (pattern P-001 — a failure
      here must never block signup or the other two). Lives in the BazaBooks
      repo, not this one.
- [ ] Generate a real `INGEST_SECRET_BAZABOOKS` value and set it in both
      apps' Coolify env once deployed (the value in this repo's `.env.local`
      is dev-only, generated for local testing, never shared or reused).
- [ ] Test a real BazaBooks signup end-to-end once both sides are live —
      this session only verified the hub side with hand-crafted curl
      requests against local dev Postgres.

## Minor / cosmetic

- [ ] One imported contact ended up named `1997-04-01 00:00:00` — a genuine
      glitch in the source Google Contacts export (not a parsing bug),
      harmless but odd if you spot it in the Contacts list.
