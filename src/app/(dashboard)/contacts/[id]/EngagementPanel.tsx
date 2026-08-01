"use client";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { deleteEngagement, updateEngagement } from "../actions";
import { markEngagementReviewed } from "./actions";
import {
  STAGE_VALUES,
  updateEngagementSchema,
  type UpdateEngagementFormValues,
} from "../validations";
import { NextActionsList } from "./NextActionsList";

export function EngagementPanel({
  contactId,
  engagement,
}: {
  contactId: string;
  engagement: {
    id: string;
    productName: string;
    stage: (typeof STAGE_VALUES)[number];
    tier: number | null;
    interestNote: string | null;
    needsReview: boolean;
    nextActions: { id: string; description: string; dueDate: string | null }[];
  };
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateEngagementFormValues>({
    resolver: zodResolver(updateEngagementSchema),
    defaultValues: {
      stage: engagement.stage,
      tier: engagement.tier ? (String(engagement.tier) as "1" | "2" | "3") : "",
      interestNote: engagement.interestNote ?? "",
      lostReason: "",
    },
  });

  const selectedStage = watch("stage");
  const movingToLost = selectedStage === "LOST" && engagement.stage !== "LOST";

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await updateEngagement(engagement.id, contactId, values);
    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof UpdateEngagementFormValues, { message: messages[0] });
        }
      }
    }
  });

  async function onDelete() {
    if (!confirm(`Remove the ${engagement.productName} engagement?`)) return;
    const result = await deleteEngagement(engagement.id, contactId);
    if (!result.success) {
      setFormError(result.error);
    }
  }

  async function onMarkReviewed() {
    const result = await markEngagementReviewed(engagement.id, contactId);
    if (!result.success) {
      setFormError(result.error);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-body-lg font-semibold text-text">{engagement.productName}</h3>
          {engagement.needsReview && (
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-body-sm text-warning">
              Needs review
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {engagement.needsReview && (
            <Button type="button" variant="secondary" onClick={onMarkReviewed}>
              Mark reviewed
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onDelete}>
            Remove
          </Button>
        </div>
      </div>

      {formError && (
        <p className="rounded-sm border border-danger bg-danger-soft px-3 py-2 text-body-sm text-danger">
          {formError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`stage-${engagement.id}`}>Stage</Label>
          <Select id={`stage-${engagement.id}`} {...register("stage")}>
            {STAGE_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tier-${engagement.id}`}>Tier</Label>
          <Select id={`tier-${engagement.id}`} {...register("tier")}>
            <option value="">—</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`interestNote-${engagement.id}`}>Interest note</Label>
        <Textarea id={`interestNote-${engagement.id}`} rows={2} {...register("interestNote")} />
      </div>

      {movingToLost && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`lostReason-${engagement.id}`}>Reason for Lost</Label>
          <Textarea id={`lostReason-${engagement.id}`} rows={2} {...register("lostReason")} />
          {errors.lostReason && (
            <p className="text-body-sm text-danger">{errors.lostReason.message}</p>
          )}
        </div>
      )}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          Save changes
        </Button>
      </div>

      {engagement.nextActions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Open next actions</Label>
          <NextActionsList contactId={contactId} nextActions={engagement.nextActions} />
        </div>
      )}
    </form>
  );
}
