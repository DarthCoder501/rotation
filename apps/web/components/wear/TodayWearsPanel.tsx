"use client";

import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { useWears } from "@/components/wear/WearProvider";

export function TodayWearsPanel() {
  const { todayWears, loading, error, refreshToday } = useWears();

  return (
    <section aria-labelledby="today-wears-heading" className="space-y-4">
      <div>
        <h2
          id="today-wears-heading"
          className="font-(family-name:--font-display) text-xl text-(--text-primary)"
        >
          Today
        </h2>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Bottles logged today, newest first. Choosing again on Scent appends
          another instead of replacing this.
        </p>
      </div>

      {error && (
        <p className="text-sm text-(--danger)" role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => void refreshToday()}
            className="text-(--accent-gold) underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </p>
      )}

      {loading && todayWears.length === 0 ? (
        <div className="h-24 animate-pulse rounded-md border border-(--glass-border) bg-(--glass-bg)" />
      ) : todayWears.length === 0 ? (
        <p className="text-sm text-(--text-secondary)">
          Nothing yet.{" "}
          <Link
            href="/"
            className="text-(--accent-gold) underline-offset-2 hover:underline"
          >
            Choose a scent
          </Link>{" "}
          or wear something else from your collection.
        </p>
      ) : (
        <ul role="list" className="space-y-2">
          {todayWears.map((wear) => (
            <li key={wear.id}>
              <GlassCard className="p-4">
                {wear.fragrance ? (
                  <Link
                    href={`/fragrance/${wear.fragranceId}`}
                    className="font-(family-name:--font-display) text-lg text-(--text-primary) underline-offset-2 hover:underline"
                  >
                    {wear.fragrance.perfume}
                  </Link>
                ) : (
                  <p className="font-(family-name:--font-display) text-lg text-(--text-primary)">
                    Fragrance #{wear.fragranceId}
                  </p>
                )}
                <p className="mt-1 text-sm text-(--text-secondary)">
                  {wear.fragrance?.brand}
                  {wear.activity ? ` · ${wear.activity}` : ""}
                  {wear.source !== "recommend"
                    ? ` · via ${wear.source}`
                    : ""}
                </p>
                <time
                  dateTime={wear.createdAt}
                  className="mt-2 block text-xs tabular-nums text-(--text-secondary)"
                >
                  {new Date(wear.createdAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
