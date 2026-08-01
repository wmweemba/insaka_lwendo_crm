"use client";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createEngagement } from "../actions";
import { createEngagementSchema, type CreateEngagementFormValues } from "../validations";

export function AddEngagementForm({
  contactId,
  availableProducts,
}: {
  contactId: string;
  availableProducts: { id: number; name: string }[];
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateEngagementFormValues>({
    resolver: zodResolver(createEngagementSchema),
    defaultValues: { productId: "", tier: "", interestNote: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await createEngagement(contactId, values);
    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof CreateEngagementFormValues, { message: messages[0] });
        }
      }
      return;
    }
    reset({ productId: "", tier: "", interestNote: "" });
    setDone(true);
  });

  if (availableProducts.length === 0) return null;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-md border border-dashed border-border p-4"
    >
      <h3 className="text-body-lg font-semibold text-text">Add engagement</h3>

      {formError && (
        <p className="rounded-sm border border-danger bg-danger-soft px-3 py-2 text-body-sm text-danger">
          {formError}
        </p>
      )}
      {done && <p className="text-body-sm text-success">Engagement added.</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-productId">Product</Label>
          <Select id="new-productId" {...register("productId")}>
            <option value="">Pick a product…</option>
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          {errors.productId && (
            <p className="text-body-sm text-danger">{errors.productId.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-tier">Tier</Label>
          <Select id="new-tier" {...register("tier")}>
            <option value="">—</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-interestNote">Interest note</Label>
        <Textarea id="new-interestNote" rows={2} {...register("interestNote")} />
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          Add engagement
        </Button>
      </div>
    </form>
  );
}
