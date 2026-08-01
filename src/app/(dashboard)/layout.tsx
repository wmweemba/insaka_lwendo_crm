import { CalendarDays, KanbanSquare, Plus, Users } from "lucide-react";
import Link from "next/link";
import { QuickAddShortcut } from "./QuickAddShortcut";

// Nav shell per ui_spec.md §3.2 (desktop sidebar) / §3.3 (mobile bottom tab bar).
// Only This Week (a separate, later doc 03 screen) stays muted now.
const NAV_ITEMS = [
  { label: "This Week", href: "/", icon: CalendarDays, live: false },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare, live: true },
  { label: "Contacts", href: "/contacts", icon: Users, live: true },
  { label: "Quick-add", href: "/leads/new", icon: Plus, live: true },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} {...item} />
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — §3.3 */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-border bg-bg-raised/90 py-2 backdrop-blur-md lg:hidden">
        {NAV_ITEMS.map((item) => (
          <MobileTab key={item.href} {...item} />
        ))}
      </nav>
    </div>
  );
}

function SidebarLink({
  label,
  href,
  icon: Icon,
  live,
}: (typeof NAV_ITEMS)[number]) {
  if (!live) {
    return (
      <span className="flex cursor-default items-center gap-3 rounded-sm px-3 py-2 text-body text-text-faint">
        <Icon size={18} strokeWidth={1.75} />
        {label}
        <span className="ml-auto text-body-sm text-text-faint">soon</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="relative flex items-center gap-3 rounded-sm border-l-2 border-accent bg-accent-soft px-3 py-2 text-body text-text shadow-[0_0_12px_-4px_var(--accent-soft)]"
    >
      <Icon size={18} strokeWidth={1.75} />
      {label}
    </Link>
  );
}

function MobileTab({ label, href, icon: Icon, live }: (typeof NAV_ITEMS)[number]) {
  if (!live) {
    return (
      <span className="flex min-w-11 min-h-11 flex-col items-center justify-center gap-0.5 text-text-faint">
        <Icon size={20} strokeWidth={1.75} />
        <span className="text-body-sm">{label}</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="flex min-w-11 min-h-11 flex-col items-center justify-center gap-0.5 text-accent"
    >
      <Icon size={20} strokeWidth={1.75} />
      <span className="text-body-sm">{label}</span>
    </Link>
  );
}
