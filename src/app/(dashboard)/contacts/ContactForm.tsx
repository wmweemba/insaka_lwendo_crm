"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createContact, updateContact } from "./actions";
import { CONTACT_SOURCE_OPTIONS, contactSchema, type ContactFormValues } from "./validations";

type ReferralOption = { id: string; name: string; company: string | null };

export function ContactForm({
  mode,
  contactId,
  defaultValues,
  referralOptions,
}: {
  mode: "create" | "edit";
  contactId?: string;
  defaultValues?: Partial<ContactFormValues>;
  referralOptions: ReferralOption[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      phoneAlt: "",
      email: "",
      source: "",
      referredBy: "",
      notes: "",
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result =
      mode === "create"
        ? await createContact(values)
        : await updateContact(contactId!, values);

    if (result && !result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof ContactFormValues, { message: messages[0] });
        }
      }
      return;
    }
    // On success, the action itself redirects — nothing else to do here.
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
      {formError && (
        <p className="rounded-sm border border-danger bg-danger-soft px-3 py-2 text-body-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-body-sm text-danger">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company">Company</Label>
        <Input id="company" {...register("company")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} placeholder="+2609..." />
          {errors.phone && <p className="text-body-sm text-danger">{errors.phone.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-body-sm text-danger">{errors.email.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phoneAlt">Other phone numbers</Label>
        <Input id="phoneAlt" {...register("phoneAlt")} placeholder="comma-separated" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source">Source</Label>
          <Select id="source" {...register("source")}>
            <option value="">—</option>
            {CONTACT_SOURCE_OPTIONS.map((value) => (
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
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={4} {...register("notes")} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {mode === "create" ? "Add contact" : "Save changes"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
