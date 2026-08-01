import { z } from "zod";

export const CONTACT_SOURCE_OPTIONS = [
  "outreach",
  "referral",
  "inbound",
  "event",
  "social",
] as const;

// Doc 01 §contacts. Every field is a plain string matching what native <input>/<select>
// elements actually produce (never `undefined`) — empty string is a valid "not set" value
// here, and gets converted to `undefined` at the DB-write boundary in actions.ts. This
// keeps the schema's input/output types identical, which react-hook-form's resolver typing
// needs (z.preprocess makes the input type `unknown` and breaks that inference).
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  company: z.string().trim().max(200),
  phone: z.string().trim().max(40),
  phoneAlt: z.string().trim().max(500), // raw comma-separated input from the form
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  source: z.union([z.literal(""), z.enum(CONTACT_SOURCE_OPTIONS)]),
  referredBy: z.union([z.literal(""), z.string().uuid()]),
  notes: z.string().trim().max(4000),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

// Doc 01 §engagements — new engagements always start at LEAD; stage is edited
// afterward via updateEngagement.
export const createEngagementSchema = z.object({
  productId: z.string().min(1, "Pick a product"),
  tier: z.union([z.literal(""), z.enum(["1", "2", "3"])]),
  interestNote: z.string().trim().max(2000),
});

export type CreateEngagementFormValues = z.infer<typeof createEngagementSchema>;

export const STAGE_VALUES = [
  "LEAD",
  "CONTACTED",
  "IN_CONVERSATION",
  "TRIALING",
  "SIGNED_UP",
  "ACTIVE",
  "PAYING",
  "DORMANT",
  "LOST",
] as const;

export const updateEngagementSchema = z.object({
  stage: z.enum(STAGE_VALUES),
  tier: z.union([z.literal(""), z.enum(["1", "2", "3"])]),
  interestNote: z.string().trim().max(2000),
  lostReason: z.string().trim().max(500),
});

export type UpdateEngagementFormValues = z.infer<typeof updateEngagementSchema>;
