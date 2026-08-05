"use client";

import { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";
import {
  createNextAction,
  logInteraction,
  markEngagementReviewed,
  rescheduleNextAction,
  completeNextAction,
  cancelNextAction,
} from "@/app/(dashboard)/contacts/[id]/actions";
import {
  INTERACTION_CHANNEL_OPTIONS,
  INTERACTION_DIRECTION_OPTIONS,
} from "@/app/(dashboard)/contacts/[id]/validations";
import { updateEngagement } from "@/app/(dashboard)/contacts/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Stage = (typeof STAGE_VALUES)[number];
type NextAction = { id: string; description: string; dueDate: string | null };

export type QuickPanelEngagement = {
  id: string;
  stage: Stage;
  tier: number | null;
  interestNote: string | null;
  needsReview: boolean;
  contact: { id: string; name: string; company: string | null };
  product: { id: number; name: string };
  nextActions: NextAction[];
};

function nowForDatetimeLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Opened by tapping/clicking a pipeline card (desktop drag still moves stage
// directly; this is the "more versatility than just moving buckets" ask —
// view/update the engagement, log an interaction, manage next actions,
// without leaving the board. Centered modal on desktop, bottom sheet on
// mobile, same treatment as LostReasonModal.
export function EngagementQuickPanel({
  engagement,
  onClose,
  onStageChange,
  onPatch,
}: {
  engagement: QuickPanelEngagement;
  onClose: () => void;
  onStageChange: (stage: Stage) => void;
  onPatch: (patch: {
    tier?: number | null;
    interestNote?: string | null;
    needsReview?: boolean;
    nextActions?: NextAction[];
  }) => void;
}) {
  const [tier, setTier] = useState(engagement.tier ? String(engagement.tier) : "");
  const [interestNote, setInterestNote] = useState(engagement.interestNote ?? "");
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [nextActions, setNextActions] = useState(engagement.nextActions);
  const [naDescription, setNaDescription] = useState("");
  const [naDueDate, setNaDueDate] = useState("");
  const [naPending, setNaPending] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = useState("");

  const [channel, setChannel] = useState<(typeof INTERACTION_CHANNEL_OPTIONS)[number]>("whatsapp");
  const [direction, setDirection] =
    useState<(typeof INTERACTION_DIRECTION_OPTIONS)[number]>("inbound");
  const [summary, setSummary] = useState("");
  const [happenedAt, setHappenedAt] = useState(nowForDatetimeLocal());
  const [logError, setLogError] = useState<string | null>(null);
  const [logConfirmed, setLogConfirmed] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);

  function patchNextActions(next: NextAction[]) {
    setNextActions(next);
    onPatch({ nextActions: next });
  }

  async function onSaveDetails() {
    setDetailsError(null);
    setDetailsSaved(false);
    const result = await updateEngagement(engagement.id, engagement.contact.id, {
      stage: engagement.stage,
      tier: tier === "" ? "" : (tier as "1" | "2" | "3"),
      interestNote,
      lostReason: "",
    });
    if (!result.success) {
      setDetailsError(result.error);
      return;
    }
    onPatch({ tier: tier === "" ? null : Number(tier), interestNote: interestNote || null });
    setDetailsSaved(true);
  }

  async function onMarkReviewed() {
    const result = await markEngagementReviewed(engagement.id, engagement.contact.id);
    if (result.success) onPatch({ needsReview: false });
  }

  async function onAddNextAction() {
    if (naDescription.trim() === "") return;
    const result = await createNextAction(engagement.contact.id, {
      engagementId: engagement.id,
      description: naDescription.trim(),
      dueDate: naDueDate,
    });
    if (!result.success) return;
    patchNextActions([...nextActions, result.nextAction]);
    setNaDescription("");
    setNaDueDate("");
  }

  async function onCompleteNextAction(id: string) {
    setNaPending(id);
    await completeNextAction(id, engagement.contact.id);
    patchNextActions(nextActions.filter((na) => na.id !== id));
    setNaPending(null);
  }

  async function onCancelNextAction(id: string) {
    setNaPending(id);
    await cancelNextAction(id, engagement.contact.id);
    patchNextActions(nextActions.filter((na) => na.id !== id));
    setNaPending(null);
  }

  async function onReschedule(id: string, dueDate: string) {
    setNaPending(id);
    await rescheduleNextAction(id, engagement.contact.id, dueDate);
    patchNextActions(nextActions.map((na) => (na.id === id ? { ...na, dueDate } : na)));
    setNaPending(null);
    setReschedulingId(null);
  }

  async function onLogInteraction() {
    if (summary.trim() === "") {
      setLogError("Summary is required.");
      return;
    }
    setLogSubmitting(true);
    setLogError(null);
    const result = await logInteraction(engagement.contact.id, {
      engagementId: engagement.id,
      channel,
      direction,
      summary: summary.trim(),
      happenedAt,
    });
    setLogSubmitting(false);
    if (!result.success) {
      setLogError(result.error);
      return;
    }
    setSummary("");
    setHappenedAt(nowForDatetimeLocal());
    setLogConfirmed(true);
    setTimeout(() => setLogConfirmed(false), 3000);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 lg:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-lg border-t border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:rounded-lg lg:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/contacts/${engagement.contact.id}`}
              className="text-body-lg text-text hover:text-accent"
            >
              {engagement.contact.name}
            </Link>
            {engagement.contact.company && (
              <p className="text-body-sm text-text-muted">{engagement.contact.company}</p>
            )}
            <p className="text-body-sm text-text-muted">{engagement.product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-11 min-w-11 items-center justify-center text-text-muted hover:text-text"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {engagement.needsReview && (
          <div className="flex items-center justify-between rounded-sm border border-warning bg-warning/10 px-3 py-2">
            <span className="text-body-sm text-warning">
              Signup couldn&apos;t be matched to an existing contact
            </span>
            <Button type="button" variant="secondary" onClick={onMarkReviewed}>
              Mark reviewed
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qp-stage">Stage</Label>
              <Select
                id="qp-stage"
                value={engagement.stage}
                onChange={(e) => onStageChange(e.target.value as Stage)}
              >
                {STAGE_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qp-tier">Tier</Label>
              <Select id="qp-tier" value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="">—</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-note">Interest note</Label>
            <Textarea
              id="qp-note"
              rows={2}
              value={interestNote}
              onChange={(e) => setInterestNote(e.target.value)}
            />
          </div>
          {detailsError && <p className="text-body-sm text-danger">{detailsError}</p>}
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={onSaveDetails}>
              Save details
            </Button>
            {detailsSaved && <span className="text-body-sm text-success">Saved.</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <Label>Next actions</Label>
          {nextActions.length === 0 ? (
            <p className="text-body-sm text-text-muted">Nothing open.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {nextActions.map((na) => {
                const overdue = na.dueDate ? na.dueDate < new Date().toISOString().slice(0, 10) : false;
                return (
                  <li
                    key={na.id}
                    className="flex flex-col gap-2 rounded-sm border border-border bg-bg px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-body-sm text-text">{na.description}</span>
                        {na.dueDate && (
                          <span
                            className={`font-mono text-mono ${overdue ? "text-danger" : "text-text-muted"}`}
                          >
                            Due {na.dueDate}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={naPending === na.id}
                          onClick={() => onCompleteNextAction(na.id)}
                        >
                          Done
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={naPending === na.id}
                          onClick={() => {
                            const next = reschedulingId === na.id ? null : na.id;
                            setReschedulingId(next);
                            setRescheduleDraft(next ? (na.dueDate ?? "") : "");
                          }}
                        >
                          Reschedule
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={naPending === na.id}
                          onClick={() => onCancelNextAction(na.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                    {reschedulingId === na.id && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={rescheduleDraft}
                          onChange={(e) => setRescheduleDraft(e.target.value)}
                          className="w-auto"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onReschedule(na.id, rescheduleDraft)}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder="New next action…"
              value={naDescription}
              onChange={(e) => setNaDescription(e.target.value)}
            />
            <Input
              type="date"
              value={naDueDate}
              onChange={(e) => setNaDueDate(e.target.value)}
              className="w-auto"
            />
            <Button type="button" variant="secondary" onClick={onAddNextAction}>
              Add
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <Label>Log interaction</Label>
          {logError && <p className="text-body-sm text-danger">{logError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qp-channel">Channel</Label>
              <Select
                id="qp-channel"
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as (typeof INTERACTION_CHANNEL_OPTIONS)[number])
                }
              >
                {INTERACTION_CHANNEL_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qp-direction">Direction</Label>
              <Select
                id="qp-direction"
                value={direction}
                onChange={(e) =>
                  setDirection(e.target.value as (typeof INTERACTION_DIRECTION_OPTIONS)[number])
                }
              >
                {INTERACTION_DIRECTION_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-happenedAt">When</Label>
            <Input
              id="qp-happenedAt"
              type="datetime-local"
              value={happenedAt}
              onChange={(e) => setHappenedAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-summary">Summary</Label>
            <Textarea
              id="qp-summary"
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" disabled={logSubmitting} onClick={onLogInteraction}>
              Log interaction
            </Button>
            {logConfirmed && <span className="text-body-sm text-success">Logged.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
