"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      className="w-full justify-start px-3"
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
    >
      <LogOut size={18} strokeWidth={1.75} />
      Sign out
    </Button>
  );
}
