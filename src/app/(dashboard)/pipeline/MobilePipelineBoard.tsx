"use client";

import { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";
import type { PipelineEngagement } from "@/db/queries/pipeline";
import { useState } from "react";
import { STAGE_COLORS } from "./stageColors";

type Stage = (typeof STAGE_VALUES)[number];

export function MobilePipelineBoard({
  engagements,
  now,
  pulsingId,
  onOpen,
}: {
  engagements: PipelineEngagement[];
  now: number;
  pulsingId: string | null;
  onOpen: (engagementId: string) => void;
}) {
  const counts = Object.fromEntries(
    STAGE_VALUES.map((stage) => [stage, engagements.filter((e) => e.stage === stage).length]),
  ) as Record<Stage, number>;

  const [activeStage, setActiveStage] = useState<Stage>(
    () => STAGE_VALUES.find((stage) => counts[stage] > 0) ?? STAGE_VALUES[0],
  );

  const visible = engagements.filter((e) => e.stage === activeStage);

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 pb-px">
        {STAGE_VALUES.map((stage) => {
          const active = stage === activeStage;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStage(stage)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 font-display text-body-sm uppercase tracking-[0.04em] ${
                active ? "border-accent text-text" : "border-transparent text-text-muted"
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: STAGE_COLORS[stage] }}
              />
              {stage}
              <span className="text-text-faint">{counts[stage]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {visible.length === 0 ? (
          <p className="py-6 text-center text-body text-text-muted">Nothing in this stage.</p>
        ) : (
          visible.map((e) => {
            const daysInStage = Math.floor(
              (now - new Date(e.stageChangedAt).getTime()) / 86_400_000,
            );
            const nextAction = e.nextActions[0];
            const today = new Date(now).toISOString().slice(0, 10);
            const overdue = nextAction?.dueDate ? nextAction.dueDate < today : false;

            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpen(e.id)}
                className={`card-glass flex flex-col gap-2 p-3 text-left ${
                  pulsingId === e.id ? "animate-pulse" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-body-lg text-text">{e.contact.name}</p>
                    {e.contact.company && (
                      <p className="text-body-sm text-text-muted">{e.contact.company}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {e.needsReview && (
                      <span className="rounded-full bg-warning/20 px-2 py-0.5 text-body-sm text-warning">
                        Review
                      </span>
                    )}
                    {e.tier && (
                      <span className="rounded-full bg-gold/20 px-2 py-0.5 text-body-sm text-gold">
                        T{e.tier}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-mono text-text-muted">{daysInStage}d</span>
                  <span className="text-body-sm text-accent">Open ›</span>
                </div>
                {nextAction?.dueDate && (
                  <p className={`font-mono text-mono ${overdue ? "text-danger" : "text-text-muted"}`}>
                    Next: {nextAction.dueDate}
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
