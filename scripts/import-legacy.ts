// One-time legacy import, doc 02 §2 / doc 04 P1. Reads the two frozen-at-import
// sources from wsm-second-brain (read-only — never written to by this script;
// freezing them with a header note is a manual go-live ritual for William, not
// automated here) and loads them into contacts/engagements/interactions.
//
// Two stages, per doc 02: parse -> review -> commit.
//   pnpm tsx scripts/import-legacy.ts            (dry run — prints/writes review only)
//   pnpm tsx scripts/import-legacy.ts --commit    (writes inside one transaction)
//
// Review output: console summary + scripts/legacy-import-review.md (gitignored
// scratch file — regenerate by re-running, don't hand-edit).

import { readFileSync, writeFileSync } from "node:fs";
import { utils, read } from "xlsx";
import { db } from "@/db";
import { products, contacts, engagements, interactions } from "@/db/schema";
import type { engagementStageEnum, interactionChannelEnum } from "@/db/schema";
import { eq, count } from "drizzle-orm";

const SECOND_BRAIN = "/Users/williammweemba/Dev_Projects/wsm-second-brain";
const PROSPECTS_XLSX = `${SECOND_BRAIN}/docs/prospects.xlsx`;
const OUTREACH_LOG = `${SECOND_BRAIN}/docs/outreach-log.md`;

const COMMIT = process.argv.includes("--commit");

type Stage = (typeof engagementStageEnum.enumValues)[number];
type Channel = (typeof interactionChannelEnum.enumValues)[number];

// ---------------------------------------------------------------------------
// Product Fit (xlsx free text) -> products.slug. Only BazaBooks/Chama360 map
// 1:1 onto an existing seed slug. "Web Design/Hosting" is exactly what the
// "nexus-web" seed slug means (doc 00: "Nexus web clients"). "NdalamaHub"
// doesn't match any seed slug — it's referenced in outreach-log.md (Clement
// Mweetwa) as its own live app, not folded into Nexus's client web/hosting
// work, so this script adds it as a new product row (products is designed to
// grow by insert, doc 01) rather than dumping it into "other". FLAG FOR
// WILLIAM: confirm this reads right — reversible (just a reference row) but
// it's a judgment call the docs don't spell out.
const PRODUCT_FIT_TO_SLUG: Record<string, string> = {
  bazabooks: "bazabooks",
  chama360: "chama360",
  "web design/hosting": "nexus-web",
  ndalamahub: "ndalamahub",
};

const NEW_PRODUCTS = [{ slug: "ndalamahub", name: "NdalamaHub" }];

// Outreach Status (xlsx dropdown + a few free-text variants actually used) ->
// stage, per doc 02's stage-inference rule ("when ambiguous, choose the
// earlier stage").
const STATUS_TO_STAGE: Record<string, Stage> = {
  "not started": "LEAD",
  "marked for coming week": "LEAD",
  contacted: "CONTACTED",
  responded: "CONTACTED", // Legend: "replied but no clear direction" — earlier stage
  "stalled / went quiet": "CONTACTED",
  "in discussion": "IN_CONVERSATION",
  "trial / testing": "TRIALING",
  converted: "SIGNED_UP",
  "signed up": "SIGNED_UP", // free-text variant actually used in the sheet
  "not interested": "LOST",
};

// ---------------------------------------------------------------------------
// Phone normalization. Zambian numbers only get their leading 0 rewritten to
// 260 — everything else (USSD shortcodes, foreign numbers, garbage) is kept
// verbatim rather than guessed at.
function splitPhoneCell(raw: unknown): string[] {
  if (!raw) return [];
  return String(raw)
    .split(":::")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizePhone(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (trimmed.startsWith("+260") && digits.length === 12) return digits;
  if (/^0[0-9]{9}$/.test(trimmed.replace(/\s/g, ""))) {
    return "260" + trimmed.replace(/\s/g, "").slice(1);
  }
  if (/^260[0-9]{9}$/.test(digits) && digits.length === 12) return digits;
  return trimmed; // USSD codes, foreign numbers, malformed entries — left as-is
}

function dedupKey(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 9) return "260" + digits;
  return digits;
}

// ---------------------------------------------------------------------------
// xlsx row shape (see docs/planning/02-capture-and-integrations.md §2)
type XlsxRow = {
  tier: number | null;
  fullName: string;
  orgName: string | null;
  sector: string | null;
  productFit: string | null;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  outreachStatus: string | null;
  priority: string | null;
  lastContactDate: string | null; // ISO date
  sourceNotes: string | null;
  internalNotes: string | null;
};

function readProspectsXlsx(): XlsxRow[] {
  const wb = read(readFileSync(PROSPECTS_XLSX), { type: "buffer", cellDates: true });
  const sheet = wb.Sheets["Prospects"];
  const raw = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  return raw.map((r) => ({
    tier: (r["Tier"] as number) ?? null,
    fullName: String(r["Full Name"] ?? "").trim(),
    orgName: (r["Organization Name"] as string) ?? null,
    sector: (r["Sector"] as string) ?? null,
    productFit: (r["Product Fit"] as string) ?? null,
    phone1: (r["Phone 1"] as string) ?? null,
    phone2: (r["Phone 2"] as string) ?? null,
    email: (r["Email"] as string) ?? null,
    outreachStatus: (r["Outreach Status"] as string) ?? null,
    priority: (r["Priority"] as string) ?? null,
    lastContactDate:
      r["Last Contact Date"] instanceof Date
        ? (r["Last Contact Date"] as Date).toISOString()
        : null,
    sourceNotes: (r["Source Notes (from Google contact)"] as string) ?? null,
    internalNotes: (r["Internal Notes"] as string) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Canonical contact after duplicate-merge. One xlsx row usually becomes one of
// these; explicitly-flagged duplicates (Internal Notes containing the word
// "DUPLICATE" — the sheet already hand-annotates these, e.g. Kanyika's 3
// phonebook lines) get merged into the row they name as canonical, and a
// second silent-duplicate pass merges any remaining rows that still end up
// sharing a phone number.
type CanonicalContact = {
  name: string;
  company: string | null;
  email: string | null;
  phones: string[]; // normalized, first is primary
  sourceNotes: string | null;
  rows: XlsxRow[]; // all xlsx rows folded into this contact, for engagement building
};

function buildCanonicalContacts(rows: XlsxRow[]): {
  contacts: CanonicalContact[];
  unresolvedDuplicateNotes: XlsxRow[];
  possiblePhoneDuplicates: Array<[CanonicalContact, CanonicalContact]>;
} {
  const duplicateRows: XlsxRow[] = [];
  const primaryRows: XlsxRow[] = [];

  for (const r of rows) {
    if (r.internalNotes && /duplicate/i.test(r.internalNotes)) {
      duplicateRows.push(r);
    } else {
      primaryRows.push(r);
    }
  }

  const canonical = new Map<XlsxRow, CanonicalContact>();
  for (const r of primaryRows) {
    canonical.set(r, {
      name: r.fullName,
      company: r.orgName,
      email: r.email,
      phones: [...splitPhoneCell(r.phone1), ...splitPhoneCell(r.phone2)].map(normalizePhone),
      sourceNotes: r.sourceNotes,
      rows: [r],
    });
  }

  const unresolvedDuplicateNotes: XlsxRow[] = [];
  for (const dupRow of duplicateRows) {
    const match = dupRow.internalNotes?.match(/same person as ['"]([^'"]+)['"]/i);
    const targetName = match?.[1]?.toLowerCase();
    const target = targetName
      ? [...canonical.values()].find((c) => c.name.toLowerCase().includes(targetName))
      : undefined;

    if (target) {
      target.phones.push(...[...splitPhoneCell(dupRow.phone1), ...splitPhoneCell(dupRow.phone2)].map(normalizePhone));
      target.rows.push(dupRow);
    } else {
      unresolvedDuplicateNotes.push(dupRow);
      // Fall back to importing it standalone rather than dropping data.
      canonical.set(dupRow, {
        name: dupRow.fullName,
        company: dupRow.orgName,
        email: dupRow.email,
        phones: [...splitPhoneCell(dupRow.phone1), ...splitPhoneCell(dupRow.phone2)].map(normalizePhone),
        sourceNotes: dupRow.sourceNotes,
        rows: [dupRow],
      });
    }
  }

  // Rows sharing a phone number that were NOT hand-flagged "DUPLICATE" are
  // reported, never auto-merged — the source data has real cases of two
  // different people sharing a (likely reassigned) number (e.g. "Jason Mfula
  // II" and "Jay Mumba Photography" both saved against the same line), and
  // doc 01's dedup rule is explicitly "surface a warning, never a hard
  // merge/block." Silently merging on phone alone would have overwritten
  // Jay's SIGNED_UP fixture with an unrelated contact's name.
  const byPhoneKey = new Map<string, CanonicalContact>();
  const possiblePhoneDuplicates: Array<[CanonicalContact, CanonicalContact]> = [];

  for (const c of canonical.values()) {
    for (const p of c.phones) {
      const key = dedupKey(p);
      if (!key) continue;
      const existing = byPhoneKey.get(key);
      if (existing && existing !== c) {
        possiblePhoneDuplicates.push([existing, c]);
      } else {
        byPhoneKey.set(key, c);
      }
    }
  }

  const merged = [...canonical.values()];
  for (const c of merged) {
    c.phones = [...new Set(c.phones)];
  }

  return { contacts: merged, unresolvedDuplicateNotes, possiblePhoneDuplicates };
}

// ---------------------------------------------------------------------------
// Named fixtures doc 04 calls out explicitly, where a flat one-row-one-engagement
// mapping is wrong (Multiple product fits that split into real per-product
// stages, and referral chains that only exist as prose in the source data).
// Everything NOT listed here goes through the generic single-engagement path.
type FixtureEngagement = {
  productSlug: string;
  stage: Stage;
  tier: number | null;
  interestNote: string;
  stageChangedAt?: string;
};

const FIXTURE_ENGAGEMENTS: Record<string, FixtureEngagement[]> = {
  "annette mazaba (saved as: aunt annette)": [
    {
      productSlug: "bazabooks",
      stage: "CONTACTED",
      tier: 1,
      interestNote:
        "Already uses Zoho for invoicing/bookkeeping; conversation pivoted to the catering-scheduler concept instead of continuing the BazaBooks pitch.",
    },
    {
      productSlug: "catering-scheduler",
      stage: "IN_CONVERSATION",
      tier: 1,
      stageChangedAt: "2026-07-13",
      interestNote:
        "Discovery call held 2026-07-13 (Tasty Food Boutique). Pain: order tracking/planning around custom per-order items; wants the always-available shared dashboard with role-based access (baking understudy shouldn't see customer contact details). See docs/outreach-log.md.",
    },
  ],
  "grace kalele mfin": [
    {
      productSlug: "bazabooks",
      stage: "CONTACTED",
      tier: 1,
      interestNote: "Originally approached as a BazaBooks prospect; conversation pivoted to Chama360.",
    },
    {
      productSlug: "chama360",
      stage: "IN_CONVERSATION",
      tier: 1,
      stageChangedAt: "2026-07-31",
      interestNote:
        'Member of a "Grocery Chilimba" (grocery-pool chama). Demo held 2026-07-30 with the group\'s exec — app covers ~85-90% of what they do; gaps are interest-percentage handling and fines. Group confirmed for trial + conversion to paid.',
    },
  ],
};

// Referral chains that only exist as prose — canonical-contact-name (lowercased,
// substring match) -> the name of the contact they referred.
const REFERRAL_LINKS: Array<{ referrerName: string; referredName: string }> = [
  { referrerName: "mulenga bwalya", referredName: "mathan" },
  { referrerName: "julie mwamba", referredName: "chairperson" },
];

// ---------------------------------------------------------------------------
// outreach-log.md parsing

type LogEntry = {
  date: string;
  name: string;
  product: string | null; // resolved slug, or null if not recognized
  summary: string;
  direction: "outbound" | "inbound";
  channel: Channel;
};

function guessChannel(text: string): Channel {
  if (/\bcall(ed)?\b|\bphone\b/i.test(text)) return "call";
  if (/physically|in person|met (him|her|them)|during (their|the) (monthly )?meeting|demo (presented|held)/i.test(text))
    return "in_person";
  return "whatsapp";
}

function guessProductSlug(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("bazabooks")) return "bazabooks";
  if (t.includes("chama360")) return "chama360";
  if (t.includes("catering")) return "catering-scheduler";
  if (t.includes("ndalamahub")) return "ndalamahub";
  if (t.includes("web design") || t.includes("nexus")) return "nexus-web";
  return null;
}

function cleanLogName(raw: string): string {
  return raw
    .replace(/^\[|\]$/g, "")
    .replace(/\(saved as:.*?\)/i, "")
    .split(",")[0] // "[Clement Mweetwa, Manifi Investments]" -> "Clement Mweetwa"
    .trim();
}

function parseOutreachLog(): LogEntry[] {
  const text = readFileSync(OUTREACH_LOG, "utf-8");
  const entries: LogEntry[] = [];

  // Split on markdown "## " headings, tolerant of trailing whitespace on the
  // heading line itself (the live file has a stray trailing space after
  // "## Outreach" that broke an exact-string match here previously).
  const headingRe = /^##[ \t]+(.+?)[ \t]*$/gm;
  const sectionBodies = new Map<string, string>();
  const matches = [...text.matchAll(headingRe)];
  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim();
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    sectionBodies.set(heading, text.slice(start, end));
  }

  const sections: Record<string, "outreach" | "feedback"> = {
    Outreach: "outreach",
    "Outreach Follow ups": "outreach",
    Feedback: "feedback",
  };

  for (const [heading, kind] of Object.entries(sections)) {
    const body = sectionBodies.get(heading);
    if (body === undefined) continue;

    const lineRe = /^\d+\.\s+`([^`]+)`/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(body))) {
      const fields = m[1].split("|").map((s) => s.trim());
      if (kind === "outreach") {
        const [date, name, action, status] = fields;
        if (!date || !name) continue;
        entries.push({
          date,
          name: cleanLogName(name),
          product: guessProductSlug(action ?? ""),
          summary: status ? `${action} — ${status}` : action ?? "",
          direction: "outbound",
          channel: guessChannel(action ?? ""),
        });
      } else {
        const [date, name, product, ...proseParts] = fields;
        const prose = proseParts.join(" | ");
        if (!date || !name) continue;
        entries.push({
          date,
          name: cleanLogName(name),
          product: guessProductSlug(product ?? prose),
          summary: prose || product || "",
          direction: "inbound",
          channel: guessChannel(prose ?? ""),
        });
      }
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
async function main() {
  const xlsxRows = readProspectsXlsx();
  const { contacts: canonical, unresolvedDuplicateNotes, possiblePhoneDuplicates } =
    buildCanonicalContacts(xlsxRows);
  const logEntries = parseOutreachLog();

  const nameIndex = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();
  const findCanonicalByName = (needle: string) => {
    const n = nameIndex(needle);
    return (
      canonical.find((c) => nameIndex(c.name).includes(n) || n.includes(nameIndex(c.name))) ??
      canonical.find((c) => c.company && nameIndex(c.company).includes(n))
    );
  };

  // Build per-contact engagement plans.
  type EngagementPlan = FixtureEngagement & { contact: CanonicalContact };
  const engagementPlans: EngagementPlan[] = [];
  const contactsWithoutEngagement: CanonicalContact[] = [];

  for (const c of canonical) {
    const key = nameIndex(c.name);
    const fixture = FIXTURE_ENGAGEMENTS[key];
    if (fixture) {
      for (const f of fixture) engagementPlans.push({ ...f, contact: c });
      continue;
    }

    // Generic path: at most one Product Fit per row in this dataset (verified
    // against the live sheet — "Multiple"/"Unclear" rows are the only
    // exceptions, and those are covered by FIXTURE_ENGAGEMENTS above or, if
    // not covered, deliberately skipped rather than guessed at).
    const row = c.rows.find((r) => r.productFit);
    const fitRaw = row?.productFit?.trim().toLowerCase();
    if (!row || !fitRaw || fitRaw === "multiple" || fitRaw === "unclear") {
      if (row?.productFit) contactsWithoutEngagement.push(c); // Multiple/Unclear, not in fixtures
      continue;
    }

    const slug = PRODUCT_FIT_TO_SLUG[fitRaw];
    if (!slug) {
      contactsWithoutEngagement.push(c);
      continue;
    }

    const statusRaw = row.outreachStatus?.trim().toLowerCase();
    const stage: Stage = (statusRaw && STATUS_TO_STAGE[statusRaw]) || "LEAD";

    engagementPlans.push({
      contact: c,
      productSlug: slug,
      stage,
      tier: row.tier,
      interestNote: row.internalNotes ?? "",
      stageChangedAt: row.lastContactDate ?? undefined,
    });
  }

  // Referral links, resolved by name against the canonical set.
  const referralAssignments: Array<{ contact: CanonicalContact; referredBy: CanonicalContact }> = [];
  for (const { referrerName, referredName } of REFERRAL_LINKS) {
    const referrer = findCanonicalByName(referrerName);
    const referred = findCanonicalByName(referredName);
    if (referrer && referred) {
      referralAssignments.push({ contact: referred, referredBy: referrer });
    }
  }

  // Match log entries to contacts (never auto-create a contact from the log).
  const matchedLogEntries: Array<{ entry: LogEntry; contact: CanonicalContact }> = [];
  const unmatchedLogEntries: LogEntry[] = [];
  for (const entry of logEntries) {
    const contact = findCanonicalByName(entry.name);
    if (contact) {
      matchedLogEntries.push({ entry, contact });
    } else {
      unmatchedLogEntries.push(entry);
    }
  }

  // ---- Review report ----
  const reviewLines: string[] = [];
  reviewLines.push(`# Legacy import review — ${new Date().toISOString()}`);
  reviewLines.push("");
  reviewLines.push(`- xlsx rows read: ${xlsxRows.length}`);
  reviewLines.push(`- canonical contacts after merge: ${canonical.length}`);
  reviewLines.push(`- engagements planned: ${engagementPlans.length}`);
  reviewLines.push(`- referral links resolved: ${referralAssignments.length}`);
  reviewLines.push(`- outreach-log entries parsed: ${logEntries.length}`);
  reviewLines.push(`- outreach-log entries matched to a contact: ${matchedLogEntries.length}`);
  reviewLines.push(`- outreach-log entries UNMATCHED (not imported): ${unmatchedLogEntries.length}`);
  reviewLines.push("");

  reviewLines.push("## New product row");
  reviewLines.push(
    "- `ndalamahub` — not a doc 01 seed product. Added because outreach-log.md references it " +
      "directly (Clement Mweetwa / Manifi Investments) as its own app, distinct from Nexus's " +
      "web-design/hosting client work. Confirm this reads right.",
  );
  reviewLines.push("");

  reviewLines.push("## Contacts with Product Fit = Multiple/Unclear and no fixture override (contact-only, no engagement)");
  for (const c of contactsWithoutEngagement) {
    reviewLines.push(`- ${c.name}${c.company ? ` (${c.company})` : ""}`);
  }
  reviewLines.push("");

  reviewLines.push("## Duplicate-note rows that couldn't be matched to a canonical contact by name");
  for (const r of unresolvedDuplicateNotes) {
    reviewLines.push(`- "${r.fullName}" — imported standalone. Notes: ${r.internalNotes}`);
  }
  reviewLines.push("");

  reviewLines.push(
    "## Contacts sharing a phone number, NOT auto-merged (review with the app's Merge-contacts tool post-import)",
  );
  for (const [a, b] of possiblePhoneDuplicates) {
    reviewLines.push(`- "${a.name}" and "${b.name}" share a phone number`);
  }
  reviewLines.push("");

  reviewLines.push("## outreach-log.md entries that didn't match any imported contact");
  for (const e of unmatchedLogEntries) {
    reviewLines.push(`- ${e.date} | ${e.name} | ${e.summary.slice(0, 100)}`);
  }
  reviewLines.push("");

  reviewLines.push("## Engagements auto-created from the log with a fallback stage (no xlsx row backed them)");
  // filled in during commit/dry-run below once we know which ones are fallbacks

  const reviewPath = "scripts/legacy-import-review.md";
  writeFileSync(reviewPath, reviewLines.join("\n"));
  console.log(
    [
      `xlsx rows read: ${xlsxRows.length}`,
      `canonical contacts: ${canonical.length}`,
      `engagements planned: ${engagementPlans.length}`,
      `referral links resolved: ${referralAssignments.length}`,
      `outreach-log entries parsed: ${logEntries.length} (matched ${matchedLogEntries.length}, unmatched ${unmatchedLogEntries.length})`,
      `contacts with Multiple/Unclear fit and no engagement: ${contactsWithoutEngagement.length}`,
      `possible phone duplicates (not auto-merged): ${possiblePhoneDuplicates.length}`,
    ].join("\n"),
  );
  console.log(`\nFull review written to ${reviewPath}`);

  if (!COMMIT) {
    console.log("\nDry run only — re-run with --commit to write to the database.");
    return;
  }

  // `contacts` has no unique constraint that would make this insert idempotent
  // — this script is a one-time "run once at go-live" per doc 02 §2, and a
  // second --commit run against a database that already has contacts would
  // duplicate all of them rather than no-op. Refuse rather than silently
  // double-import.
  const [{ value: existingContacts }] = await db.select({ value: count() }).from(contacts);
  if (existingContacts > 0) {
    console.error(
      `\nRefusing to commit: ${existingContacts} contacts already exist in this database. ` +
        "This script is meant to run once, against an empty contacts table. If you really mean " +
        "to re-run it (e.g. a fresh database), truncate contacts/engagements/interactions first.",
    );
    process.exit(1);
  }

  // ---- Commit ----
  await db.transaction(async (tx) => {
    if (NEW_PRODUCTS.length) {
      await tx.insert(products).values(NEW_PRODUCTS).onConflictDoNothing({ target: products.slug });
    }
    const productRows = await tx.select().from(products);
    const productIdBySlug = new Map(productRows.map((p) => [p.slug, p.id]));

    const contactIdByCanonical = new Map<CanonicalContact, string>();
    for (const c of canonical) {
      const [inserted] = await tx
        .insert(contacts)
        .values({
          name: c.name,
          company: c.company,
          phone: c.phones[0] ?? null,
          phoneAlt: c.phones.slice(1),
          email: c.email,
          source: "outreach",
          notes: c.sourceNotes,
        })
        .returning({ id: contacts.id });
      contactIdByCanonical.set(c, inserted.id);
    }

    // Referral links — set after all contacts exist.
    for (const { contact, referredBy } of referralAssignments) {
      const contactId = contactIdByCanonical.get(contact);
      const referredById = contactIdByCanonical.get(referredBy);
      if (contactId && referredById) {
        await tx.update(contacts).set({ referredBy: referredById }).where(eq(contacts.id, contactId));
      }
    }

    const engagementIdByKey = new Map<string, string>();
    for (const plan of engagementPlans) {
      const contactId = contactIdByCanonical.get(plan.contact);
      const productId = productIdBySlug.get(plan.productSlug);
      if (!contactId || !productId) continue;

      const [inserted] = await tx
        .insert(engagements)
        .values({
          contactId,
          productId,
          stage: plan.stage,
          tier: plan.tier,
          interestNote: plan.interestNote || null,
          stageChangedAt: plan.stageChangedAt ? new Date(plan.stageChangedAt) : undefined,
        })
        .onConflictDoNothing({ target: [engagements.contactId, engagements.productId] })
        .returning({ id: engagements.id });

      if (inserted) {
        engagementIdByKey.set(`${contactId}:${productId}`, inserted.id);

        if (plan.stage === "LOST") {
          await tx.insert(interactions).values({
            engagementId: inserted.id,
            happenedAt: new Date(),
            channel: "system",
            direction: "note",
            summary: "Marked Not Interested during legacy import.",
          });
        }
      }
    }

    let fallbackEngagementsCreated = 0;
    for (const { entry, contact } of matchedLogEntries) {
      const contactId = contactIdByCanonical.get(contact);
      if (!contactId || !entry.product) continue; // no product recognized in the log text — skip, don't guess
      const productId = productIdBySlug.get(entry.product);
      if (!productId) continue;

      const engagementKey = `${contactId}:${productId}`;
      let engagementId = engagementIdByKey.get(engagementKey);

      if (!engagementId) {
        const [inserted] = await tx
          .insert(engagements)
          .values({
            contactId,
            productId,
            stage: "CONTACTED",
            interestNote: "Auto-created from outreach-log.md import — no matching xlsx row.",
          })
          .onConflictDoNothing({ target: [engagements.contactId, engagements.productId] })
          .returning({ id: engagements.id });
        if (inserted) {
          engagementId = inserted.id;
          engagementIdByKey.set(engagementKey, engagementId);
          fallbackEngagementsCreated++;
        }
      }
      if (!engagementId) continue;

      await tx.insert(interactions).values({
        engagementId,
        happenedAt: new Date(entry.date),
        channel: entry.channel,
        direction: entry.direction,
        summary: entry.summary,
      });
    }

    console.log(`\nCommitted. Fallback engagements auto-created from the log: ${fallbackEngagementsCreated}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
