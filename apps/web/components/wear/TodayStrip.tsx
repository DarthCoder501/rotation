"use client";

import Link from "next/link";
import { useWears } from "@/components/wear/WearProvider";

const shellClass =
  "today-strip fixed inset-x-0 top-[calc(56px+env(safe-area-inset-top))] sm:top-[calc(64px+env(safe-area-inset-top))] z-[19] h-9 border-b border-(--accent-gold)/25";

// Gold-tinted near-black: reads as part of the chrome, not a banner.
const shellStyle = {
  backgroundColor: "color-mix(in srgb, var(--accent-gold) 7%, #050505)",
} as const;

const labelClass =
  "today-strip__label shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-(--accent-gold)";

export function TodayStrip() {
  const { todayWears, loading } = useWears();

  if (loading && todayWears.length === 0) {
    return (
      <div className={shellClass} style={shellStyle}>
        <div className="mx-auto flex h-full max-w-5xl items-center justify-center gap-2 px-4 sm:justify-start">
          <span className={labelClass}>Today</span>
          <span className="today-strip__content truncate text-xs text-(--text-secondary)">
            Checking your wear log…
          </span>
        </div>
      </div>
    );
  }

  if (todayWears.length === 0) {
    return (
      <div className={shellClass} style={shellStyle}>
        <div className="mx-auto flex h-full max-w-5xl items-center justify-center gap-2 px-4 text-center">
          <span className={labelClass}>Today</span>
          <span className="today-strip__content truncate text-xs text-(--text-secondary)">
            Nothing logged yet —{" "}
            <Link
              href="/"
              className="inline-flex min-h-6 items-center rounded-sm text-(--accent-gold) underline underline-offset-2 hover:text-(--accent-gold-hover) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              pick a scent
            </Link>
          </span>
        </div>
      </div>
    );
  }

  const names = todayWears.map(
    (wear) => wear.fragrance?.perfume ?? `Fragrance #${wear.fragranceId}`,
  );
  const shown = names.slice(0, 2);
  const extra = names.length - shown.length;
  // Key remounts content so the enter animation plays when wears change.
  const contentKey = todayWears.map((w) => w.id).join("-");

  return (
    <div className={shellClass} style={shellStyle}>
      <Link
        href="/profile?section=today"
        className="mx-auto flex h-full max-w-5xl items-center gap-2 px-4 hover:bg-(--accent-gold)/10 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <span className={labelClass} aria-hidden="true">
          Today
        </span>
        <span className="sr-only">Wearing today:</span>
        <span
          key={contentKey}
          className="today-strip__content min-w-0 flex-1 truncate text-xs font-medium text-(--text-primary)"
        >
          {shown.join(" · ")}
          {extra > 0 && (
            <span className="text-(--text-secondary)">
              {" "}
              +{extra} more
            </span>
          )}
        </span>
        <span className="sr-only">— open your wear log</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-(--accent-gold)"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
