import { db } from "@/db";

const DAY_MS = 86_400_000;

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ENGAGEMENT_COLUMNS = {
  id: true,
  stage: true,
  tier: true,
  interestNote: true,
  needsReview: true,
  stageChangedAt: true,
  createdAt: true,
} as const;

// Doc 03 Screen 1 — replaces the weekly spreadsheet cross-reference. Small
// dataset (a few dozen live engagements), so the "no outbound interaction
// since signup" / "quiet for 14 days" rules are computed in JS over a full
// fetch rather than as SQL subqueries — simpler to read and plenty fast here.
export async function getThisWeekData(now: number) {
  const today = toDateString(new Date(now));
  const weekEnd = toDateString(new Date(now + 6 * DAY_MS));
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now - 7 * DAY_MS);
  const fourteenDaysAgo = new Date(now - 14 * DAY_MS);

  const [openNextActions, allEngagements] = await Promise.all([
    db.query.nextActions.findMany({
      where: (na, { eq }) => eq(na.status, "open"),
      orderBy: (na, { asc }) => [asc(na.dueDate)],
      with: {
        engagement: {
          columns: ENGAGEMENT_COLUMNS,
          with: {
            contact: { columns: { id: true, name: true, company: true } },
            product: { columns: { id: true, name: true } },
            nextActions: {
              where: (na, { eq }) => eq(na.status, "open"),
              columns: { id: true, description: true, dueDate: true },
              orderBy: (na, { asc }) => [asc(na.dueDate)],
            },
          },
        },
      },
    }),
    db.query.engagements.findMany({
      columns: ENGAGEMENT_COLUMNS,
      with: {
        contact: { columns: { id: true, name: true, company: true } },
        product: { columns: { id: true, name: true } },
        interactions: {
          columns: { direction: true, happenedAt: true },
          orderBy: (i, { desc }) => [desc(i.happenedAt)],
        },
        nextActions: {
          where: (na, { eq }) => eq(na.status, "open"),
          columns: { id: true, description: true, dueDate: true },
          orderBy: (na, { asc }) => [asc(na.dueDate)],
        },
      },
    }),
  ]);

  const overdue = openNextActions.filter((na) => na.dueDate !== null && na.dueDate < today);
  const dueThisWeek = openNextActions.filter(
    (na) => na.dueDate !== null && na.dueDate >= today && na.dueDate <= weekEnd,
  );

  const freshSignups = allEngagements.filter((e) => {
    if (e.stage !== "SIGNED_UP") return false;
    if (e.stageChangedAt < sevenDaysAgo) return false;
    return !e.interactions.some(
      (i) => i.direction === "outbound" && i.happenedAt >= e.stageChangedAt,
    );
  });

  // "Gone quiet" (doc 03 §4): SIGNED_UP/ACTIVE engagements with no touch in
  // 14 days (usage_rollups.last_active_at would be the real signal per doc
  // 03, but P4/usage-tracking isn't built yet — last interaction is the only
  // activity signal this schema has today), plus anything already DORMANT.
  const goneQuiet = allEngagements.filter((e) => {
    if (e.stage === "DORMANT") return true;
    if (e.stage !== "SIGNED_UP" && e.stage !== "ACTIVE") return false;
    const lastTouch = e.interactions[0]?.happenedAt ?? e.stageChangedAt;
    return lastTouch < fourteenDaysAgo;
  });

  const newLeadsThisMonth = allEngagements.filter((e) => e.createdAt >= monthStart).length;
  // Approximation, not exact "reached SIGNED_UP this month": the schema only
  // tracks the *current* stage's stageChangedAt, not a dedicated signed-up-at
  // timestamp, so an engagement that advanced further this month (e.g.
  // ACTIVE -> PAYING) is counted too. Fine at this scale/use — a dashboard
  // number, not a report.
  const signupsThisMonth = allEngagements.filter(
    (e) =>
      e.stageChangedAt >= monthStart &&
      (e.stage === "SIGNED_UP" || e.stage === "ACTIVE" || e.stage === "PAYING"),
  ).length;
  const activeClients = allEngagements.filter(
    (e) => e.stage === "ACTIVE" || e.stage === "PAYING",
  ).length;

  return {
    overdue,
    dueThisWeek,
    freshSignups,
    goneQuiet,
    metrics: {
      newLeadsThisMonth,
      signupsThisMonth,
      activeClients,
      openNextActions: openNextActions.length,
    },
  };
}

export type ThisWeekData = Awaited<ReturnType<typeof getThisWeekData>>;
export type ThisWeekNextAction = ThisWeekData["overdue"][number];
export type ThisWeekEngagement = ThisWeekData["freshSignups"][number];
