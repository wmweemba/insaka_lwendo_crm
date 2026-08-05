"use client";

import { CalendarDays, KanbanSquare, Plus, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Nav shell per ui_spec.md §3.2 (desktop sidebar) / §3.3 (mobile bottom tab bar).
export const NAV_ITEMS = [
  { label: "This Week", href: "/", icon: CalendarDays, live: true },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare, live: true },
  { label: "Contacts", href: "/contacts", icon: Users, live: true },
  { label: "Quick-add", href: "/leads/new", icon: Plus, live: true },
] as const satisfies readonly {
  label: string;
  href: string;
  icon: LucideIcon;
  live: boolean;
}[];

type NavItem = (typeof NAV_ITEMS)[number];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => (
        <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
    </nav>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-border bg-bg-raised/90 py-2 backdrop-blur-md lg:hidden">
      {NAV_ITEMS.map((item) => (
        <MobileTab key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
    </nav>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { label, href, icon: Icon, live } = item;

  if (!live) {
    return (
      <span className="flex cursor-default items-center gap-3 rounded-sm px-3 py-2 text-body text-text-faint">
        <Icon size={18} strokeWidth={1.75} />
        {label}
        <span className="ml-auto text-body-sm text-text-faint">soon</span>
      </span>
    );
  }

  if (active) {
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

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-sm border-l-2 border-transparent px-3 py-2 text-body text-text-muted transition-colors hover:text-text"
    >
      <Icon size={18} strokeWidth={1.75} />
      {label}
    </Link>
  );
}

function MobileTab({ item, active }: { item: NavItem; active: boolean }) {
  const { label, href, icon: Icon, live } = item;

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
      className={`flex min-w-11 min-h-11 flex-col items-center justify-center gap-0.5 ${
        active ? "text-accent" : "text-text-muted"
      }`}
    >
      <Icon size={20} strokeWidth={1.75} />
      <span className="text-body-sm">{label}</span>
    </Link>
  );
}
