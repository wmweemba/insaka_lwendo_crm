// One-time backfill for the outreach-log.md interactions/fallback engagements
// that the P1 go-live run (scripts/import-legacy.ts, 2026-08-05) failed to
// create — the copy of outreach-log.md that reached production parsed to 0
// entries even though contacts/engagements from prospects.xlsx committed
// correctly. Root cause under investigation; this script lets us backfill
// once a verified-intact copy of the file is in place, without re-running
// the full import (which refuses on a non-empty `contacts` table anyway).
//
// Unlike import-legacy.ts, this is safe to run against a database that
// already has contacts/engagements: it matches log entries against EXISTING
// contacts by name/company (not a freshly re-parsed xlsx), only creates a
// fallback CONTACTED engagement if none exists yet for that (contact,
// product) pair, and skips any interaction that already has the same
// engagement + summary + happenedAt — so it's safe to re-run if it only
// partially completes, or by accident.
//
//   pnpm backfill-outreach-log            (dry run — parses + matches only)
//   pnpm backfill-outreach-log --commit

import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, engagements, interactions, products } from "@/db/schema";

const SECOND_BRAIN =
  process.env.SECOND_BRAIN_PATH || "/Users/williammweemba/Dev_Projects/wsm-second-brain";
const OUTREACH_LOG = process.env.OUTREACH_LOG_PATH || `${SECOND_BRAIN}/docs/outreach-log.md`;
const COMMIT = process.argv.includes("--commit");

type Channel = "whatsapp" | "telegram" | "call" | "in_person" | "email" | "social" | "system";

type LogEntry = {
  date: string;
  name: string;
  product: string | null;
  summary: string;
  direction: "outbound" | "inbound";
  channel: Channel;
};

// Parsing logic duplicated verbatim from scripts/import-legacy.ts's
// parseOutreachLog/guessChannel/guessProductSlug/cleanLogName — kept in sync
// by hand since this script is one-time/throwaway, not a shared module.

function guessChannel(text: string): Channel {
  if (/\bcall(ed)?\b|\bphone\b/i.test(text)) return "call";
  if (
    /physically|in person|met (him|her|them)|during (their|the) (monthly )?meeting|demo (presented|held)/i.test(
      text,
    )
  )
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
    .split(",")[0]
    .trim();
}

function parseOutreachLog(): LogEntry[] {
  const text = readFileSync(OUTREACH_LOG, "utf-8");
  const entries: LogEntry[] = [];

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
          summary: status ? `${action} — ${status}` : (action ?? ""),
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

async function main() {
  const logEntries = parseOutreachLog();
  console.log(`outreach-log entries parsed: ${logEntries.length}`);
  if (logEntries.length === 0) {
    console.error(
      "Parsed 0 entries — refusing to continue. Check OUTREACH_LOG_PATH / file content before retrying.",
    );
    process.exit(1);
  }

  const dbContacts = await db.select().from(contacts);
  const dbProducts = await db.select().from(products);
  const productIdBySlug = new Map(dbProducts.map((p) => [p.slug, p.id]));

  const nameIndex = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();
  const findContactByName = (needle: string) => {
    const n = nameIndex(needle);
    return (
      dbContacts.find((c) => nameIndex(c.name).includes(n) || n.includes(nameIndex(c.name))) ??
      dbContacts.find((c) => c.company && nameIndex(c.company).includes(n))
    );
  };

  const matched: Array<{ entry: LogEntry; contactId: string }> = [];
  const unmatched: LogEntry[] = [];
  for (const entry of logEntries) {
    const contact = findContactByName(entry.name);
    if (contact) matched.push({ entry, contactId: contact.id });
    else unmatched.push(entry);
  }

  console.log(`matched: ${matched.length}, unmatched: ${unmatched.length}`);
  if (unmatched.length) {
    console.log("Unmatched names:", [...new Set(unmatched.map((e) => e.name))].join(", "));
  }

  if (!COMMIT) {
    console.log("\nDry run only — re-run with --commit to write to the database.");
    return;
  }

  let fallbackEngagementsCreated = 0;
  let interactionsCreated = 0;
  let interactionsSkippedExisting = 0;
  let skippedNoProduct = 0;

  await db.transaction(async (tx) => {
    const existingEngagements = await tx.select().from(engagements);
    const engagementIdByKey = new Map(
      existingEngagements.map((e) => [`${e.contactId}:${e.productId}`, e.id]),
    );

    for (const { entry, contactId } of matched) {
      if (!entry.product) {
        skippedNoProduct++;
        continue;
      }
      const productId = productIdBySlug.get(entry.product);
      if (!productId) {
        skippedNoProduct++;
        continue;
      }

      const key = `${contactId}:${productId}`;
      let engagementId = engagementIdByKey.get(key);

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
          engagementIdByKey.set(key, engagementId);
          fallbackEngagementsCreated++;
        }
      }
      if (!engagementId) continue;

      const happenedAt = new Date(entry.date);
      const alreadyExists = await tx
        .select({ id: interactions.id })
        .from(interactions)
        .where(
          and(
            eq(interactions.engagementId, engagementId),
            eq(interactions.summary, entry.summary),
            eq(interactions.happenedAt, happenedAt),
          ),
        )
        .limit(1);
      if (alreadyExists.length) {
        interactionsSkippedExisting++;
        continue;
      }

      await tx.insert(interactions).values({
        engagementId,
        happenedAt,
        channel: entry.channel,
        direction: entry.direction,
        summary: entry.summary,
      });
      interactionsCreated++;
    }
  });

  console.log(
    `\nCommitted. Fallback engagements created: ${fallbackEngagementsCreated}, ` +
      `interactions created: ${interactionsCreated}, ` +
      `interactions skipped (already existed): ${interactionsSkippedExisting}, ` +
      `skipped (no product recognized): ${skippedNoProduct}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
