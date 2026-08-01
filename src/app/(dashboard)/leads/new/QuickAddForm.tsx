"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { createNextAction } from "@/app/(dashboard)/contacts/[id]/actions";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createLead } from "./actions";
import { LEAD_SOURCE_OPTIONS, quickAddSchema, type QuickAddFormValues } from "./validations";
import type { PossibleDuplicate } from "@/db/queries/duplicates";

type ReferralOption = { id: string; name: string; company: string | null };
type ProductOption = { id: number; name: string };

export function QuickAddForm({
  referralOptions,
  products,
}: {
  referralOptions: ReferralOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<PossibleDuplicate[] | null>(null);
  const [created, setCreated] = useState<{ contactId: string; engagementId: string } | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      name: "",
      phone: "",
      productId: "",
      source: "",
      referredBy: "",
      note: "",
    },
  });

  async function submit(values: QuickAddFormValues, confirmed: boolean) {
    setFormError(null);
    const result = await createLead(values, confirmed);
    if (!result.success) {
      setFormError(result.error);
      if (result.duplicates) {
        setDuplicates(result.duplicates);
      }
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof QuickAddFormValues, { message: messages[0] });
        }
      }
      return;
    }
    setDuplicates(null);
    setCreated({ contactId: result.contactId, engagementId: result.engagementId });
  }

  const onSubmit = handleSubmit((values) => submit(values, false));

  async function continueAnyway() {
    await submit(getValues(), true);
  }

  if (created) {
    return (
      <SuccessState
        contactId={created.contactId}
        engagementId={created.engagementId}
        onDone={() => router.push(`/contacts/${created.contactId}`)}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {formError && (
        <p className="rounded-sm border border-danger bg-danger-soft px-3 py-2 text-body-sm text-danger">
          {formError}
        </p>
      )}

      {duplicates && duplicates.length > 0 && (
        <div className="flex flex-col gap-2 rounded-sm border border-warning bg-danger-soft/40 px-3 py-3">
          <p className="text-body-sm text-text">Possible matches already in the hub:</p>
          <ul className="flex flex-col gap-1">
            {duplicates.map((d) => (
              <li key={d.id} className="text-body-sm">
                <Link href={`/contacts/${d.id}`} className="text-accent hover:text-accent-hover">
                  {d.name}
                </Link>
                {d.company ? ` (${d.company})` : ""}
                {d.phone ? ` — ${d.phone}` : ""}
              </li>
            ))}
          </ul>
          <div>
            <Button type="button" variant="secondary" onClick={continueAnyway}>
              This is someone new — continue
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-body-sm text-danger">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" {...register("phone")} placeholder="+2609..." />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="productId">Product</Label>
        <Select id="productId" {...register("productId")}>
          <option value="">Pick a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        {errors.productId && (
          <p className="text-body-sm text-danger">{errors.productId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source">Source</Label>
          <Select id="source" {...register("source")}>
            <option value="">—</option>
            {LEAD_SOURCE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="referredBy">Referred by</Label>
          <Select id="referredBy" {...register("referredBy")}>
            <option value="">—</option>
            {referralOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` (${c.company})` : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" rows={2} {...register("note")} placeholder="One line is plenty" />
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          Add lead
        </Button>
      </div>
    </form>
  );
}

function SuccessState({
  contactId,
  engagementId,
  onDone,
}: {
  contactId: string;
  engagementId: string;
  onDone: () => void;
}) {
  const [addingNextAction, setAddingNextAction] = useState(false);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ description: string; dueDate: string }>({
    defaultValues: { description: "", dueDate: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createNextAction(contactId, {
      engagementId,
      description: values.description,
      dueDate: values.dueDate,
    });
    if (result.success) setSaved(true);
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-lg text-text">Lead added.</p>

      {!addingNextAction && !saved && (
        <div className="flex gap-3">
          <Button type="button" onClick={() => setAddingNextAction(true)}>
            Add next action now
          </Button>
          <Button type="button" variant="secondary" onClick={onDone}>
            Done
          </Button>
        </div>
      )}

      {addingNextAction && !saved && (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Next action</Label>
            <Input
              id="description"
              {...register("description", { required: "Description is required" })}
              placeholder="Follow up on trial"
            />
            {errors.description && (
              <p className="text-body-sm text-danger">{errors.description.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      )}

      {saved && (
        <div className="flex flex-col gap-3">
          <p className="text-body-sm text-success">Next action saved.</p>
          <div>
            <Button type="button" onClick={onDone}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
