"use client";

import { useEffect, useId, useRef } from "react";

const PRESET_ACTIVITIES = ["Work", "Date", "Gym", "Relax"] as const;

export type ActivityChoice = (typeof PRESET_ACTIVITIES)[number] | "Other";

interface ActivityPickerProps {
  value: string;
  selectedChip: ActivityChoice;
  onSelectPreset: (activity: (typeof PRESET_ACTIVITIES)[number]) => void;
  onSelectOther: () => void;
  disabled?: boolean;
}

export function ActivityPicker({
  value,
  selectedChip,
  onSelectPreset,
  onSelectOther,
  disabled = false,
}: ActivityPickerProps) {
  return (
    <section aria-labelledby="activity-heading" className="mt-6">
      <h2
        id="activity-heading"
        className="mb-3 text-sm font-medium text-(--text-primary)"
      >
        What are you doing today?
      </h2>
      <div
        role="radiogroup"
        aria-labelledby="activity-heading"
        className="flex flex-wrap gap-2"
      >
        {PRESET_ACTIVITIES.map((activity) => {
          const checked = selectedChip === activity;
          return (
            <button
              key={activity}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={disabled}
              onClick={() => onSelectPreset(activity)}
              className={`inline-flex min-h-(--space-touch) items-center justify-center rounded-full border px-4 text-sm transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50 ${
                checked
                  ? "border-(--accent-gold) bg-(--accent-gold)/15 text-(--accent-gold)"
                  : "border-(--glass-border) text-(--text-secondary) hover:border-(--accent-gold)/50 hover:text-(--text-primary)"
              }`}
            >
              {activity}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={selectedChip === "Other"}
          disabled={disabled}
          onClick={onSelectOther}
          className={`inline-flex min-h-(--space-touch) items-center justify-center rounded-full border px-4 text-sm transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50 ${
            selectedChip === "Other"
              ? "border-(--accent-gold) bg-(--accent-gold)/15 text-(--accent-gold)"
              : "border-(--glass-border) text-(--text-secondary) hover:border-(--accent-gold)/50 hover:text-(--text-primary)"
          }`}
        >
          Other
        </button>
      </div>
      {selectedChip === "Other" && value && (
        <p className="mt-2 text-xs text-(--text-secondary)" aria-live="polite">
          Custom: <span className="text-(--text-primary)">{value}</span>
        </p>
      )}
    </section>
  );
}

export const OTHER_ACTIVITY_MAX_LENGTH = 160;

interface OtherActivityModalProps {
  open: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function OtherActivityModal({
  open,
  draft,
  onDraftChange,
  onClose,
  onConfirm,
}: OtherActivityModalProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      resizeTextarea(inputRef.current);
    }, 120);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    resizeTextarea(inputRef.current);
  }, [draft, open]);

  if (!open) return null;

  const length = draft.length;
  const canConfirm = draft.trim().length > 0;
  const nearLimit = length >= OTHER_ACTIVITY_MAX_LENGTH - 20;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close activity dialog"
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
      />

      <span className="oil-ripple" aria-hidden="true" />
      <span className="oil-drop-stage" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="oil-bloom-panel"
      >
        <div className="oil-modal-content p-5 sm:p-6">
          <h2
            id={titleId}
            className="font-(family-name:--font-display) text-xl text-(--text-primary)"
          >
            Name your moment
          </h2>
          <p className="mt-2 text-sm text-(--text-secondary)">
            A gallery opening, a long commute, cooking dinner — whatever the
            night needs.
          </p>

          <label
            htmlFor="other-activity-input"
            className="mt-5 block text-sm text-(--text-primary)"
          >
            Custom activity
          </label>
          <textarea
            ref={inputRef}
            id="other-activity-input"
            value={draft}
            rows={2}
            maxLength={OTHER_ACTIVITY_MAX_LENGTH}
            onChange={(event) => {
              onDraftChange(event.target.value.slice(0, OTHER_ACTIVITY_MAX_LENGTH));
              resizeTextarea(event.target);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && canConfirm) {
                event.preventDefault();
                onConfirm();
              }
            }}
            placeholder="e.g. dinner party after a museum opening"
            className="mt-1 max-h-48 min-h-14 w-full resize-none overflow-hidden rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 py-2 text-(--text-primary) placeholder:text-(--text-secondary)"
            aria-describedby="other-activity-count"
          />
          <p
            id="other-activity-count"
            className={`mt-1 text-right text-xs tabular-nums ${
              nearLimit ? "text-(--accent-gold)" : "text-(--text-secondary)"
            }`}
            aria-live="polite"
          >
            {length} / {OTHER_ACTIVITY_MAX_LENGTH} characters
          </p>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex min-h-(--space-touch) items-center justify-center rounded-full border border-(--glass-border) px-5 text-sm text-(--text-primary) hover:border-(--accent-gold)/50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={onConfirm}
              className="inline-flex min-h-(--space-touch) items-center justify-center rounded-full bg-(--accent-gold) px-5 text-sm font-medium text-(--text-on-accent) hover:bg-(--accent-gold-hover) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50"
            >
              Use this
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 192)}px`;
}

export { PRESET_ACTIVITIES };
