"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTempUnit } from "@/lib/temperature";

const TABS = [
  { href: "/", label: "Scent", ariaLabel: "Today's recommendation" },
  {
    href: "/collection",
    label: "Collection",
    ariaLabel: "My fragrance collection",
  },
  { href: "/collection/search", label: "Search", ariaLabel: "Search catalog" },
  { href: "/profile", label: "Profile", ariaLabel: "Taste profile" },
];

export function AppNav() {
  const path = usePathname();
  const { unit, setUnit } = useTempUnit();
  const { isAdmin } = useAuth();

  return (
    <header
      className="fixed top-0 inset-x-0 z-20 border-b border-(--glass-border) pt-[env(safe-area-inset-top)]"
      style={{ backgroundColor: "rgba(5, 5, 5, 0.96)" }}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-2 sm:h-16 sm:px-4">
        <nav aria-label="Main navigation" className="min-w-0 flex-1">
          <ul className="flex h-full items-stretch">
            {TABS.map((tab) => (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-label={tab.ariaLabel}
                  aria-current={path === tab.href ? "page" : undefined}
                  className={`flex h-full min-h-(--space-touch) items-center justify-center rounded-sm px-1 text-xs focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring) sm:text-sm ${
                    path === tab.href
                      ? "text-(--accent-gold)"
                      : "text-(--text-secondary) hover:text-(--text-primary)"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li className="flex-1">
                <Link
                  href="/admin/submissions"
                  aria-label="Review fragrance submissions"
                  aria-current={path.startsWith("/admin") ? "page" : undefined}
                  className={`flex h-full min-h-(--space-touch) items-center justify-center rounded-sm px-1 text-xs focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring) sm:text-sm ${
                    path.startsWith("/admin")
                      ? "text-(--accent-gold)"
                      : "text-(--text-secondary) hover:text-(--text-primary)"
                  }`}
                >
                  Admin
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div
          role="group"
          aria-label="Temperature unit"
          className="flex shrink-0 items-center rounded-full border border-(--glass-border) p-0.5"
        >
          <button
            type="button"
            aria-pressed={unit === "C"}
            aria-label="Use Celsius"
            onClick={() => setUnit("C")}
            className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${
              unit === "C"
                ? "bg-(--accent-gold)/20 text-(--accent-gold)"
                : "text-(--text-secondary) hover:text-(--text-primary)"
            }`}
          >
            °C
          </button>
          <button
            type="button"
            aria-pressed={unit === "F"}
            aria-label="Use Fahrenheit"
            onClick={() => setUnit("F")}
            className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${
              unit === "F"
                ? "bg-(--accent-gold)/20 text-(--accent-gold)"
                : "text-(--text-secondary) hover:text-(--text-primary)"
            }`}
          >
            °F
          </button>
        </div>
      </div>
    </header>
  );
}

/** @deprecated Use AppNav — kept as alias during rename. */
export const BottomNav = AppNav;
