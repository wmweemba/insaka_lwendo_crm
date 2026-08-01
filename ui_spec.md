# Insaka Lwendo CRM — UI Spec

> Load this alongside `CLAUDE.md` and `docs/planning/00–04` at the start of any UI-building session. This file is the single source of truth for color, type, layout, motion, and component style. Do not invent visual patterns beyond what's here — if a gap shows up mid-build, note it in the "Open questions / v2" section at the bottom and keep moving.

**Status:** v1.0 — ready for P0-S1 onward.

---

## 0. Design thesis

**Insaka Lwendo** is named for the *insaka* — the circular, open-sided, thatch-roofed gathering hut found across Zambian villages, built on wooden poles around a central fire, where elders and family meet to talk through the things that matter. No doors, no walls to hide behind — just a circle, a fire, and the people who showed up.

That's what this CRM is: William's one gathering place for every lead, every product, every conversation, instead of scattered across WhatsApp threads and spreadsheet tabs. The design should feel like **sitting at the insaka at dusk** — dark, warm, firelit, circular — not like a generic dark-mode SaaS dashboard that happens to have an orange button.

**Signature element:** *Firelight glass* — translucent, warm-tinted glass surfaces that look lit from a single source below/behind them, as if the hearth in the middle of the insaka is casting glow up onto the underside of the thatch. This is the one distinctive, consistent visual idea everything else stays quiet around. Cards don't just float on a dark background — they catch light from the center.

**Temperature metaphor for pipeline stage:** a lead's engagement stage is shown as *how close it is to the fire* — cool ash tones at `LEAD`, warming through `CONTACTED` → `IN_CONVERSATION` → `TRIALING`, to full ember/flame at `SIGNED_UP` → `ACTIVE` → `PAYING`. `DORMANT` is embers gone cold (blue-grey). `LOST` is ash-red, spent. This gives the pipeline board an intuitive, non-arbitrary color logic instead of a random categorical palette (see §7.2).

---

## 1. Color system

Dark mode is the primary/default experience (this is an evening-hours, low-light tool by William's own stated time budget — 8–11pm). Light mode is a fully-supported toggle, not an afterthought, for daytime use.

All values are CSS custom properties, defined once in `globals.css` and consumed via Tailwind v4's `@theme` directive — never hardcode hex values in components.

### 1.1 Dark mode (default)

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#161210` | App background — deep espresso-charcoal, not pure black (pure black kills the "firelit" feel) |
| `--color-bg-raised` | `#1E1916` | Sidebar, header, raised chrome |
| `--color-surface` | `#241E1A` | Base card/panel fill before glass effect |
| `--color-surface-glass` | `rgba(232, 98, 44, 0.06)` | Glass tint overlay on cards — warm ember, barely-there |
| `--color-border` | `#332B25` | Default hairline border |
| `--color-border-glow` | `rgba(232, 98, 44, 0.35)` | Border on hover/active/focused cards |
| `--color-text` | `#F5EFE8` | Primary text — warm off-white, not clinical white |
| `--color-text-muted` | `#A89A8C` | Secondary text, timestamps, labels |
| `--color-text-faint` | `#6E6259` | Disabled, placeholder |
| `--color-accent` | `#E8622C` | Ember — primary actions, active nav, focus rings |
| `--color-accent-hover` | `#FF7A3D` | Hover state on accent elements |
| `--color-accent-soft` | `rgba(232, 98, 44, 0.14)` | Accent-tinted backgrounds (badges, selected rows) |
| `--color-gold` | `#C9A227` | Secondary accent — tier badges, `PAYING` state, highlights that shouldn't compete with primary CTA orange |

### 1.2 Light mode

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#F7F2EA` | Warm parchment/cream, not clinical white |
| `--color-bg-raised` | `#FFFFFF` | Sidebar, header |
| `--color-surface` | `#FFFFFF` | Card fill |
| `--color-surface-glass` | `rgba(232, 98, 44, 0.05)` | Same glass logic, lighter touch |
| `--color-border` | `#E6DDD0` | Hairline border |
| `--color-border-glow` | `rgba(200, 84, 32, 0.30)` | Hover/active border |
| `--color-text` | `#2A211B` | Primary text — warm espresso, not pure black |
| `--color-text-muted` | `#6E6259` | Secondary text |
| `--color-text-faint` | `#A89A8C` | Disabled/placeholder |
| `--color-accent` | `#C8541F` | Ember, deepened for AA contrast on light bg |
| `--color-accent-hover` | `#A8451A` | Hover |
| `--color-accent-soft` | `rgba(200, 84, 32, 0.10)` | Accent-tinted backgrounds |
| `--color-gold` | `#A8801E` | Secondary accent, deepened for contrast |

### 1.3 Semantic / status colors (same in both modes, adjust lightness only if contrast fails)

| Token | Hex | Use |
|---|---|---|
| `--color-danger` | `#C84B3C` | Overdue, `LOST` reason prompts, delete actions |
| `--color-danger-soft` | `rgba(200, 75, 60, 0.14)` | Overdue row backgrounds |
| `--color-success` | `#7A9B5E` | Sage green — confirmations, `PAYING` success toasts. Deliberately not a generic SaaS green — muted, earthy |
| `--color-warning` | `#D4A24C` | "Gone quiet," dormant warnings |
| `--color-info` | `#7C93A8` | Neutral system/info messages |

### 1.4 Why not the "AI default" palettes

Explicitly avoiding: (a) warm-cream-and-terracotta serif look (reads as generic "AI-generated" and coincidentally close to Anthropic's own accent), (b) near-black with a single acid-green/vermilion accent, (c) zero-radius broadsheet layout. This palette is warmer and more saturated than (a), rounder and more textured than (b) and (c) — deliberately, because the insaka is round, warm, and textured by nature.

---

## 2. Typography

Three roles, per `frontend-design` convention — a characterful display face used with restraint, a body/data face, and a mono face for identifiers/numbers.

| Role | Font | Weight(s) | Tracking | Use |
|---|---|---|---|---|
| **Display** | Montserrat | 700–800 | +0.04em, uppercase | Page titles, section headers ("THIS WEEK", "PIPELINE"), empty-state headlines, the product wordmark |
| **Body / UI** | Inter | 400–600 | normal | All UI chrome, form labels, table cells, timeline text, buttons |
| **Mono** | JetBrains Mono | 400–500 | normal | Phone numbers, IDs, timestamps, `app_user_id`, counts in usage rollups |

Load via `next/font` (self-hosted, no runtime Google Fonts fetch — keeps CSP `connect-src` locked to `'self'` per the existing security baseline).

### Type scale (rem, mobile-first — scale up ~15% at `lg`+ for display only)

| Token | Size | Line-height | Role |
|---|---|---|---|
| `--text-display-lg` | 2.25rem / 2.6rem at lg+ | 1.1 | Screen title ("THIS WEEK") |
| `--text-display-sm` | 1.5rem | 1.2 | Section header, contact name on detail screen |
| `--text-body-lg` | 1rem | 1.5 | Primary body, card titles |
| `--text-body` | 0.875rem | 1.5 | Default UI text, table cells |
| `--text-body-sm` | 0.75rem | 1.4 | Labels, meta, timestamps |
| `--text-mono` | 0.8125rem | 1.4 | Mono role, all sizes |

**Rule:** display face is uppercase only, used for headers and section eyebrows — never for body copy, button labels, or table data. Buttons use Inter, 600 weight, sentence case ("Log interaction," "Save changes") per the interface-voice convention in §8.

---

## 3. Layout & navigation

### 3.1 Breakpoints (Tailwind v4 defaults — no custom breakpoints needed)

`sm` 640px · `md` 768px · `lg` 1024px · `xl` 1280px. Mobile-first build order per component.

### 3.2 Desktop (`lg`+)

- **Left sidebar**, fixed, 240px wide, `--color-bg-raised`. Product wordmark + collapse toggle at top. Nav items: This Week, Pipeline, Contacts, Quick-add (also reachable via `⌘K`/keyboard shortcut per doc 03). Active item gets a left-edge **vertical accent bar** (2px, `--color-accent`, glowing) — a deliberate nod to the insaka's support poles: each nav destination is "a pole holding up the roof."
- **Top bar** within main content area only (not full-width): breadcrumb/screen title in display type, right-aligned light/dark toggle + admin avatar.
- **Content area** max-width 1280px, centered, with generous side padding (`px-8`) — the insaka is a circle with room to sit, not a cramped grid.

### 3.3 Mobile (`< lg`)

- **Bottom tab bar**, fixed, `--color-bg-raised`, frosted-glass blur over content that scrolls beneath it. 4 tabs: This Week (home), Pipeline, Contacts, Quick-add (center tab, visually raised/circular — the one-tap "add a lead from the phone" action doc 00 calls out as the core mobile success criterion).
- **No sidebar, no hamburger** — everything reachable in one tap from the tab bar, consistent with the "single operator, small contact count" scale doc 00 establishes.
- Screens stack full-width, single column. This Week and Quick-add are the two screens doc 03 explicitly calls mobile-first — build and test those at 375px width before anything else.

---

## 4. Surface & elevation system — "Firelight glass"

This is the signature element (§0). Applies to: kanban cards, dashboard/metric cards, contact detail panels, modals. Does **not** apply to: tables (flat, for scanability), form inputs (flat, for clarity), the sidebar/tab bar (solid, they're chrome not content).

### 4.1 Glass card recipe

```css
.card-glass {
  background: var(--color-surface);
  background-image: radial-gradient(
    ellipse at 50% 120%,
    var(--color-surface-glass),
    transparent 70%
  );
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: 1rem; /* 16px — see §4.2 */
  transition: border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
}

.card-glass:hover {
  border-color: var(--color-border-glow);
  box-shadow: 0 0 24px -8px var(--color-accent-soft);
  transform: translateY(-2px);
}
```

The radial gradient origin is always **bottom-center** — light comes from below, like a fire in the middle of the floor casting glow upward onto the underside of a card. This is the one rule to keep consistent everywhere the effect is used; don't vary the gradient direction card-to-card.

### 4.2 Radius scale

Circular/rounded throughout — never sharp corners, echoing the insaka's circular architecture.

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 0.5rem | Inputs, small buttons, badges |
| `--radius-md` | 1rem | Cards, modals |
| `--radius-lg` | 1.5rem | Large panels, the Quick-add sheet |
| `--radius-full` | 9999px | Avatars, pills, stage badges, the mobile center tab button |

### 4.3 Elevation (shadow) scale

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.3)` | Resting cards |
| `--shadow-md` | `0 4px 16px -4px rgba(0,0,0,0.4)` | Dropdowns, popovers |
| `--shadow-glow` | `0 0 24px -8px var(--color-accent-soft)` | Hover/active glass cards, primary CTA |

---

## 5. Motion system

**Library: Motion (`motion` npm package, `import ... from "motion/react"`).** This is the current name/package for what was Framer Motion — same authors, same API family, `framer-motion` is now just a legacy alias pointing at the same code. Confirmed choice given the kanban drag interaction (doc 03 — "drag between columns = stage change") needs real spring physics, and the scroll-reveal/hover-transition direction chosen in §0 needs orchestration beyond what CSS alone handles cleanly in React Server Components + client islands.

**Split responsibility, deliberately:** whole-*route* transitions (§5.1) and everything *within* a screen (§5.2–§5.4) use two different mechanisms, not one library doing everything. App Router unmounts/streams route content server-side in a way that fights `AnimatePresence`-style exit animations unless heavily scaffolded — so route-level fade/rise uses Next's native View Transitions support instead, and Motion is scoped to the interactive, client-side moments it's actually built for: drag physics, scroll-triggered reveals, orchestrated stagger. This keeps Motion's client-component footprint small (per §10) and avoids fighting the framework for an effect the platform now does natively.

**Principle from the reference videos:** the motion you responded to was card/page transitions — scroll reveals and hover states — not flashy micro-interaction gimmicks. Keep animation **purposeful and restrained**: one orchestrated moment per screen, not scattered effects on every element. Respect `prefers-reduced-motion` everywhere (disable transforms, keep opacity fades only).

### 5.1 Page transitions — native View Transitions, not Motion

- Enable Next's `experimental.viewTransition` config flag (App Router). Route change: content fades + rises 8px over 200ms, ease-out, driven by the browser's native View Transitions API via Next's integration — no client-side animation library in the critical path of navigation.
- No slide transitions (feels heavy on mobile).
- Fallback: browsers without View Transitions support (rare by now, but Safari lagged historically) simply get an instant swap — no broken animation, just no transition. Don't polyfill.
- This Week screen on load: sections (Overdue → Due this week → Fresh signups → Gone quiet) reveal in a staggered fade-up, 60ms stagger between sections, via Motion's `whileInView`/stagger — the one "orchestrated moment" per §0, since this is the screen William opens first every session. This is a within-screen effect, not a route transition, so it's Motion's job, not View Transitions'.

### 5.2 Card hover (desktop only — no hover state to fake on touch)

- `translateY(-2px)` + border glow + shadow-glow, 200ms ease, per §4.1. That's the whole vocabulary — don't add scale, rotation, or color shifts on top of it.

### 5.3 Kanban drag (Pipeline board)

- Use Motion's `Reorder` / drag primitives with spring physics: `{ stiffness: 400, damping: 30 }`.
- Dragged card: scale to 1.03, shadow-glow intensifies, slight rotation (2deg) toward drag direction for tactile feedback.
- Drop into `LOST` column: card doesn't just land — the required-reason prompt (doc 01) slides up as a bottom sheet on mobile / modal on desktop, blocking the drop until a reason is entered or the drag is cancelled.
- Stage change that reaches `SIGNED_UP` or beyond: a brief warm pulse (scale 1 → 1.05 → 1, 400ms) on the card — the "fire catching" moment. Do this once, don't repeat it on every re-render.

### 5.4 Micro-interactions

- Buttons: background/border color transition only, 150ms — no scale-bounce (that reads as templated AI-generated polish per the frontend-design skill's warning).
- Toggle (light/dark): the switch itself can have a small sun/ember → moon crossfade icon transition, 250ms — this is the one place a slightly playful detail earns its keep, since it's a single, contained, infrequent interaction.
- Toasts (e.g., "Signed up in bazabooks," "Changes saved"): slide up from bottom on mobile, slide in from top-right on desktop, 250ms, auto-dismiss 4s.

---

## 6. Iconography

- **Library:** `lucide-react` (already available in the stack). Stroke width 1.75, not the default 2 — slightly warmer/softer line weight to match the glass/blur aesthetic rather than a harder technical look.
- **Icon-only exception:** where an icon needs the insaka motif specifically (empty states, the Quick-add center tab, onboarding), use a custom simple SVG — a minimal circular hut silhouette or radiating fire-glow mark — rather than forcing a generic Lucide icon to carry cultural meaning it can't. Keep these custom marks to a handful of specific spots, not scattered everywhere.
- **Channel icons** (interactions table — whatsapp/telegram/call/in_person/email/social/system): Lucide equivalents (`MessageCircle`, `Send`, `Phone`, `Users`, `Mail`, `Share2`, `Settings`) at `--text-body-sm` size, `--color-text-muted`, inline before each timeline entry.

---

## 7. Component patterns by screen

Mapped directly to doc `03-ui-and-dashboard.md` — build in this order, matches build phase P0–P3.

### 7.1 This Week (home)

- Mobile-first, single column, sections in the fixed order from doc 03.
- **Overdue** section: each row on `--color-danger-soft` background tint, left border 3px `--color-danger`. Days-overdue shown in mono type, right-aligned.
- **Metrics strip**: 4 numbers, top of page (desktop: horizontal row of 4 glass cards; mobile: horizontal scroll-snap row, one card ~80% viewport width so the next peeks in — signals scrollability without a label).
- One-tap actions (done/reschedule/log interaction) render as a horizontal icon-button row on the right of each card on desktop, and as a swipe-reveal on mobile (swipe left reveals the three actions) — standard mobile CRM pattern, keeps rows compact.

### 7.2 Pipeline board

- Product switcher: tabs styled as the display-type eyebrow row, active tab gets the same vertical-accent-bar treatment as sidebar nav (§3.2) for visual consistency between the two "which context am I in" controls.
- **Stage columns use the temperature palette from §0**, applied as a **top border stripe (3px) on each column header**, not a full-column background wash (a full wash per column would be visually loud across 8 columns) — the individual **cards** carry a small stage-color dot/badge (§7.2 table below) so color-coding is legible at the card level while the column stripe gives at-a-glance orientation.

| Stage | Color token | Hex |
|---|---|---|
| LEAD | `--color-text-faint` (ash) | `#6E6259` |
| CONTACTED | tan | `#B08D57` |
| IN_CONVERSATION | amber | `#D4A24C` |
| TRIALING | warm orange | `#E8934A` |
| SIGNED_UP | ember (accent) | `#E8622C` |
| ACTIVE | hot ember | `#F2551C` |
| PAYING | flame (gold-accent) | `#FFA542` |
| DORMANT | cold ember (blue-grey) | `#5B6B73` |
| LOST | ash-red | `#7A3B32` |

- Card: glass style (§4.1), name + company in body-lg, tier badge (gold, pill, §4.2) top-right, days-in-stage in mono muted text, next-action date in `--color-danger` if overdue else `--color-text-muted`.
- "All" table view: flat (no glass), zebra-free (relies on hairline row borders, `--color-border`), sticky header, CSV export button top-right in display-type button style.

### 7.3 Contact detail

- Header: circular avatar (initial-based if no photo — background color derived deterministically from name hash across the temperature palette, so avatars have variety without needing real photos).
- Referral chain shown as a small horizontal breadcrumb with connecting line — literal "who brought who to the fire."
- One glass engagement-panel per product, stage shown as a pill badge in that stage's color.
- **Unified timeline**: vertical line down the left (like a pole), interaction dots on the line, `system`-channel entries rendered smaller/muted (per doc 03 — "visually muted") with a dashed rather than solid connector to the line.
- Inline "log interaction" composer: flat input (not glass — this is a data-entry moment, wants clarity not decoration), ends with the required "next action?" prompt per doc 01's rule of practice.

### 7.4 Quick-add lead

- Mobile: bottom sheet, slides up, `--radius-lg` top corners only, glass background.
- Desktop: centered modal, same radius/glass treatment, `⌘K`-triggered.
- Success state: brief warm pulse (§5.3 pattern reused) + "Add next action now" secondary CTA, per doc 03.

---

## 8. Voice & content in the UI

Per the `frontend-design` skill's writing guidance, applied specifically here:

- Buttons name the action, sentence case: "Log interaction," "Move to Lost," "Merge contacts" — never "Submit" or "OK."
- A button's label matches its resulting toast: "Save changes" → "Changes saved." "Merge contacts" → "Contacts merged."
- Empty states are invitations, not apologies: Pipeline board with no leads yet reads "No one's at the fire yet — add your first lead" (light, on-brand, not overwrought) with the Quick-add CTA directly beneath. Use this tone sparingly — once or twice, not on every empty state, or it curdles.
- Errors state what happened and what to do, plainly: "Couldn't save — check your connection and try again," not "Oops! Something went wrong 😅."

---

## 9. Accessibility & quality floor

- All color pairings in §1 meet WCAG AA (4.5:1 body text, 3:1 large text/UI components) — verify `--color-text-muted` against both `--color-bg` and `--color-surface` specifically, as glass surfaces shift effective contrast.
- Stage color-coding (§7.2) is never the only signal — always paired with the stage name as text (badge label) so it isn't lost on colorblind users.
- Visible keyboard focus ring on every interactive element: 2px `--color-accent`, offset 2px, no exceptions for "it looks cleaner without it."
- `prefers-reduced-motion: reduce` — disable all transform-based animation (drag physics excepted, since it's functionally necessary, but strip the decorative pulse/glow effects).
- Touch targets minimum 44×44px on mobile (bottom tab bar, swipe-action buttons, kanban card tap zones).

---

## 10. Implementation notes

- Define all tokens in `src/app/globals.css` under `@theme` (Tailwind v4 convention) so `bg-accent`, `text-muted`, etc. are available as utility classes directly — don't scatter raw CSS variables through component files.
- Light/dark toggle: class-based (`.dark` on `<html>`), persisted via a cookie (not `localStorage`, which isn't available/reliable in all contexts) so it survives server-rendered first paint without flash.
- Glass effect (`backdrop-filter: blur()`) has real performance cost with many cards on screen at once (Pipeline board can have dozens) — test board performance early in P0-S3. Mitigations in order of preference before abandoning the effect: (1) add `contain: layout paint` to `.card-glass` to scope repaint cost per card, (2) render blur only for cards actually in viewport (virtualize the column if a product's lead count grows large), (3) fall back to a cheaper static-gradient version of the glass look for card *lists* and reserve true backdrop-blur for single-card contexts (modals, contact detail panel) only if (1)–(2) aren't enough.
- Motion: keep drag-related and scroll-reveal client components (`'use client'`) as small and low as possible in the tree — Pipeline board columns/cards, This Week's section wrapper — not the whole page, to preserve Next.js App Router server-component benefits elsewhere.
- View Transitions (§5.1) needs no client component at all — it's a Next config flag plus CSS, so it costs nothing in the server/client component split.

---

## Open questions / v2

*(Flag to William rather than deciding unilaterally if these come up mid-build — per the CLAUDE.md convention.)*

- Real logo/wordmark for "Insaka Lwendo" — this spec assumes a text wordmark in display type for now; a custom mark (the circular hut/fire motif from §6) could replace it later.
- Whether the "temperature" stage-color logic (§7.2) needs a colorblind-safe alternate palette toggle — current mitigation is text labels always present (§9), revisit only if it's actually reported as a problem.
- Data-viz styling (charts) isn't covered here since doc 03 explicitly defers charts/reporting beyond the metrics strip — write a §11 when/if that's built.
