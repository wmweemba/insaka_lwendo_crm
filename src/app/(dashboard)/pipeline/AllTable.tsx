import type { PipelineEngagement } from "@/db/queries/pipeline";
import Link from "next/link";
import { ExportCsvButton } from "./ExportCsvButton";

// doc 03 — the "All" view is flat (no glass), zebra-free, hairline row borders.
export function AllTable({ engagements }: { engagements: PipelineEngagement[] }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExportCsvButton engagements={engagements} />
      </div>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-left text-body">
          <thead className="sticky top-0 bg-bg-raised text-body-sm text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Stage</th>
              <th className="px-4 py-2 font-medium">Tier</th>
              <th className="px-4 py-2 font-medium">Last interaction</th>
              <th className="px-4 py-2 font-medium">Next action</th>
            </tr>
          </thead>
          <tbody>
            {engagements.map((e) => {
              const dueDate = e.nextActions[0]?.dueDate;
              const overdue = dueDate ? dueDate < today : false;
              return (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <Link
                      href={`/contacts/${e.contact.id}`}
                      className="text-text hover:text-accent"
                    >
                      {e.contact.name}
                    </Link>
                    {e.needsReview && (
                      <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-body-sm text-warning">
                        Needs review
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-text-muted">{e.product.name}</td>
                  <td className="px-4 py-2 text-text-muted">{e.stage}</td>
                  <td className="px-4 py-2 text-text-muted">{e.tier ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-mono text-text-muted">
                    {e.interactions[0]?.happenedAt
                      ? new Date(e.interactions[0].happenedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td
                    className={`px-4 py-2 font-mono text-mono ${overdue ? "text-danger" : "text-text-muted"}`}
                  >
                    {dueDate ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
