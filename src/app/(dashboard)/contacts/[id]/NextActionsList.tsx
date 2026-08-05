"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { cancelNextAction, completeNextAction } from "./actions";

type NextAction = {
  id: string;
  description: string;
  dueDate: string | null;
};

export function NextActionsList({
  contactId,
  nextActions,
}: {
  contactId: string;
  nextActions: NextAction[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (nextActions.length === 0) return null;

  async function onComplete(id: string) {
    setPendingId(id);
    await completeNextAction(id, contactId);
    setPendingId(null);
  }

  async function onCancel(id: string) {
    setPendingId(id);
    await cancelNextAction(id, contactId);
    setPendingId(null);
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {nextActions.map((na) => {
        const overdue = na.dueDate ? new Date(na.dueDate) < new Date() : false;
        return (
          <li
            key={na.id}
            className="flex flex-col gap-2 rounded-sm border border-border bg-bg px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col">
              <span className="text-body-sm text-text">{na.description}</span>
              {na.dueDate && (
                <span
                  className={`font-mono text-mono ${overdue ? "text-danger" : "text-text-muted"}`}
                >
                  Due {na.dueDate}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <Button
                type="button"
                variant="secondary"
                disabled={pendingId === na.id}
                onClick={() => onComplete(na.id)}
              >
                Done
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pendingId === na.id}
                onClick={() => onCancel(na.id)}
              >
                Cancel
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
