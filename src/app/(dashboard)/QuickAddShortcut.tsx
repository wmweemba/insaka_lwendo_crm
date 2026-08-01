"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Doc 03 screen 4 — Quick-add is also reachable via keyboard shortcut on desktop.
export function QuickAddShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/leads/new");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
