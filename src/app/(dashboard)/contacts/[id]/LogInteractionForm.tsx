"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createNextAction, logInteraction } from "./actions";
import { INTERACTION_CHANNEL_OPTIONS, INTERACTION_DIRECTION_OPTIONS } from "./validations";

function nowForDatetimeLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

type EngagementOption = { id: string; productName: string };

export function LogInteractionForm({
  contactId,
  engagements,
}: {
  contactId: string;
  engagements: EngagementOption[];
}) {
  const [stage, setStage] = useState<"log" | "next-action" | "done">("log");
  const [loggedEngagementId, setLoggedEngagementId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const logForm = useForm<{
    engagementId: string;
    channel: (typeof INTERACTION_CHANNEL_OPTIONS)[number];
    direction: (typeof INTERACTION_DIRECTION_OPTIONS)[number];
    summary: string;
    happenedAt: string;
  }>({
    defaultValues: {
      engagementId: engagements[0]?.id ?? "",
      channel: "whatsapp",
      direction: "inbound",
      summary: "",
      happenedAt: nowForDatetimeLocal(),
    },
  });

  const nextActionForm = useForm<{ description: string; dueDate: string }>({
    defaultValues: { description: "", dueDate: "" },
  });

  const onLogSubmit = logForm.handleSubmit(async (values) => {
    setFormError(null);
    const result = await logInteraction(contactId, values);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    setLoggedEngagementId(values.engagementId);
    setStage("next-action");
  });

  const onNextActionSubmit = nextActionForm.handleSubmit(async (values) => {
    if (!loggedEngagementId) return;
    const result = await createNextAction(contactId, {
      engagementId: loggedEngagementId,
      description: values.description,
      dueDate: values.dueDate,
    });
    if (result.success) setStage("done");
  });

  if (engagements.length === 0) return null;

  if (stage === "next-action") {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <p className="text-body text-text">Interaction logged. What&apos;s the next action?</p>
        <form onSubmit={onNextActionSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="next-description">Next action</Label>
            <Input
              id="next-description"
              {...nextActionForm.register("description", {
                required: "Description is required",
              })}
              placeholder="Follow up on trial"
            />
            {nextActionForm.formState.errors.description && (
              <p className="text-body-sm text-danger">
                {nextActionForm.formState.errors.description.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="next-dueDate">Due date</Label>
            <Input id="next-dueDate" type="date" {...nextActionForm.register("dueDate")} />
          </div>
          <div className="flex gap-3">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={() => setStage("done")}>
              Skip
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-surface p-4">
        <p className="text-body-sm text-success">Logged.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            logForm.reset({
              engagementId: engagements[0]?.id ?? "",
              channel: "whatsapp",
              direction: "inbound",
              summary: "",
              happenedAt: nowForDatetimeLocal(),
            });
            setLoggedEngagementId(null);
            setStage("log");
          }}
        >
          Log another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onLogSubmit}
      className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
    >
      <h3 className="text-body-lg font-semibold text-text">Log interaction</h3>

      {formError && (
        <p className="rounded-sm border border-danger bg-danger-soft px-3 py-2 text-body-sm text-danger">
          {formError}
        </p>
      )}

      {engagements.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-engagementId">Product</Label>
          <Select id="log-engagementId" {...logForm.register("engagementId")}>
            {engagements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.productName}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-channel">Channel</Label>
          <Select id="log-channel" {...logForm.register("channel")}>
            {INTERACTION_CHANNEL_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-direction">Direction</Label>
          <Select id="log-direction" {...logForm.register("direction")}>
            {INTERACTION_DIRECTION_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="log-happenedAt">When</Label>
        <Input id="log-happenedAt" type="datetime-local" {...logForm.register("happenedAt")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="log-summary">Summary</Label>
        <Textarea
          id="log-summary"
          rows={2}
          {...logForm.register("summary", { required: "Summary is required" })}
        />
        {logForm.formState.errors.summary && (
          <p className="text-body-sm text-danger">{logForm.formState.errors.summary.message}</p>
        )}
      </div>

      <div>
        <Button type="submit" disabled={logForm.formState.isSubmitting}>
          Log interaction
        </Button>
      </div>
    </form>
  );
}
