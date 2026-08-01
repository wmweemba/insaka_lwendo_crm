"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useState } from "react";
import { mergeContacts } from "../merge-actions";

type ContactOption = { id: string; name: string; company: string | null };

export function MergeContactForm({
  contactId,
  contactName,
  options,
}: {
  contactId: string;
  contactName: string;
  options: ContactOption[];
}) {
  const [targetId, setTargetId] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (options.length === 0) return null;

  async function onMerge() {
    if (!targetId) return;
    const target = options.find((o) => o.id === targetId);
    if (!target) return;
    if (
      !confirm(
        `Merge ${contactName} into ${target.name}? ${contactName} will be deleted; its engagements, interactions, and phone numbers move to ${target.name}.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    // No try/catch here: on success mergeContacts() calls redirect(), which
    // throws a special Next.js control-flow error that must propagate, not
    // be swallowed as a failure.
    const result = await mergeContacts(contactId, targetId);
    if (!result.success) {
      setError(result.error);
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Merge into another contact
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-border bg-surface p-3">
      {error && <p className="text-body-sm text-danger">{error}</p>}
      <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
        <option value="">Pick the contact to merge into…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.company ? ` (${o.company})` : ""}
          </option>
        ))}
      </Select>
      <div className="flex gap-2">
        <Button type="button" variant="danger" disabled={!targetId || pending} onClick={onMerge}>
          Merge
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
