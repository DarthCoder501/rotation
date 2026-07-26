"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getCachedCollection } from "@/lib/collection-cache";
import { fetchCollection } from "@/lib/api/collection-client";
import type { Fragrance } from "@/lib/types/fragrance";

interface CollectionWearPickerProps {
  busy?: boolean;
  onClose: () => void;
  onSelect: (fragrance: Fragrance) => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Mounted only while open so opening always starts from a clean state. */
export function CollectionWearPicker({
  busy = false,
  onClose,
  onSelect,
}: CollectionWearPickerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [items, setItems] = useState<Fragrance[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        let collection = await getCachedCollection();
        if (collection.length === 0) {
          const { items: fetched } = await fetchCollection();
          collection = fetched;
        }
        if (!active) return;
        setItems(collection);
      } catch {
        if (!active) return;
        setError("Could not load your collection.");
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
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

      if (
        event.shiftKey &&
        (active === first || !panelRef.current.contains(active))
      ) {
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
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => {
        if (!q) return true;
        return (
          item.perfume.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [items, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-3 py-4 sm:items-center sm:px-6 sm:py-8"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close wear picker"
        className="absolute inset-0 bg-black/75"
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[80dvh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-(--glass-border) bg-(--bg-deep) shadow-xl"
      >
        <div className="border-b border-(--glass-border) p-4">
          <h2
            id={titleId}
            className="font-(family-name:--font-display) text-xl text-(--text-primary)"
          >
            Wear something else
          </h2>
          <p className="mt-1 text-sm text-(--text-secondary)">
            Pick any bottle from your collection — it appends to today.
          </p>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your collection"
            disabled={busy}
            className="mt-3 h-11 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-sm text-(--text-primary) placeholder:text-(--text-secondary)"
            aria-label="Filter collection"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="p-3 text-sm text-(--text-secondary)">Loading…</p>
          ) : error ? (
            <p className="p-3 text-sm text-(--danger)" role="alert">
              {error}
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-3 text-sm text-(--text-secondary)">
              No matching bottles.
            </p>
          ) : (
            <ul role="list" className="space-y-1">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSelect(item)}
                    className="flex w-full min-h-(--space-touch) flex-col items-start rounded-md px-3 py-2 text-left hover:bg-(--glass-bg) disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
                  >
                    <span className="text-sm text-(--text-primary)">
                      {item.perfume}
                    </span>
                    <span className="text-xs text-(--text-secondary)">
                      {item.brand}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-(--glass-border) p-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-(--space-touch) w-full items-center justify-center rounded-md border border-(--glass-border) text-sm text-(--text-secondary) disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
