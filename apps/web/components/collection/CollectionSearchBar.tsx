"use client";

import Link from "next/link";
import { useId } from "react";

interface CollectionSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** When set, renders as a link-styled bar (collection home → search page) */
  href?: string;
  autoFocus?: boolean;
  ariaControls?: string;
}

export function CollectionSearchBar({
  value,
  onChange,
  href,
  autoFocus = false,
  ariaControls,
}: CollectionSearchBarProps) {
  const inputId = useId();

  const inner = (
    <div className="relative flex items-center">
      <span
        className="pointer-events-none absolute left-4 text-(--text-secondary)"
        aria-hidden
      >
        <SearchIcon />
      </span>
      <input
        id={inputId}
        type="search"
        role="searchbox"
        aria-controls={ariaControls}
        aria-label="Search fragrances by name or brand"
        placeholder="Search catalog…"
        value={value}
        readOnly={Boolean(href)}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="glass-surface h-12 min-h-(--space-touch) w-full rounded-md border border-(--glass-border) pl-11 pr-10 text-(--text-primary) placeholder:text-(--text-secondary) focus:border-(--accent-gold) [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none"
      />
      {value.length > 0 && !href && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-(--accent-gold) hover:text-(--accent-gold-hover) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block" aria-label="Open catalog search">
        <div className="pointer-events-none">{inner}</div>
      </Link>
    );
  }

  return inner;
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  );
}
