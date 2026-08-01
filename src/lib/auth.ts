import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { count } from "drizzle-orm";
import { db } from "@/db";
import * as authSchema from "@/db/auth-schema";
import { user } from "@/db/auth-schema";

// Single-admin CRM (CLAUDE.md): Better Auth's own sign-up endpoint stays wired
// up (simplest way to create the first admin), but this hook closes it after
// that first account exists — nobody else should ever be able to register.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          const [{ value: existing }] = await db
            .select({ value: count() })
            .from(user);
          if (existing > 0) {
            throw new APIError("FORBIDDEN", {
              message:
                "Sign-ups are closed — Insaka Lwendo CRM is single-admin.",
            });
          }
        },
      },
    },
  },
});
