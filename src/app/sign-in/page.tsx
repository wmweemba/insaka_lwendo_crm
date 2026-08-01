import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { auth } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/");
  }

  const [{ value: userCount }] = await db.select({ value: count() }).from(user);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="card-glass w-full max-w-sm p-8">
        <span className="font-display text-body-lg font-bold uppercase tracking-[0.04em] text-text">
          Insaka Lwendo
        </span>
        <h1 className="mt-4 text-display-sm font-display font-bold uppercase tracking-[0.04em] text-text">
          {userCount === 0 ? "Create admin account" : "Sign in"}
        </h1>
        <p className="mt-1 text-body-sm text-text-muted">
          {userCount === 0
            ? "One-time setup — this becomes the only account this hub ever allows."
            : "Single-admin hub — sign in to reach the fire."}
        </p>
        <SignInForm firstRun={userCount === 0} />
      </div>
    </div>
  );
}
