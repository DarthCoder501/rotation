"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PreferenceControl } from "@/components/recommend/PreferenceControl";
import type { Fragrance } from "@/lib/types/fragrance";

interface AffinityCaptureModalProps {
  open: boolean;
  fragrance: Fragrance | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (affinity: number) => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AffinityCaptureModal({
  open,
  fragrance,
  busy = false,
  onClose,
  onConfirm,
}: AffinityCaptureModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [affinity, setAffinity] = useState(75);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const resetTimer = window.setTimeout(() => {
      setAffinity(75);
    }, 0);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      confirmRef.current?.focus();
    }, 50);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !panelRef.current.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(resetTimer);
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, busy, onClose]);

  if (!open || !fragrance) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-3 py-4 sm:items-center sm:px-6 sm:py-8"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close liking dialog"
        className="absolute inset-0 bg-black/75"
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <span className="oil-ripple" aria-hidden="true" />
      <span className="oil-drop-stage" aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="oil-bloom-panel oil-bloom-panel--roomy"
      >
        <div className="oil-modal-content p-6 sm:p-8">
          <h2
            id={titleId}
            className="font-(family-name:--font-display) text-2xl leading-tight text-(--text-primary) sm:text-3xl"
          >
            How much do you like it?
          </h2>
          <p className="mt-3 text-base text-(--text-secondary)">
            <span className="font-medium text-(--text-primary)">
              {fragrance.perfume}
            </span>
            <span aria-hidden="true"> · </span>
            <span className="sr-only"> by </span>
            {fragrance.brand}
          </p>
          <p
            id={descriptionId}
            className="mt-3 max-w-prose text-sm leading-relaxed text-(--text-secondary) sm:text-base"
          >
            This seeds your taste model. Daily picks use weather and what you
            like most — then refine as you choose what to wear.
          </p>

          <PreferenceControl
            value={affinity}
            onChange={setAffinity}
            onCommit={setAffinity}
            disabled={busy}
            labelledBy={titleId}
            hideCommitHint
            description="Drag the slider for nuance, or tap a preset. Confirm with Add to collection."
          />

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="inline-flex min-h-(--space-touch) items-center justify-center rounded-full border border-(--glass-border) px-6 text-base text-(--text-primary) hover:border-(--accent-gold)/50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="button"
              disabled={busy}
              onClick={() => onConfirm(affinity)}
              className="inline-flex min-h-(--space-touch) items-center justify-center rounded-full bg-(--accent-gold) px-6 text-base font-medium text-(--text-on-accent) hover:bg-(--accent-gold-hover) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add to collection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
