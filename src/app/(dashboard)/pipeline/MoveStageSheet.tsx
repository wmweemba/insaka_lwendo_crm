"use client";

import { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";
import { STAGE_COLORS } from "./stageColors";

type Stage = (typeof STAGE_VALUES)[number];

// Mobile replacement for cross-column drag (§ discussion: dragging a card
// past off-screen columns is unreliable on touch at 9 stages) — tap the
// card, pick the destination from a bottom sheet instead.
export function MoveStageSheet({
  contactName,
  currentStage,
  onSelect,
  onClose,
}: {
  contactName: string;
  currentStage: Stage;
  onSelect: (stage: Stage) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="flex w-full max-h-[70vh] flex-col gap-1 overflow-y-auto rounded-t-lg border-t border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 text-body-sm text-text-muted">Move {contactName} to…</p>
        {STAGE_VALUES.map((stage) => {
          const active = stage === currentStage;
          return (
            <button
              key={stage}
              type="button"
              disabled={active}
              onClick={() => onSelect(stage)}
              className={`flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 text-left text-body ${
                active ? "text-text-faint" : "text-text hover:bg-bg-raised"
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: STAGE_COLORS[stage] }}
              />
              {stage}
              {active && <span className="ml-auto text-body-sm">Current</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
