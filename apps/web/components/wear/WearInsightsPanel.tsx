"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { fetchWearInsights } from "@/lib/api/wears-client";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import type { WearInsights } from "@/lib/types/wear";

export function WearInsightsPanel() {
  const [insights, setInsights] = useState<WearInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInsights(await fetchWearInsights());
    } catch (e) {
      setError(toUserFacingMessage(e, "Could not load wear insights."));
      setInsights(null);
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

  return (
    <section aria-labelledby="insights-heading" className="space-y-4">
      <div>
        <h2
          id="insights-heading"
          className="font-(family-name:--font-display) text-xl text-(--text-primary)"
        >
          Wear insights
        </h2>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Patterns from what you actually wear — not just what you like on paper.
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
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-md border border-(--glass-border) bg-(--glass-bg)"
            />
          ))}
        </div>
      ) : !insights || insights.totalWears === 0 ? (
        <p className="text-sm text-(--text-secondary)">
          Log a few wears from{" "}
          <Link href="/" className="text-(--accent-gold) underline-offset-2 hover:underline">
            Scent
          </Link>{" "}
          to unlock insights.
        </p>
      ) : (
        <>
          <GlassCard className="p-4">
            <p className="text-sm text-(--text-secondary)">Logged</p>
            <p className="mt-1 font-(family-name:--font-display) text-2xl text-(--text-primary)">
              {insights.totalWears}{" "}
              <span className="text-base text-(--text-secondary)">
                wears across {insights.daysLogged} days
              </span>
            </p>
          </GlassCard>

          <CountList
            title="Most worn"
            empty="No fragrance counts yet."
            rows={insights.mostWorn.map((row) => ({
              key: String(row.fragranceId),
              label: row.brand ? `${row.perfume} · ${row.brand}` : row.perfume,
              count: row.count,
              href: `/fragrance/${row.fragranceId}`,
            }))}
          />

          <CountList
            title="By activity"
            empty="No activities logged."
            rows={insights.byActivity.map((row) => ({
              key: row.activity,
              label: row.activity,
              count: row.count,
            }))}
          />

          <CountList
            title="By weather"
            empty="No weather buckets yet."
            rows={insights.byWeatherBucket.map((row) => ({
              key: row.bucket,
              label: row.bucket,
              count: row.count,
            }))}
          />

          <CountList
            title="By season"
            empty="No seasonal data yet."
            rows={insights.bySeason.map((row) => ({
              key: row.season,
              label: row.season,
              count: row.count,
            }))}
          />
        </>
      )}
    </section>
  );
}

function CountList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{ key: string; label: string; count: number; href?: string }>;
}) {
  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-medium text-(--text-primary)">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-(--text-secondary)">{empty}</p>
      ) : (
        <ul role="list" className="mt-3 space-y-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-3 text-sm"
            >
              {row.href ? (
                <Link
                  href={row.href}
                  className="min-w-0 truncate text-(--text-primary) underline-offset-2 hover:underline"
                >
                  {row.label}
                </Link>
              ) : (
                <span className="min-w-0 truncate text-(--text-primary)">
                  {row.label}
                </span>
              )}
              <span className="shrink-0 tabular-nums text-(--text-secondary)">
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
