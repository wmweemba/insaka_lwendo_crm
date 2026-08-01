import { z } from "zod";

// Doc 02 §3 payload shape. `event` stays a plain string, not an enum — the
// endpoint is deliberately schema-ready for future events
// (subscription.activated, payment.recorded) it doesn't process yet.
export const signupPayloadSchema = z.object({
  app: z.string().trim().min(1),
  event: z.string().trim().min(1),
  occurredAt: z.string().trim().min(1),
  user: z.object({
    id: z.string().trim().min(1),
    email: z.string().trim().email().optional(),
    name: z.string().trim().min(1).optional(),
    businessName: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(1).optional(),
  }),
});

export type SignupPayload = z.infer<typeof signupPayloadSchema>;
