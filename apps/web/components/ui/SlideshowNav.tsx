"use client";

import { useId } from "react";

export interface SlideNavOption {
  id: string;
  label: string;
}

interface SlideshowNavProps {
  /** Visible label for the jump-to menu, e.g. "Profile section". */
  label: string;
  options: SlideNavOption[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Singular noun used in the position status, e.g. "section". */
  itemNoun?: string;
  disabled?: boolean;
}

const arrowClass =
  "inline-flex min-h-(--space-touch) min-w-(--space-touch) items-center justify-center rounded-md border border-(--accent-gold)/60 bg-(--accent-gold)/10 text-(--accent-gold) transition-colors hover:border-(--accent-gold) hover:bg-(--accent-gold)/20 disabled:border-(--glass-border) disabled:bg-transparent disabled:text-(--text-secondary) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

export function SlideshowNav({
  label,
  options,
  activeId,
  onSelect,
  itemNoun = "section",
  disabled = false,
}: SlideshowNavProps) {
  const selectId = useId();
  const index = Math.max(
    0,
    options.findIndex((option) => option.id === activeId),
  );
  const active = options[index];

  function step(delta: number) {
    const next = options[index + delta];
    if (next) onSelect(next.id);
  }

  if (options.length === 0 || !active) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={selectId}
            className="mb-1 block text-xs text-(--text-secondary)"
          >
            {label}
          </label>
          <select
            id={selectId}
            value={active.id}
            disabled={disabled}
            onChange={(event) => onSelect(event.target.value)}
            className="h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-sm text-(--text-primary) disabled:opacity-50"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || index <= 0}
          className={arrowClass}
          aria-label={`Previous ${itemNoun}`}
        >
          <ChevronIcon direction="left" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={disabled || index >= options.length - 1}
          className={arrowClass}
          aria-label={`Next ${itemNoun}`}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <p className="text-xs text-(--text-secondary)" aria-live="polite">
        {active.label} · {index + 1} of {options.length}
      </p>
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
