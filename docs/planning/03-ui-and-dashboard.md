# Client Hub — UI & Dashboard

**Status:** PLANNED. Four screens. Anything not listed here is out of v1.

## Screen 1 — "This Week" (home)

The screen that replaces the weekly spreadsheet cross-referencing session. Sections, top to bottom:

1. **Overdue next actions** — red, sorted oldest-first. Each row: contact, product, action, days overdue, one-tap "done / reschedule / log interaction".
2. **Due this week** — same row format.
3. **Fresh signups needing follow-up** — engagements that hit `SIGNED_UP` in the last 7 days with no outbound interaction since signup (the "Jay just signed up — go say hi" prompt).
4. **Gone quiet** — `SIGNED_UP`/`ACTIVE` engagements with `last_active_at` > 14 days (pre-DORMANT early warning), plus anything auto-moved to `DORMANT` since last visit.
5. **Metrics strip** (top of page, four numbers): new leads this month · signups this month · active clients per product · open next actions.

Mobile-first layout — this page and quick-add are the two phone surfaces.

## Screen 2 — Pipeline board

- Product switcher (tabs: BazaBooks / Chama360 / Catering / Nexus Web / All).
- Kanban columns = stages (doc 01 machine). Card: name, company, tier badge, days-in-stage, next-action date (red if overdue).
- Drag between columns = stage change; `LOST` drop prompts for the required reason.
- "All" view is a filterable table instead of a board (name, product, stage, tier, last interaction, next action) with CSV export.

## Screen 3 — Contact detail

- Header: identity, phones (incl. alt lines), email, source, referred-by (link) and referred (links) — the referral chain visible both directions.
- One engagement panel per product: stage (editable), tier, interest note, app account link status, usage summary when rollups exist (last active, 7d/30d key counts).
- **Unified timeline** below: interactions across *all* engagements interleaved by `happened_at`, system events included but visually muted. Inline "log interaction" composer that ends with the "next action?" prompt (doc 01 rule).
- Merge-duplicates action (fold contact B into A: re-point engagements/interactions, union phones into `phone_alt`, delete B) — needed day one because import will produce some dupes.

## Screen 4 — Quick-add lead

As specified in doc 02 §1. Also reachable via keyboard shortcut on desktop. Success screen offers "add next action now".

## Deliberately not building

No reporting/charts beyond the metrics strip (revisit only if a real weekly question goes unanswered). No tags/custom fields v1 — `interest_note` + `notes` carry nuance until proven insufficient. No dark-pattern gamification, no activity feed, no search-everything bar v1 (table filter suffices at this scale). No settings UI — config is env vars + seed data.
