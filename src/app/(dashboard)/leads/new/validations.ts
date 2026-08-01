import { z } from "zod";

export const LEAD_SOURCE_OPTIONS = [
  "outreach",
  "referral",
  "inbound",
  "event",
  "social",
] as const;

// Doc 02 §1 — quick-add fields: name, phone, product, source, referred-by, one-line note.
// Plain strings (empty string = "not set") matching the pattern from
// contacts/validations.ts — keeps react-hook-form's resolver typing happy.
export const quickAddSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().max(40),
  productId: z.string().min(1, "Pick a product"),
  source: z.union([z.literal(""), z.enum(LEAD_SOURCE_OPTIONS)]),
  referredBy: z.union([z.literal(""), z.string().uuid()]),
  note: z.string().trim().max(500),
});

export type QuickAddFormValues = z.infer<typeof quickAddSchema>;
