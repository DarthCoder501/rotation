"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  clearLearnedPreferences,
  updateTasteProfile,
} from "@/lib/api/profile-client";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import type { UserProfile } from "@/lib/ranker/types";
import { EMPTY_PROFILE } from "@/lib/ranker/types";
import {
  clearLearnedPreferencesLocal,
} from "@/lib/ranker/weight-sync";

type ChipKey = keyof UserProfile;

const SECTIONS: Array<{
  key: ChipKey;
  title: string;
  hint: string;
  placeholder: string;
}> = [
  {
    key: "likedAccords",
    title: "Liked accords",
    hint: "Notes and families you usually enjoy.",
    placeholder: "e.g. vanilla",
  },
  {
    key: "dislikedAccords",
    title: "Disliked accords",
    hint: "We'll gently push these down in ranking.",
    placeholder: "e.g. smoky",
  },
  {
    key: "likedBrands",
    title: "Liked brands",
    hint: "Houses you reach for often.",
    placeholder: "e.g. Diptyque",
  },
  {
    key: "dislikedBrands",
    title: "Disliked brands",
    hint: "Optional — leave empty if none.",
    placeholder: "e.g. brand name",
  },
];

export function TastePreferencesPanel() {
  const { profileId, profile, refresh } = useAuth();
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [inputs, setInputs] = useState<Record<ChipKey, string>>({
    likedAccords: "",
    dislikedAccords: "",
    likedBrands: "",
    dislikedBrands: "",
  });
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const display = draft ?? profile ?? EMPTY_PROFILE;

  async function persist(next: UserProfile) {
    setSaving(true);
    setError(null);
    setMessage(null);
    setDraft(next);
    try {
      const saved = await updateTasteProfile(next);
      setDraft(saved);
      await refresh({ silent: true });
      setMessage("Taste preferences saved.");
    } catch (e) {
      setError(
        toUserFacingMessage(e, "Could not save your taste preferences."),
      );
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  function removeChip(key: ChipKey, value: string) {
    const next = {
      ...display,
      [key]: display[key].filter(
        (item) => item.toLowerCase() !== value.toLowerCase(),
      ),
    };
    void persist(next);
  }

  function addChip(key: ChipKey) {
    const value = inputs[key].trim();
    if (!value) return;

    const exists = display[key].some(
      (item) => item.toLowerCase() === value.toLowerCase(),
    );
    if (exists) {
      setInputs((prev) => ({ ...prev, [key]: "" }));
      return;
    }

    // Avoid liking and disliking the same label at once.
    const opposite =
      key === "likedAccords"
        ? "dislikedAccords"
        : key === "dislikedAccords"
          ? "likedAccords"
          : key === "likedBrands"
            ? "dislikedBrands"
            : "likedBrands";

    const next: UserProfile = {
      ...display,
      [key]: [...display[key], value].slice(0, 20),
      [opposite]: display[opposite].filter(
        (item) => item.toLowerCase() !== value.toLowerCase(),
      ),
    };

    setInputs((prev) => ({ ...prev, [key]: "" }));
    void persist(next);
  }

  async function handleClearLearned() {
    if (!profileId) {
      setError("Profile is still loading. Try again in a moment.");
      return;
    }

    const confirmed = window.confirm(
      "Clear learned preferences? This resets what the daily ranker has learned from your likes and choices. Explicit taste chips stay.",
    );
    if (!confirmed) return;

    setClearing(true);
    setError(null);
    setMessage(null);
    try {
      await clearLearnedPreferencesLocal(profileId);
      try {
        await clearLearnedPreferences();
      } catch {
        // Local clear still succeeded — server sync may be offline.
        setMessage(
          "Cleared on this device. Sync to the cloud when you're back online.",
        );
        return;
      }
      setMessage("Learned preferences cleared.");
    } catch (e) {
      setError(
        toUserFacingMessage(e, "Could not clear learned preferences."),
      );
    } finally {
      setClearing(false);
    }
  }

  return (
    <section aria-labelledby="taste-heading" className="space-y-4">
      <div>
        <h2
          id="taste-heading"
          className="font-(family-name:--font-display) text-xl text-(--text-primary)"
        >
          Taste preferences
        </h2>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Explicit likes and dislikes shape ranking inside your collection.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <GlassCard key={section.key} className="p-4">
          <h3 className="text-sm font-medium text-(--text-primary)">
            {section.title}
          </h3>
          <p className="mt-1 text-xs text-(--text-secondary)">{section.hint}</p>

          <ul className="mt-3 flex flex-wrap gap-2" aria-label={section.title}>
            {display[section.key].length === 0 ? (
              <li className="text-xs text-(--text-secondary)">None yet</li>
            ) : (
              display[section.key].map((chip) => (
                <li key={`${section.key}-${chip}`}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => removeChip(section.key, chip)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-(--glass-border) bg-(--glass-bg) px-3 text-xs text-(--text-primary) hover:border-(--danger)/40 hover:text-(--danger) disabled:opacity-50"
                    aria-label={`Remove ${chip} from ${section.title}`}
                  >
                    {chip}
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={inputs[section.key]}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  [section.key]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addChip(section.key);
                }
              }}
              placeholder={section.placeholder}
              className="h-11 min-w-0 flex-1 rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-sm text-(--text-primary) placeholder:text-(--text-secondary)"
              aria-label={`Add to ${section.title}`}
            />
            <button
              type="button"
              disabled={saving || !inputs[section.key].trim()}
              onClick={() => addChip(section.key)}
              className="min-h-(--space-touch) rounded-md border border-(--glass-border) px-4 text-sm text-(--text-primary) disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </GlassCard>
      ))}

      <GlassCard className="p-4">
        <h3 className="text-sm font-medium text-(--text-primary)">
          Learned preferences
        </h3>
        <p className="mt-1 text-xs text-(--text-secondary)">
          Quiet updates from Love / Skip and daily choices. Clearing resets the
          ranker’s weight vector — not your collection.
        </p>
        <button
          type="button"
          disabled={clearing || !profileId}
          onClick={() => void handleClearLearned()}
          className="mt-4 inline-flex min-h-(--space-touch) items-center justify-center rounded-full border border-(--danger)/40 px-5 text-sm text-(--danger) hover:bg-(--danger)/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          {clearing ? "Clearing…" : "Clear learned preferences"}
        </button>
      </GlassCard>

      {error && (
        <p className="text-sm text-(--danger)" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-(--success)" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
