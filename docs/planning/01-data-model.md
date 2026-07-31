# Client Hub — Data Model

**Status:** PLANNED. Drizzle + Postgres. Table names final; column details may flex at implementation, but the contact/engagement split and the stage machine are locked.

## Entity overview

```
contacts ──< engagements >── products
                 │
                 ├──< interactions
                 ├──< next_actions
                 └──< usage_rollups
ingest_log (standalone raw inbound log)
```

**Locked principle:** stage lives on the *engagement* (contact × product), never on the contact. A person can be an ACTIVE BazaBooks client and a LEAD for the catering scheduler at once (real case: Tasty Food Boutique).

## Tables

### `products`
Seeded reference table, not an enum — new ventures get added by insert, not migration.

| col | type | notes |
|---|---|---|
| id | serial PK | |
| slug | text unique | `bazabooks`, `chama360`, `catering-scheduler`, `nexus-web`, `other` (seed set) |
| name | text | display name |
| active | boolean | hide retired products from UI without deleting history |

### `contacts`

| col | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text not null | canonical name — one row per human/org (see dedup note) |
| company | text | e.g. "Teska Solutions" |
| phone | text | E.164 preferred; primary line |
| phone_alt | text[] | extra MNO lines (Kanyika case: one person, 3 lines) |
| email | text | |
| source | enum | `outreach` \| `referral` \| `inbound` \| `event` \| `social` |
| referred_by | uuid FK → contacts | referral chains (Mulenga → Mathan) are queryable |
| notes | text | free-form standing context |
| created_at / updated_at | timestamptz | |

Dedup rule (learned from Kanyika's 3 phonebook entries): before insert, match on any phone in `phone`/`phone_alt`, then email, then case-insensitive name — surface a "possible duplicate" warning in UI/ZeroClaw rather than hard-block.

### `engagements`
Unique on `(contact_id, product_id)`.

| col | type | notes |
|---|---|---|
| id | uuid PK | |
| contact_id | uuid FK | |
| product_id | int FK | |
| stage | enum | see stage machine below |
| tier | smallint | outreach priority (carries over prospects.xlsx Tier 1/2/3), nullable |
| app_user_id | text | the user's id **inside the app** once signed up — the join key for usage rollups |
| interest_note | text | what they want/asked about ("needs receipts", "SACCO fit unconfirmed") |
| stage_changed_at | timestamptz | powers "stuck in stage X for N days" |
| created_at / updated_at | timestamptz | |

### Stage machine (locked)

```
LEAD → CONTACTED → IN_CONVERSATION → TRIALING → SIGNED_UP → ACTIVE → PAYING
                                                      ↓         ↓        ↓
                                                   DORMANT ←────┴────────┘
any stage → LOST (manual only)          DORMANT → back to ACTIVE on new activity
```

- Automated transitions may only move **forward** (webhook: → SIGNED_UP; rollup job: SIGNED_UP/ACTIVE ↔ DORMANT). Never auto-downgrade otherwise.
- `LOST` is manual-only — a human decision, with a required one-line reason (stored as an interaction).
- `DORMANT` = signed up but no activity events for 30 days (threshold configurable; see usage-tracking PLAN).

### `interactions`
Append-only history — the successor to outreach-log.md entries.

| col | type | notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK | |
| happened_at | timestamptz | when it happened, not when logged |
| channel | enum | `whatsapp` \| `telegram` \| `call` \| `in_person` \| `email` \| `social` \| `system` |
| direction | enum | `outbound` \| `inbound` \| `note` |
| summary | text not null | the prose that currently goes in outreach-log.md |
| created_at | timestamptz | |

`channel = system` is used for auto-logged events (signup webhook received, stage auto-changed) so the timeline shows everything.

### `next_actions`
Kept separate from interactions so the "This Week" view is a single indexed query.

| col | type | notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK | |
| description | text | "Follow up on trial", "Pitch Mathan after SACCO-fit check" |
| due_date | date | |
| status | enum | `open` \| `done` \| `cancelled` |
| completed_at | timestamptz | |

Rule of practice: closing an interaction should prompt "what's the next action?" in the UI — every live engagement should have exactly one open next_action or a deliberate none.

### `usage_rollups`
Written only by `/api/ingest/usage` (see doc 02). Unique on `(product_id, app_user_id, period_date)`.

| col | type | notes |
|---|---|---|
| id | bigserial PK | |
| product_id | int FK | |
| app_user_id | text | matched to engagement via `engagements.app_user_id` |
| period_date | date | the day this rollup summarizes up to |
| last_active_at | timestamptz | |
| counts | jsonb | `{ "invoice.created": {"7d": 3, "30d": 11, "total": 40}, ... }` |
| received_at | timestamptz | |

### `ingest_log`
Raw record of every inbound webhook/API call: `id, source (bazabooks|chama360|zeroclaw|…), endpoint, payload jsonb, status (processed|duplicate|error), error text, received_at`. Serves idempotency checks, debugging, and replay. Prune >12 months.

## Indexes that matter

- `interactions (engagement_id, happened_at desc)` — timeline.
- `next_actions (status, due_date)` — This Week view.
- `engagements (product_id, stage)` — kanban.
- `usage_rollups (product_id, app_user_id, period_date desc)` — latest-rollup lookup.
- `ingest_log (source, received_at desc)`.

## Migration discipline

Same stack as BazaBooks ⇒ same NS-007 exposure. From day one: apply migrations with `drizzle-kit migrate` against the Coolify Postgres **via a tunnel that is confirmed working before the first migration**, or if manual application is unavoidable, update `_journal.json` in the same commit as the applied SQL. Do not let the journal drift.
