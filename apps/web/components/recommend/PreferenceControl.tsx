"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  PREFERENCE_MAX,
  PREFERENCE_MIN,
  PREFERENCE_NEUTRAL,
  PREFERENCE_PRESETS,
  clampPreference,
  preferenceLabel,
} from "@/lib/ranker/preference";

interface PreferenceControlProps {
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  disabled?: boolean;
  /** Visible heading when not using an external dialog title. */
  title?: string;
  description?: string;
  /** When set, hides the internal heading and labels the slider with this id. */
  labelledBy?: string;
  /** Hide the “commits on release” hint (e.g. when a confirm button owns submit). */
  hideCommitHint?: boolean;
}

export function PreferenceControl({
  value,
  onChange,
  onCommit,
  disabled = false,
  title = "How much do you like this scent?",
  description = "Drag for nuance, or tap a preset.",
  labelledBy,
  hideCommitHint = false,
}: PreferenceControlProps) {
  const internalLabelId = useId();
  const valueId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const labelId = labelledBy ?? internalLabelId;
  const [pouring, setPouring] = useState(false);
  const previousRef = useRef(value);
  const liveValueRef = useRef(value);
  const pourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    liveValueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (pourTimerRef.current) clearTimeout(pourTimerRef.current);
    };
  }, []);

  function triggerPourIfRising(next: number) {
    if (next > previousRef.current) {
      setPouring(true);
      if (pourTimerRef.current) clearTimeout(pourTimerRef.current);
      pourTimerRef.current = setTimeout(() => setPouring(false), 560);
    }
    previousRef.current = next;
  }

  function handleValue(nextRaw: number, commit = false) {
    const next = clampPreference(nextRaw);
    liveValueRef.current = next;
    triggerPourIfRising(next);
    onChange(next);
    if (commit) onCommit(next);
  }

  const clamped = clampPreference(value);
  const fillHeight = `${clamped}%`;
  const activePreset = PREFERENCE_PRESETS.find(
    (preset) => preset.value === value,
  );
  const describedBy = hideCommitHint
    ? descriptionId
    : `${descriptionId} ${hintId}`;

  return (
    <section
      aria-labelledby={labelledBy ? undefined : internalLabelId}
      className="mt-6"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          {!labelledBy && (
            <h3
              id={internalLabelId}
              className="text-base font-medium text-(--text-primary)"
            >
              {title}
            </h3>
          )}
          <p
            id={descriptionId}
            className={`text-sm leading-relaxed text-(--text-secondary) ${
              labelledBy ? "" : "mt-1.5"
            }`}
          >
            {description}
          </p>
          {!hideCommitHint && (
            <span id={hintId} className="sr-only">
              Value confirms when you release the slider or choose a preset.
            </span>
          )}
        </div>
        <p
          id={valueId}
          className="shrink-0 text-right"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="block font-(family-name:--font-display) text-4xl tabular-nums leading-none text-(--accent-gold) sm:text-5xl">
            {clamped}
          </span>
          <span className="mt-1.5 block text-sm font-medium text-(--text-primary)">
            {preferenceLabel(value)}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-5 sm:gap-6">
        <div className="preference-vial" aria-hidden="true">
          <span
            className={`preference-vial-pour ${pouring ? "is-active" : ""}`}
          />
          <span
            className={`preference-vial-fill ${pouring ? "is-pouring" : ""}`}
            style={{ height: fillHeight }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={PREFERENCE_MIN}
            max={PREFERENCE_MAX}
            step={1}
            value={clamped}
            disabled={disabled}
            aria-valuemin={PREFERENCE_MIN}
            aria-valuemax={PREFERENCE_MAX}
            aria-valuenow={clamped}
            aria-valuetext={`${clamped} — ${preferenceLabel(value)}`}
            aria-labelledby={labelId}
            aria-describedby={describedBy}
            onChange={(event) => handleValue(Number(event.target.value))}
            onMouseUp={() => onCommit(clampPreference(liveValueRef.current))}
            onTouchEnd={() => onCommit(clampPreference(liveValueRef.current))}
            onKeyUp={(event) => {
              if (
                event.key === "ArrowLeft" ||
                event.key === "ArrowRight" ||
                event.key === "ArrowUp" ||
                event.key === "ArrowDown" ||
                event.key === "Home" ||
                event.key === "End"
              ) {
                onCommit(clampPreference(liveValueRef.current));
              }
            }}
            className="preference-range disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div
            role="group"
            aria-label="Liking presets"
            className="mt-4 grid grid-cols-5 gap-2"
          >
            {PREFERENCE_PRESETS.map((preset) => {
              const selected = activePreset?.value === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  disabled={disabled}
                  title={preset.description}
                  aria-pressed={selected}
                  aria-label={preset.description}
                  onClick={() => handleValue(preset.value, true)}
                  className={`inline-flex min-h-(--space-touch) flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-2 text-center transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50 ${
                    selected
                      ? "border-(--accent-gold) bg-(--accent-gold)/15 text-(--accent-gold)"
                      : "border-(--glass-border) text-(--text-secondary) hover:border-(--accent-gold)/40 hover:text-(--text-primary)"
                  }`}
                >
                  <span className="text-xs font-medium leading-tight sm:text-sm">
                    {preset.label}
                  </span>
                  <span className="text-[11px] tabular-nums leading-none opacity-80 sm:text-xs">
                    {preset.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {value === PREFERENCE_NEUTRAL && (
        <p className="mt-4 text-sm leading-relaxed text-(--text-secondary)">
          Neutral keeps your taste model nearly unchanged.
        </p>
      )}
    </section>
  );
}
