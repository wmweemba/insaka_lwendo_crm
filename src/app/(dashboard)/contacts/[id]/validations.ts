import { z } from "zod";

// Doc 01 §interactions — `system` is reserved for auto-logged events (signup
// webhooks, automated stage changes), not something a human picks here.
export const INTERACTION_CHANNEL_OPTIONS = [
  "whatsapp",
  "telegram",
  "call",
  "in_person",
  "email",
  "social",
] as const;

export const INTERACTION_DIRECTION_OPTIONS = ["outbound", "inbound", "note"] as const;

export const logInteractionSchema = z.object({
  engagementId: z.string().uuid(),
  channel: z.enum(INTERACTION_CHANNEL_OPTIONS),
  direction: z.enum(INTERACTION_DIRECTION_OPTIONS),
  summary: z.string().trim().min(1, "Summary is required").max(2000),
  happenedAt: z.string().min(1, "When did this happen?"),
});

export type LogInteractionFormValues = z.infer<typeof logInteractionSchema>;

export const nextActionSchema = z.object({
  engagementId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required").max(500),
  dueDate: z.string(), // "" or "YYYY-MM-DD" from a native date input
});

export type NextActionFormValues = z.infer<typeof nextActionSchema>;
