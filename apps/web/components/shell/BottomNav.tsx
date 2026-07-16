"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-20 h-16 border-t border-(--glass-border) pb-[env(safe-area-inset-bottom)]"
      style={{ backgroundColor: "rgba(5, 5, 5, 0.96)" }}
    >
      <ul className="flex h-full">
        {TABS.map((tab) => (
          <li key={tab.href} className="flex-1">
            <Link
              href={tab.href}
              aria-label={tab.ariaLabel}
              aria-current={path === tab.href ? "page" : undefined}
              className={`flex flex-col items-center justify-center h-full min-h-(--space-touch) text-xs rounded-sm focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring) ${path === tab.href ? "text-(--accent-gold)" : "text-(--text-secondary) hover:text-(--text-primary)"}`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
