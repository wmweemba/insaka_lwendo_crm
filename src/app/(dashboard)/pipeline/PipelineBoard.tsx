"use client";

import { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";
import type { PipelineEngagement } from "@/db/queries/pipeline";
import { useCallback, useMemo, useRef, useState } from "react";
import { moveEngagementStage } from "./actions";
import { EngagementQuickPanel } from "./EngagementQuickPanel";
import { LostReasonModal } from "./LostReasonModal";
import { MobilePipelineBoard } from "./MobilePipelineBoard";
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
  const [openEngagementId, setOpenEngagementId] = useState<string | null>(null);
  const columnRefs = useRef<Partial<Record<Stage, HTMLDivElement>>>({});

  const openEngagement = engagements.find((e) => e.id === openEngagementId) ?? null;

  // Grouped once per `engagements` change instead of re-filtering the full
  // array once per stage (9x) on every render — same data, one pass.
  const byStage = useMemo(() => {
    const map = new Map<Stage, PipelineEngagement[]>();
    for (const stage of STAGE_VALUES) map.set(stage, []);
    for (const e of engagements) map.get(e.stage)?.push(e);
    return map;
  }, [engagements]);

  function patchEngagement(engagementId: string, patch: Partial<PipelineEngagement>) {
    setEngagements((prev) => prev.map((e) => (e.id === engagementId ? { ...e, ...patch } : e)));
  }

  function scrollToStage(stage: Stage) {
    columnRefs.current[stage]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }

  // Stable references so React.memo on PipelineCard (which receives onDrop)
  // actually prevents re-renders instead of comparing a new function every time.
  const applyMove = useCallback((engagementId: string, stage: Stage, lostReason?: string) => {
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
  }, []);

  const handleDrop = useCallback(
    (engagementId: string, targetStage: Stage) => {
      if (targetStage === "LOST") {
        setPendingLost({ engagementId });
        return;
      }
      applyMove(engagementId, targetStage);
    },
    [applyMove],
  );

  return (
    <>
      {/* Desktop / tablet — drag-and-drop board. 9 stages still need scrolling
          to reach; scroll-snap + jump pills make that navigable instead of a
          blind horizontal drag. */}
      <div className="hidden lg:block">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {STAGE_VALUES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => scrollToStage(stage)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-body-sm text-text-muted transition-colors hover:border-border-glow hover:text-text"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: STAGE_COLORS[stage] }}
              />
              {stage}
              <span className="text-text-faint">{byStage.get(stage)?.length ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4">
          {STAGE_VALUES.map((stage) => {
            const columnEngagements = byStage.get(stage) ?? [];
            return (
              <div
                key={stage}
                ref={(el) => {
                  if (el) columnRefs.current[stage] = el;
                }}
                data-stage-column={stage}
                className="flex w-64 shrink-0 snap-start flex-col gap-3 rounded-md border-t-[3px] bg-bg-raised/40 p-3"
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
                      onOpen={setOpenEngagementId}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile — one stage at a time, tap-to-move instead of drag (touch
          dragging a card past off-screen columns is unreliable at 9 stages). */}
      <div className="lg:hidden">
        <MobilePipelineBoard
          engagements={engagements}
          now={now}
          pulsingId={pulsingId}
          onOpen={setOpenEngagementId}
        />
      </div>

      {openEngagement && (
        <EngagementQuickPanel
          engagement={openEngagement}
          onClose={() => setOpenEngagementId(null)}
          onStageChange={(stage) => handleDrop(openEngagement.id, stage)}
          onPatch={(patch) => patchEngagement(openEngagement.id, patch)}
        />
      )}

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
