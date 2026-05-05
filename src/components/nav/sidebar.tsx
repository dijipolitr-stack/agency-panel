"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/auth/actions";

interface ClientLink {
  id: string;
  name: string;
}

interface SidebarProps {
  agencyName: string;
  clients: ClientLink[];
  userEmail: string;
}

export function Sidebar({ agencyName, clients, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-ink-700 bg-ink-800/40 backdrop-blur-sm">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-ink-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-coral flex items-center justify-center">
            <span className="font-display text-base text-ink font-bold">A</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-ink-400">
              Atelier
            </div>
            <div className="font-display text-sm tracking-tight text-ink-50 truncate max-w-[160px]">
              {agencyName}
            </div>
          </div>
        </div>
      </div>

      {/* Top nav */}
      <nav className="px-3 py-4 space-y-0.5">
        <NavLink href="/dashboard" icon={<LayoutDashboard size={15} />} active={pathname === "/dashboard"}>
          Overview
        </NavLink>
        <NavLink href="/clients" icon={<Users size={15} />} active={pathname === "/clients"}>
          All clients
        </NavLink>
        <NavLink href="/clients/new" icon={<PlusCircle size={15} />} active={pathname === "/clients/new"}>
          New client
        </NavLink>
      </nav>

      {/* Clients list */}
      <div className="px-3 mt-3 mb-2 flex items-center gap-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-ink-400">
          Clients
        </div>
        <div className="h-px flex-1 bg-ink-700" />
        <div className="text-[10px] font-mono text-ink-400">{clients.length}</div>
      </div>

      <div className="px-3 flex-1 overflow-y-auto space-y-0.5">
        {clients.length === 0 ? (
          <div className="text-xs text-ink-400 px-3 py-2 italic">
            No clients yet. <Link href="/clients/new" className="text-coral underline">Add one</Link>.
          </div>
        ) : (
          clients.map((c) => {
            const href = `/clients/${c.id}`;
            const active = pathname.startsWith(href);
            return (
              <Link
                key={c.id}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-coral/15 text-coral-300 border border-coral/20"
                    : "text-ink-200 hover:bg-ink-700 hover:text-ink-50",
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    active ? "bg-coral" : "bg-ink-500",
                  )}
                />
                <span className="truncate">{c.name}</span>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-ink-700 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Sparkles size={14} className="text-coral" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink-200 truncate">{userEmail}</div>
            <div className="text-[10px] font-mono text-ink-400">Owner</div>
          </div>
        </div>
        <form action={signOutAction}>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-ink-300 hover:bg-ink-700 hover:text-ink-50 transition-colors">
            <LogOut size={13} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  children,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
        active
          ? "bg-ink-700 text-ink-50"
          : "text-ink-300 hover:bg-ink-700/50 hover:text-ink-50",
      )}
    >
      <span className={cn(active ? "text-coral" : "text-ink-400")}>{icon}</span>
      {children}
    </Link>
  );
}
