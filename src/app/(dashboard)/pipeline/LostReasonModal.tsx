"use client";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { useState } from "react";

// §5.3 — drop into LOST blocks until a reason is entered or the drag is
// cancelled. Centered modal on desktop; same treatment stands in for the
// bottom-sheet variant on mobile too, kept simple for this pass.
export function LostReasonModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (reason.trim() === "") {
      setError("A reason is required.");
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h3 className="text-body-lg font-semibold text-text">Reason for Lost</h3>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lost-reason">What happened?</Label>
          <Textarea
            id="lost-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          {error && <p className="text-body-sm text-danger">{error}</p>}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="danger" onClick={confirm}>
            Move to Lost
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
