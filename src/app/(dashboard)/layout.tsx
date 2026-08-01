import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileTabBar, SidebarNav } from "./NavLinks";
import { QuickAddShortcut } from "./QuickAddShortcut";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-full flex-1">
      <QuickAddShortcut />
      {/* Desktop sidebar — §3.2 */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border lg:bg-bg-raised">
        <div className="px-6 py-6">
          <span className="font-display text-body-lg font-bold uppercase tracking-[0.04em] text-text">
            Insaka Lwendo
          </span>
        </div>
        <SidebarNav />
        <div className="border-t border-border px-3 py-4">
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — §3.3 */}
      <MobileTabBar />
    </div>
  );
}
