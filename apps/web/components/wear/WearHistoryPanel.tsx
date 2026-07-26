"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { fetchWearHistory } from "@/lib/api/wears-client";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import type { WearEvent } from "@/lib/types/wear";

function formatDay(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export function WearHistoryPanel() {
  const [wears, setWears] = useState<WearEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchWearHistory({ limit: 60 });
      setWears(rows);
    } catch (e) {
      setError(toUserFacingMessage(e, "Could not load wear history."));
      setWears([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const grouped = wears.reduce<Record<string, WearEvent[]>>((acc, wear) => {
    const key = wear.wornOn;
    if (!acc[key]) acc[key] = [];
    acc[key].push(wear);
    return acc;
  }, {});

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <section aria-labelledby="history-heading" className="space-y-4">
      <div>
        <h2
          id="history-heading"
          className="font-(family-name:--font-display) text-xl text-(--text-primary)"
        >
          Wear history
        </h2>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Every logged wear, including multiple bottles on the same day.
        </p>
      </div>

      {error && (
        <p className="text-sm text-(--danger)" role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => void load()}
            className="text-(--accent-gold) underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-md border border-(--glass-border) bg-(--glass-bg)"
            />
          ))}
        </div>
      ) : days.length === 0 && !error ? (
        <p className="text-sm text-(--text-secondary)">
          No wears yet. Choose on{" "}
          <Link href="/" className="text-(--accent-gold) underline-offset-2 hover:underline">
            Scent
          </Link>{" "}
          to start a history.
        </p>
      ) : (
        <ul role="list" className="space-y-4">
          {days.map((day) => (
            <li key={day}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-(--text-secondary)">
                {formatDay(day)}
              </h3>
              <ul role="list" className="space-y-2">
                {grouped[day].map((wear) => (
                  <li key={wear.id}>
                    <GlassCard className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {wear.fragrance ? (
                            <Link
                              href={`/fragrance/${wear.fragranceId}`}
                              className="block truncate text-sm text-(--text-primary) underline-offset-2 hover:underline"
                            >
                              {wear.fragrance.perfume}
                            </Link>
                          ) : (
                            <p className="text-sm text-(--text-primary)">
                              Fragrance #{wear.fragranceId}
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-(--text-secondary)">
                            {wear.fragrance?.brand}
                            {wear.activity ? ` · ${wear.activity}` : ""}
                            {wear.source !== "recommend"
                              ? ` · via ${wear.source}`
                              : ""}
                          </p>
                        </div>
                        <time
                          dateTime={wear.createdAt}
                          className="shrink-0 text-xs tabular-nums text-(--text-secondary)"
                        >
                          {new Date(wear.createdAt).toLocaleTimeString(
                            undefined,
                            { hour: "numeric", minute: "2-digit" },
                          )}
                        </time>
                      </div>
                    </GlassCard>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
