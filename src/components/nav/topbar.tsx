"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Sparkles, Calendar, Settings, KanbanSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientNavProps {
  clientId: string;
}

export function ClientNav({ clientId }: ClientNavProps) {
  const pathname = usePathname();
  const base = `/clients/${clientId}`;

  const tabs = [
    { href: base, label: "Overview", icon: LayoutGrid },
    { href: `${base}/kanban`, label: "Kanban", icon: KanbanSquare },
    { href: `${base}/content`, label: "Create", icon: Sparkles },
    { href: `${base}/schedule`, label: "Schedule", icon: Calendar },
    { href: `${base}/social`, label: "Connections", icon: Settings },
  ];

  return (
    <div className="border-b border-ink-700 bg-ink-800/40 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex gap-1 px-6 overflow-x-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-2 px-3 py-3 text-sm transition-colors whitespace-nowrap",
                active ? "text-ink-50" : "text-ink-400 hover:text-ink-200",
              )}
            >
              <Icon size={14} />
              {label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
