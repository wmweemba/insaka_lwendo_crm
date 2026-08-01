import { Mail, MessageCircle, Phone, Send, Settings, Share2, Users } from "lucide-react";

const CHANNEL_ICON = {
  whatsapp: MessageCircle,
  telegram: Send,
  call: Phone,
  in_person: Users,
  email: Mail,
  social: Share2,
  system: Settings,
} as const;

type TimelineEntry = {
  id: string;
  happenedAt: Date;
  channel: keyof typeof CHANNEL_ICON;
  direction: string;
  summary: string;
  productName: string;
};

export function Timeline({
  engagements,
}: {
  engagements: {
    product: { name: string };
    interactions: {
      id: string;
      happenedAt: Date;
      channel: TimelineEntry["channel"];
      direction: string;
      summary: string;
    }[];
  }[];
}) {
  const entries: TimelineEntry[] = engagements
    .flatMap((e) =>
      e.interactions.map((i) => ({ ...i, productName: e.product.name })),
    )
    .sort((a, b) => b.happenedAt.getTime() - a.happenedAt.getTime());

  if (entries.length === 0) {
    return <p className="text-body-sm text-text-muted">No interactions logged yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-4 border-l border-border pl-4">
      {entries.map((entry) => {
        const Icon = CHANNEL_ICON[entry.channel];
        const isSystem = entry.channel === "system";
        return (
          <li
            key={entry.id}
            className={
              isSystem
                ? "border-l border-dashed border-text-faint pl-4 -ml-[calc(1rem+1px)]"
                : ""
            }
          >
            <div
              className={`flex items-start gap-2 ${isSystem ? "text-text-faint" : "text-text"}`}
            >
              <Icon size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <p className="text-body-sm">{entry.summary}</p>
                <p className="font-mono text-mono text-text-muted">
                  {entry.productName} · {entry.direction} ·{" "}
                  {entry.happenedAt.toLocaleString()}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
