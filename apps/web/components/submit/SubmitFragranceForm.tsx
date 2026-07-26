"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccordBubbles } from "@/components/collection/AccordBubbles";
import { GlassCard } from "@/components/ui/GlassCard";
import { createSubmission } from "@/lib/api/submissions-client";
import { KNOWN_ACCORDS } from "@/lib/accord-colors";
import { normalizeExternalUrl } from "@/lib/url";

interface SubmitFragranceFormProps {
  initialQuery?: string;
}

const MAX_SUGGESTIONS = 8;

function parseInitialQuery(query: string): { perfume: string; brand: string } {
  const trimmed = query.trim();
  if (!trimmed) {
    return { perfume: "", brand: "" };
  }

  const byMatch = trimmed.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return { perfume: byMatch[1].trim(), brand: byMatch[2].trim() };
  }

  return { perfume: trimmed, brand: "" };
}

function canonicalizeAccord(value: string): string {
  const trimmed = value.trim();
  const known = KNOWN_ACCORDS.find(
    (accord) => accord.toLowerCase() === trimmed.toLowerCase(),
  );
  return known ?? trimmed;
}

export function SubmitFragranceForm({ initialQuery = "" }: SubmitFragranceFormProps) {
  const router = useRouter();
  const defaults = useMemo(() => parseInitialQuery(initialQuery), [initialQuery]);
  const accordInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [perfume, setPerfume] = useState(defaults.perfume);
  const [brand, setBrand] = useState(defaults.brand);
  const [gender, setGender] = useState<"" | "men" | "women" | "unisex">("");
  const [country, setCountry] = useState("");
  const [topNotes, setTopNotes] = useState("");
  const [middleNotes, setMiddleNotes] = useState("");
  const [baseNotes, setBaseNotes] = useState("");
  const [accordInput, setAccordInput] = useState("");
  const [mainAccords, setMainAccords] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [userNotes, setUserNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const suggestions = useMemo(() => {
    const q = accordInput.trim().toLowerCase();
    if (!q || mainAccords.length >= 5) return [];

    const selected = new Set(mainAccords.map((a) => a.toLowerCase()));
    return KNOWN_ACCORDS.filter(
      (accord) =>
        !selected.has(accord.toLowerCase()) &&
        accord.toLowerCase().includes(q),
    ).slice(0, MAX_SUGGESTIONS);
  }, [accordInput, mainAccords]);

  function addAccord(raw?: string) {
    const next = canonicalizeAccord(raw ?? accordInput);
    if (!next || mainAccords.length >= 5) return;
    if (mainAccords.some((a) => a.toLowerCase() === next.toLowerCase())) {
      setAccordInput("");
      setShowSuggestions(false);
      setActiveSuggestion(0);
      return;
    }
    setMainAccords((prev) => [...prev, next]);
    setAccordInput("");
    setShowSuggestions(false);
    setActiveSuggestion(0);
    accordInputRef.current?.focus();
  }

  function removeAccord(index: number) {
    setMainAccords((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAccordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setShowSuggestions(true);
      setActiveSuggestion((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setShowSuggestions(true);
      setActiveSuggestion(
        (i) => (i - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && suggestions[activeSuggestion]) {
        addAccord(suggestions[activeSuggestion]);
      } else {
        addAccord();
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUrl = sourceUrl.trim();
    const normalizedUrl = trimmedUrl ? normalizeExternalUrl(trimmedUrl) : null;
    if (trimmedUrl && !normalizedUrl) {
      setUrlError(
        "Enter a full web address, like https://www.fragrantica.com/perfume/…",
      );
      urlInputRef.current?.focus();
      return;
    }
    setUrlError(null);
    setSubmitting(true);

    try {
      const created = await createSubmission({
        perfume: perfume.trim(),
        brand: brand.trim(),
        country: country.trim() || undefined,
        gender: gender || undefined,
        topNotes: topNotes.trim() || undefined,
        middleNotes: middleNotes.trim() || undefined,
        baseNotes: baseNotes.trim() || undefined,
        mainAccords,
        userNotes: userNotes.trim() || undefined,
        sourceUrl: normalizedUrl ?? undefined,
      });

      setSuccess(
        "Added to your collection as Custom — pending review.",
      );
      const fragranceId = created.fragrance?.id;
      window.setTimeout(() => {
        router.push(
          fragranceId
            ? `/collection?affinity=${fragranceId}`
            : "/collection",
        );
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit fragrance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="submit-perfume" className="block text-sm text-(--text-primary)">
            Perfume name <span className="text-(--text-secondary)">(required)</span>
          </label>
          <input
            id="submit-perfume"
            required
            value={perfume}
            onChange={(e) => setPerfume(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-(--text-primary)"
          />
        </div>

        <div>
          <label htmlFor="submit-brand" className="block text-sm text-(--text-primary)">
            Brand <span className="text-(--text-secondary)">(required)</span>
          </label>
          <input
            id="submit-brand"
            required
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-(--text-primary)"
          />
        </div>

        <div>
          <label
            htmlFor="submit-source-url"
            className="block text-sm text-(--text-primary)"
          >
            Fragrantica link{" "}
            <span className="text-(--text-secondary)">(optional)</span>
          </label>
          <p
            id="submit-source-url-hint"
            className="mt-1 text-xs text-(--text-secondary)"
          >
            Helps reviewers verify notes faster. Any reference page works.
          </p>
          <input
            ref={urlInputRef}
            id="submit-source-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              if (urlError) setUrlError(null);
            }}
            aria-invalid={urlError ? true : undefined}
            aria-describedby={
              urlError
                ? "submit-source-url-hint submit-source-url-error"
                : "submit-source-url-hint"
            }
            placeholder="https://www.fragrantica.com/perfume/…"
            className={`mt-2 h-11 w-full rounded-md border bg-(--glass-bg) px-3 text-(--text-primary) placeholder:text-(--text-secondary) ${
              urlError ? "border-(--danger)" : "border-(--glass-border)"
            }`}
          />
          {urlError && (
            <p
              id="submit-source-url-error"
              role="alert"
              className="mt-1 text-xs text-(--danger)"
            >
              {urlError}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="submit-gender" className="block text-sm text-(--text-primary)">
              Gender
            </label>
            <select
              id="submit-gender"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as "" | "men" | "women" | "unisex")
              }
              className="mt-1 h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-(--text-primary)"
            >
              <option value="">Not specified</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div>
            <label htmlFor="submit-country" className="block text-sm text-(--text-primary)">
              Country
            </label>
            <input
              id="submit-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-(--text-primary)"
            />
          </div>
        </div>

        <div>
          <label htmlFor="submit-top-notes" className="block text-sm text-(--text-primary)">
            Top notes
          </label>
          <input
            id="submit-top-notes"
            value={topNotes}
            onChange={(e) => setTopNotes(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-(--text-primary)"
          />
        </div>

        <div>
          <label htmlFor="submit-middle-notes" className="block text-sm text-(--text-primary)">
            Heart notes
          </label>
          <input
            id="submit-middle-notes"
            value={middleNotes}
            onChange={(e) => setMiddleNotes(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-(--text-primary)"
          />
        </div>

        <div>
          <label htmlFor="submit-base-notes" className="block text-sm text-(--text-primary)">
            Base notes
          </label>
          <input
            id="submit-base-notes"
            value={baseNotes}
            onChange={(e) => setBaseNotes(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-(--text-primary)"
          />
        </div>

        <div>
          <label htmlFor="submit-accord-input" className="block text-sm text-(--text-primary)">
            Main accords
          </label>
          <p id="submit-accord-hint" className="mt-1 text-xs text-(--text-secondary)">
            Type to search known accords (fresh spicy, citrus, woody…), or enter your own.
          </p>
          <div className="relative mt-2">
            <div className="flex gap-2">
              <input
                ref={accordInputRef}
                id="submit-accord-input"
                role="combobox"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-controls="submit-accord-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={
                  showSuggestions && suggestions[activeSuggestion]
                    ? `submit-accord-option-${activeSuggestion}`
                    : undefined
                }
                value={accordInput}
                onChange={(e) => {
                  setAccordInput(e.target.value);
                  setShowSuggestions(true);
                  setActiveSuggestion(0);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay so suggestion clicks register before the list closes.
                  window.setTimeout(() => setShowSuggestions(false), 120);
                }}
                onKeyDown={handleAccordKeyDown}
                aria-describedby="submit-accord-hint"
                placeholder="e.g. fresh spicy"
                autoComplete="off"
                className="h-11 min-w-0 flex-1 rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-(--text-primary)"
              />
              <button
                type="button"
                onClick={() => addAccord()}
                disabled={mainAccords.length >= 5}
                className="min-h-(--space-touch) rounded-md border border-(--glass-border) px-4 text-sm text-(--text-primary) disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <ul
                id="submit-accord-suggestions"
                role="listbox"
                aria-label="Suggested accords"
                className="absolute z-10 mt-1 max-h-48 w-[calc(100%-5.5rem)] overflow-auto rounded-md border border-(--glass-border) bg-(--glass-bg) py-1 shadow-lg"
              >
                {suggestions.map((accord, index) => (
                  <li key={accord} role="option" aria-selected={index === activeSuggestion}>
                    <button
                      type="button"
                      id={`submit-accord-option-${index}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addAccord(accord)}
                      onMouseEnter={() => setActiveSuggestion(index)}
                      className={`flex w-full px-3 py-2 text-left text-sm text-(--text-primary) ${
                        index === activeSuggestion
                          ? "bg-(--accent-gold)/15"
                          : "hover:bg-(--glass-border)/40"
                      }`}
                    >
                      {accord}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {mainAccords.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AccordBubbles accords={mainAccords} size="sm" />
              {mainAccords.map((accord, index) => (
                <button
                  key={`${accord}-${index}`}
                  type="button"
                  onClick={() => removeAccord(index)}
                  className="text-xs text-(--text-secondary) underline-offset-2 hover:underline"
                  aria-label={`Remove accord ${accord}`}
                >
                  Remove {accord}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="submit-user-notes" className="block text-sm text-(--text-primary)">
            Why do you want this added?
          </label>
          <textarea
            id="submit-user-notes"
            rows={4}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            className="mt-1 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 py-2 text-(--text-primary)"
          />
        </div>

        {error && (
          <p className="text-sm text-(--danger)" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-(--success)" role="status">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-(--space-touch) w-full items-center justify-center rounded-full bg-(--accent-gold) px-6 text-sm font-medium text-(--text-on-accent) hover:bg-(--accent-gold-hover) disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </GlassCard>
  );
}
