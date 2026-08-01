"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { deleteContact } from "../actions";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm("Delete this contact? This can't be undone.")) return;
    const result = await deleteContact(contactId);
    if (!result.success) {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" variant="danger" onClick={onDelete}>
        Delete contact
      </Button>
      {error && <p className="max-w-xs text-right text-body-sm text-danger">{error}</p>}
    </div>
  );
}
