"use client";

import { useState } from "react";
import type { FragranceSubmission } from "@/lib/types/submission";
import { normalizeExternalUrl } from "@/lib/url";

export type ApprovedEditPayload = {
  perfume: string;
  brand: string;
  country: string;
  gender: "" | "men" | "women" | "unisex";
  topNotes: string;
  middleNotes: string;
  baseNotes: string;
  mainAccords: string;
  sourceUrl: string;
};

function draftFromSubmission(s: FragranceSubmission): ApprovedEditPayload {
  return {
    perfume: s.perfume,
    brand: s.brand,
    country: s.country ?? "",
    gender:
      s.gender === "men" || s.gender === "women" || s.gender === "unisex"
        ? s.gender
        : "",
    topNotes: s.topNotes ?? "",
    middleNotes: s.middleNotes ?? "",
    baseNotes: s.baseNotes ?? "",
    mainAccords: [
      s.mainAccord1,
      s.mainAccord2,
      s.mainAccord3,
      s.mainAccord4,
      s.mainAccord5,
    ]
      .filter(Boolean)
      .join(", "),
    sourceUrl: s.sourceUrl ?? "",
  };
}

interface AdminApprovedEditFormProps {
  submission: FragranceSubmission;
  busy: boolean;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function AdminApprovedEditForm({
  submission,
  busy,
  onCancel,
  onSaved,
  onError,
  onSuccess,
}: AdminApprovedEditFormProps) {
  const [draft, setDraft] = useState(() => draftFromSubmission(submission));
  const [urlError, setUrlError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof ApprovedEditPayload>(
    key: K,
    value: ApprovedEditPayload[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedUrl = draft.sourceUrl.trim();
    const url = trimmedUrl ? normalizeExternalUrl(trimmedUrl) : null;
    if (trimmedUrl && !url) {
      setUrlError(
        "Enter a full web address, like https://www.fragrantica.com/perfume/…",
      );
      return;
    }
    setUrlError(null);
    setSaving(true);

    try {
      const mainAccords = draft.mainAccords
        .split(/[,;|]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 5);

      const res = await fetch(`/api/admin/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfume: draft.perfume.trim(),
          brand: draft.brand.trim(),
          country: draft.country.trim() || null,
          gender: draft.gender || null,
          topNotes: draft.topNotes.trim() || null,
          middleNotes: draft.middleNotes.trim() || null,
          baseNotes: draft.baseNotes.trim() || null,
          mainAccords,
          sourceUrl: url,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(body.message ?? `Update failed (${res.status})`);
      }
      onSuccess("Catalog scent updated.");
      await onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't update that scent.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = busy || saving;
  const fieldClass =
    "mt-1 h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-sm text-(--text-primary) disabled:opacity-50";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mt-4 space-y-3 border-t border-(--glass-border) pt-4"
      aria-labelledby={`edit-heading-${submission.id}`}
    >
      <h3
        id={`edit-heading-${submission.id}`}
        className="text-sm font-medium text-(--text-primary)"
      >
        Edit published scent
      </h3>
      <p className="text-xs text-(--text-secondary)">
        Changes update the catalog fragrance and this submission record. Vibe
        search re-embeds when notes or accords change.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`edit-perfume-${submission.id}`}
            className="block text-xs text-(--text-primary)"
          >
            Perfume name
          </label>
          <input
            id={`edit-perfume-${submission.id}`}
            required
            disabled={disabled}
            value={draft.perfume}
            onChange={(e) => setField("perfume", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label
            htmlFor={`edit-brand-${submission.id}`}
            className="block text-xs text-(--text-primary)"
          >
            Brand
          </label>
          <input
            id={`edit-brand-${submission.id}`}
            required
            disabled={disabled}
            value={draft.brand}
            onChange={(e) => setField("brand", e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`edit-gender-${submission.id}`}
            className="block text-xs text-(--text-primary)"
          >
            Gender
          </label>
          <select
            id={`edit-gender-${submission.id}`}
            disabled={disabled}
            value={draft.gender}
            onChange={(e) =>
              setField(
                "gender",
                e.target.value as ApprovedEditPayload["gender"],
              )
            }
            className={fieldClass}
          >
            <option value="">Not specified</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>
        <div>
          <label
            htmlFor={`edit-country-${submission.id}`}
            className="block text-xs text-(--text-primary)"
          >
            Country
          </label>
          <input
            id={`edit-country-${submission.id}`}
            disabled={disabled}
            value={draft.country}
            onChange={(e) => setField("country", e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`edit-top-${submission.id}`}
          className="block text-xs text-(--text-primary)"
        >
          Top notes
        </label>
        <input
          id={`edit-top-${submission.id}`}
          disabled={disabled}
          value={draft.topNotes}
          onChange={(e) => setField("topNotes", e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label
          htmlFor={`edit-heart-${submission.id}`}
          className="block text-xs text-(--text-primary)"
        >
          Heart notes
        </label>
        <input
          id={`edit-heart-${submission.id}`}
          disabled={disabled}
          value={draft.middleNotes}
          onChange={(e) => setField("middleNotes", e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label
          htmlFor={`edit-base-${submission.id}`}
          className="block text-xs text-(--text-primary)"
        >
          Base notes
        </label>
        <input
          id={`edit-base-${submission.id}`}
          disabled={disabled}
          value={draft.baseNotes}
          onChange={(e) => setField("baseNotes", e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label
          htmlFor={`edit-accords-${submission.id}`}
          className="block text-xs text-(--text-primary)"
        >
          Main accords
        </label>
        <p
          id={`edit-accords-hint-${submission.id}`}
          className="mt-1 text-xs text-(--text-secondary)"
        >
          Up to 5, separated by commas (e.g. woody, spicy, vanilla).
        </p>
        <input
          id={`edit-accords-${submission.id}`}
          disabled={disabled}
          value={draft.mainAccords}
          onChange={(e) => setField("mainAccords", e.target.value)}
          aria-describedby={`edit-accords-hint-${submission.id}`}
          className={fieldClass}
        />
      </div>

      <div>
        <label
          htmlFor={`edit-url-${submission.id}`}
          className="block text-xs text-(--text-primary)"
        >
          Fragrantica link{" "}
          <span className="text-(--text-secondary)">(optional)</span>
        </label>
        <input
          id={`edit-url-${submission.id}`}
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          disabled={disabled}
          value={draft.sourceUrl}
          onChange={(e) => {
            setField("sourceUrl", e.target.value);
            if (urlError) setUrlError(null);
          }}
          aria-invalid={urlError ? true : undefined}
          aria-describedby={
            urlError ? `edit-url-error-${submission.id}` : undefined
          }
          placeholder="https://www.fragrantica.com/perfume/…"
          className={`${fieldClass} ${urlError ? "border-(--danger)" : ""}`}
        />
        {urlError && (
          <p
            id={`edit-url-error-${submission.id}`}
            role="alert"
            className="mt-1 text-xs text-(--danger)"
          >
            {urlError}
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={disabled}
          className="min-h-(--space-touch) flex-1 rounded-md border border-(--accent-gold)/60 bg-(--accent-gold)/10 text-sm text-(--accent-gold) hover:border-(--accent-gold) hover:bg-(--accent-gold)/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="min-h-(--space-touch) flex-1 rounded-md border border-(--glass-border) text-sm text-(--text-secondary) disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
