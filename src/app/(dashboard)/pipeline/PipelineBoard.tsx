"use client";

import { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";
import type { PipelineEngagement } from "@/db/queries/pipeline";
import { useState } from "react";
import { moveEngagementStage } from "./actions";
import { LostReasonModal } from "./LostReasonModal";
import { PipelineCard } from "./PipelineCard";
import { PULSE_STAGES, STAGE_COLORS } from "./stageColors";

type Stage = (typeof STAGE_VALUES)[number];

// Callers key this component on the active product tab (see pipeline/page.tsx)
// so switching tabs remounts with fresh `initial` data instead of needing an
// effect to resync state from props.
export function PipelineBoard({
  engagements: initial,
  now,
}: {
  engagements: PipelineEngagement[];
  now: number;
}) {
  const [engagements, setEngagements] = useState(initial);
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState<{ engagementId: string } | null>(null);

  function applyMove(engagementId: string, stage: Stage, lostReason?: string) {
    setEngagements((prev) =>
      prev.map((e) => (e.id === engagementId ? { ...e, stage, stageChangedAt: new Date() } : e)),
    );
    if (PULSE_STAGES.has(stage)) {
      setPulsingId(engagementId);
      setTimeout(() => setPulsingId(null), 450);
    }
    moveEngagementStage(engagementId, stage, lostReason).catch((err) => {
      console.error("Failed to move engagement stage", err);
    });
  }

  function handleDrop(engagementId: string, targetStage: Stage) {
    if (targetStage === "LOST") {
      setPendingLost({ engagementId });
      return;
    }
    applyMove(engagementId, targetStage);
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGE_VALUES.map((stage) => {
          const columnEngagements = engagements.filter((e) => e.stage === stage);
          return (
            <div
              key={stage}
              data-stage-column={stage}
              className="flex w-64 shrink-0 flex-col gap-3 rounded-md border-t-[3px] bg-bg-raised/40 p-3"
              style={{ borderTopColor: STAGE_COLORS[stage] }}
            >
              <div className="flex items-center justify-between text-body-sm text-text-muted">
                <span className="font-display uppercase tracking-[0.04em]">{stage}</span>
                <span>{columnEngagements.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {columnEngagements.map((e) => (
                  <PipelineCard
                    key={e.id}
                    engagement={e}
                    pulse={pulsingId === e.id}
                    now={now}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {pendingLost && (
        <LostReasonModal
          onConfirm={(reason) => {
            applyMove(pendingLost.engagementId, "LOST", reason);
            setPendingLost(null);
          }}
          onCancel={() => setPendingLost(null)}
        />
      )}
    </>
  );
}
