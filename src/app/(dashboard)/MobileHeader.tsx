"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

// Mobile top bar — §3.3 doesn't spec this, but the bottom tab bar has no
// room for account actions (4 tabs, center one raised), so sign-out needs
// a home here instead of a 5th tab.
export function MobileHeader() {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg-raised px-4 py-3 lg:hidden">
      <span className="font-display text-body-lg font-bold uppercase tracking-[0.04em] text-text">
        Insaka Lwendo
      </span>
      <button
        type="button"
        aria-label="Sign out"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-sm text-text-muted transition-colors hover:text-text"
        onClick={async () => {
          await authClient.signOut();
          router.push("/sign-in");
          router.refresh();
        }}
      >
        <LogOut size={20} strokeWidth={1.75} />
      </button>
    </header>
  );
}
