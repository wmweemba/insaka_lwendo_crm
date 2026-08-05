"use client";

import { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";
import {
  completeNextAction,
  rescheduleNextAction,
} from "@/app/(dashboard)/contacts/[id]/actions";
import { moveEngagementStage } from "@/app/(dashboard)/pipeline/actions";
import { EngagementQuickPanel, type QuickPanelEngagement } from "@/app/(dashboard)/pipeline/EngagementQuickPanel";
import { LostReasonModal } from "@/app/(dashboard)/pipeline/LostReasonModal";
import { STAGE_COLORS } from "@/app/(dashboard)/pipeline/stageColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ThisWeekData, ThisWeekEngagement, ThisWeekNextAction } from "@/db/queries/thisWeek";
import Link from "next/link";
import { useState } from "react";

type Stage = (typeof STAGE_VALUES)[number];

function toQuickPanelEngagement(engagement: {
  id: string;
  stage: Stage;
  tier: number | null;
  interestNote: string | null;
  needsReview: boolean;
  contact: { id: string; name: string; company: string | null };
  product: { id: number; name: string };
  nextActions: { id: string; description: string; dueDate: string | null }[];
}): QuickPanelEngagement {
  return engagement;
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-bg-raised/40 p-3">
      <span className="font-mono text-mono text-2xl text-text">{value}</span>
      <span className="text-body-sm text-text-muted">{label}</span>
    </div>
  );
}

function NextActionRow({
  na,
  onDone,
  onReschedule,
  onOpenPanel,
  pending,
}: {
  na: ThisWeekNextAction;
  onDone: () => void;
  onReschedule: (dueDate: string) => void;
  onOpenPanel: () => void;
  pending: boolean;
}) {
  const [rescheduling, setRescheduling] = useState(false);
  const [draft, setDraft] = useState(na.dueDate ?? "");
  const overdue = na.dueDate !== null && na.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <li className="flex flex-col gap-2 rounded-sm border border-border bg-bg px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/contacts/${na.engagement.contact.id}`}
            className="text-body text-text hover:text-accent"
          >
            {na.engagement.contact.name}
          </Link>
          <span className="text-body-sm text-text-muted">
            {na.engagement.product.name} — {na.description}
          </span>
          {na.dueDate && (
            <span className={`font-mono text-mono ${overdue ? "text-danger" : "text-text-muted"}`}>
              Due {na.dueDate}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button type="button" variant="secondary" disabled={pending} onClick={onDone}>
            Done
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setRescheduling(!rescheduling);
              setDraft(na.dueDate ?? "");
            }}
          >
            Reschedule
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={onOpenPanel}>
            Log interaction
          </Button>
        </div>
      </div>
      {rescheduling && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-auto"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onReschedule(draft);
              setRescheduling(false);
            }}
          >
            Save
          </Button>
        </div>
      )}
    </li>
  );
}

function EngagementRow({
  engagement,
  hint,
  onOpenPanel,
}: {
  engagement: ThisWeekEngagement;
  hint: string;
  onOpenPanel: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-sm border border-border bg-bg px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <Link
          href={`/contacts/${engagement.contact.id}`}
          className="text-body text-text hover:text-accent"
        >
          {engagement.contact.name}
        </Link>
        <span className="flex items-center gap-1.5 text-body-sm text-text-muted">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: STAGE_COLORS[engagement.stage] }}
          />
          {engagement.product.name} — {hint}
        </span>
      </div>
      <Button type="button" variant="ghost" onClick={onOpenPanel}>
        Open
      </Button>
    </li>
  );
}

export function ThisWeekView({ data }: { data: ThisWeekData }) {
  const [overdue, setOverdue] = useState(data.overdue);
  const [dueThisWeek, setDueThisWeek] = useState(data.dueThisWeek);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openEngagement, setOpenEngagement] = useState<QuickPanelEngagement | null>(null);
  const [pendingLost, setPendingLost] = useState<{ engagementId: string } | null>(null);

  function handleStageChange(engagementId: string, stage: Stage) {
    if (stage === "LOST") {
      setPendingLost({ engagementId });
      return;
    }
    setOpenEngagement((prev) => (prev && prev.id === engagementId ? { ...prev, stage } : prev));
    moveEngagementStage(engagementId, stage).catch((err) => {
      console.error("Failed to move engagement stage", err);
    });
  }

  async function handleDone(na: ThisWeekNextAction) {
    setPendingId(na.id);
    await completeNextAction(na.id, na.engagement.contact.id);
    setOverdue((prev) => prev.filter((x) => x.id !== na.id));
    setDueThisWeek((prev) => prev.filter((x) => x.id !== na.id));
    setPendingId(null);
  }

  async function handleReschedule(na: ThisWeekNextAction, dueDate: string) {
    setPendingId(na.id);
    await rescheduleNextAction(na.id, na.engagement.contact.id, dueDate);
    setOverdue((prev) => prev.filter((x) => x.id !== na.id));
    setDueThisWeek((prev) => prev.filter((x) => x.id !== na.id));
    setPendingId(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="New leads this month" value={data.metrics.newLeadsThisMonth} />
        <MetricTile label="Signups this month" value={data.metrics.signupsThisMonth} />
        <MetricTile label="Active clients" value={data.metrics.activeClients} />
        <MetricTile label="Open next actions" value={data.metrics.openNextActions} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-body-sm uppercase tracking-[0.04em] text-danger">
          Overdue ({overdue.length})
        </h2>
        {overdue.length === 0 ? (
          <p className="text-body-sm text-text-muted">Nothing overdue.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {overdue.map((na) => (
              <NextActionRow
                key={na.id}
                na={na}
                pending={pendingId === na.id}
                onDone={() => handleDone(na)}
                onReschedule={(d) => handleReschedule(na, d)}
                onOpenPanel={() => setOpenEngagement(toQuickPanelEngagement(na.engagement))}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-body-sm uppercase tracking-[0.04em] text-text-muted">
          Due this week ({dueThisWeek.length})
        </h2>
        {dueThisWeek.length === 0 ? (
          <p className="text-body-sm text-text-muted">Nothing due this week.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {dueThisWeek.map((na) => (
              <NextActionRow
                key={na.id}
                na={na}
                pending={pendingId === na.id}
                onDone={() => handleDone(na)}
                onReschedule={(d) => handleReschedule(na, d)}
                onOpenPanel={() => setOpenEngagement(toQuickPanelEngagement(na.engagement))}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-body-sm uppercase tracking-[0.04em] text-text-muted">
          Fresh signups needing follow-up ({data.freshSignups.length})
        </h2>
        {data.freshSignups.length === 0 ? (
          <p className="text-body-sm text-text-muted">No unsaid hellos.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.freshSignups.map((e) => (
              <EngagementRow
                key={e.id}
                engagement={e}
                hint="signed up, no outbound touch yet"
                onOpenPanel={() => setOpenEngagement(toQuickPanelEngagement(e))}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-body-sm uppercase tracking-[0.04em] text-text-muted">
          Gone quiet ({data.goneQuiet.length})
        </h2>
        {data.goneQuiet.length === 0 ? (
          <p className="text-body-sm text-text-muted">Everyone&apos;s been heard from recently.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.goneQuiet.map((e) => (
              <EngagementRow
                key={e.id}
                engagement={e}
                hint={e.stage === "DORMANT" ? "dormant" : "no touch in 14+ days"}
                onOpenPanel={() => setOpenEngagement(toQuickPanelEngagement(e))}
              />
            ))}
          </ul>
        )}
      </section>

      {openEngagement && (
        <EngagementQuickPanel
          engagement={openEngagement}
          onClose={() => setOpenEngagement(null)}
          onStageChange={(stage) => handleStageChange(openEngagement.id, stage)}
          onPatch={(patch) =>
            setOpenEngagement((prev) => (prev ? { ...prev, ...patch } : prev))
          }
        />
      )}

      {pendingLost && (
        <LostReasonModal
          onConfirm={(reason) => {
            moveEngagementStage(pendingLost.engagementId, "LOST", reason).catch((err) => {
              console.error("Failed to move engagement stage", err);
            });
            setOpenEngagement((prev) =>
              prev && prev.id === pendingLost.engagementId ? { ...prev, stage: "LOST" } : prev,
            );
            setPendingLost(null);
          }}
          onCancel={() => setPendingLost(null)}
        />
      )}
    </div>
  );
}
