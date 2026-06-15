"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PANEL_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Panel tab navigation. Highlights the active tab from the current pathname.
 * Tabs are driven by PANEL_NAV (constants) so M5 wires the Dashboard in one place.
 */
export function PanelNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {PANEL_NAV.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors sm:min-h-9",
              isActive
                ? "bg-bayon-navy text-white"
                : "text-bayon-navy hover:bg-bayon-navy/5"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
