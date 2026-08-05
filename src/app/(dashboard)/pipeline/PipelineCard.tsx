"use client";

import type { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";
import type { PipelineEngagement } from "@/db/queries/pipeline";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { memo, useRef } from "react";
import { STAGE_COLORS } from "./stageColors";

type Stage = (typeof STAGE_VALUES)[number];

export const PipelineCard = memo(function PipelineCard({
  engagement,
  pulse,
  now,
  onDrop,
  onOpen,
}: {
  engagement: PipelineEngagement;
  pulse: boolean;
  now: number;
  onDrop: (engagementId: string, targetStage: Stage) => void;
  onOpen: (engagementId: string) => void;
}) {
  const x = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const rotate = useTransform(x, [-150, 150], prefersReducedMotion ? [0, 0] : [-2, 2]);
  const ref = useRef<HTMLDivElement>(null);

  // `now` is passed down from the server render rather than read here via
  // Date.now()/new Date() — this component is a render-purity boundary
  // (React Compiler), so wall-clock reads don't belong in the render body.
  const daysInStage = Math.floor(
    (now - new Date(engagement.stageChangedAt).getTime()) / 86_400_000,
  );
  const nextAction = engagement.nextActions[0];
  const today = new Date(now).toISOString().slice(0, 10);
  const overdue = nextAction?.dueDate ? nextAction.dueDate < today : false;

  function handleDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    // At drop time the dragged card is still positioned under the pointer,
    // so elementFromPoint would otherwise hit the card itself (whose closest
    // ancestor column is the *source*, not the drop target). Hide it from
    // hit-testing for this one synchronous lookup, then restore it.
    const el = ref.current;
    if (el) el.style.pointerEvents = "none";
    const target = document
      .elementFromPoint(info.point.x, info.point.y)
      ?.closest<HTMLElement>("[data-stage-column]");
    if (el) el.style.pointerEvents = "";

    const targetStage = target?.dataset.stageColumn as Stage | undefined;
    if (targetStage && targetStage !== engagement.stage) {
      onDrop(engagement.id, targetStage);
    }
  }

  return (
    <motion.div
      ref={ref}
      drag
      dragSnapToOrigin
      dragElastic={0.15}
      style={{ x, rotate }}
      whileDrag={{ scale: prefersReducedMotion ? 1 : 1.03 }}
      animate={pulse && !prefersReducedMotion ? { scale: [1, 1.05, 1] } : undefined}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
      onDragEnd={handleDragEnd}
      onTap={() => onOpen(engagement.id)}
      className="card-glass cursor-grab p-3 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-body-lg text-text">{engagement.contact.name}</p>
          {engagement.contact.company && (
            <p className="text-body-sm text-text-muted">{engagement.contact.company}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {engagement.needsReview && (
            <span
              className="rounded-full bg-warning/20 px-2 py-0.5 text-body-sm text-warning"
              title="Signup couldn't be matched to an existing contact"
            >
              Review
            </span>
          )}
          {engagement.tier && (
            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-body-sm text-gold">
              T{engagement.tier}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span
          className="flex items-center gap-1 text-body-sm"
          style={{ color: STAGE_COLORS[engagement.stage] }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: STAGE_COLORS[engagement.stage] }}
          />
          {engagement.stage}
        </span>
        <span className="font-mono text-mono text-text-muted">{daysInStage}d</span>
      </div>
      {nextAction?.dueDate && (
        <p className={`mt-1 font-mono text-mono ${overdue ? "text-danger" : "text-text-muted"}`}>
          Next: {nextAction.dueDate}
        </p>
      )}
    </motion.div>
  );
});
