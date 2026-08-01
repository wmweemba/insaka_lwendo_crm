"use client";

import { Button } from "@/components/ui/Button";
import type { PipelineEngagement } from "@/db/queries/pipeline";

function toCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportCsvButton({ engagements }: { engagements: PipelineEngagement[] }) {
  function onExport() {
    const header = ["Name", "Product", "Stage", "Tier", "Last interaction", "Next action"];
    const rows = engagements.map((e) => [
      e.contact.name,
      e.product.name,
      e.stage,
      e.tier?.toString() ?? "",
      e.interactions[0]?.happenedAt
        ? new Date(e.interactions[0].happenedAt).toISOString().slice(0, 10)
        : "",
      e.nextActions[0]?.dueDate ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="secondary" onClick={onExport}>
      Export CSV
    </Button>
  );
}
