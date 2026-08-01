import { db } from "@/db";

// One read path for "pipeline row" — used by both the kanban board and the
// All table, since both need contact/product plus last-touch context.
export function listEngagementsForBoard() {
  return db.query.engagements.findMany({
    with: {
      contact: {
        columns: { id: true, name: true, company: true },
      },
      product: {
        columns: { id: true, slug: true, name: true },
      },
      interactions: {
        columns: { happenedAt: true },
        orderBy: (interactions, { desc }) => [desc(interactions.happenedAt)],
        limit: 1,
      },
      nextActions: {
        where: (nextActions, { eq }) => eq(nextActions.status, "open"),
        columns: { dueDate: true },
        orderBy: (nextActions, { asc }) => [asc(nextActions.dueDate)],
        limit: 1,
      },
    },
  });
}

export type PipelineEngagement = Awaited<ReturnType<typeof listEngagementsForBoard>>[number];
