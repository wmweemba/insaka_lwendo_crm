import { getThisWeekData } from "@/db/queries/thisWeek";
import { currentTimestamp } from "@/lib/now";
import { ThisWeekView } from "./ThisWeekView";

export default async function ThisWeekPage() {
  const data = await getThisWeekData(currentTimestamp());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-display-sm uppercase tracking-[0.04em] text-text">
        This Week
      </h1>
      <ThisWeekView data={data} />
    </div>
  );
}
