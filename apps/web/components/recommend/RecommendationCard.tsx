"use client";

import Link from "next/link";
import { AccordBubbles } from "@/components/collection/AccordBubbles";
import { GlassCard } from "@/components/ui/GlassCard";
import type { RecommendationResult, WeatherResult } from "@/lib/mcp/types";
import { getAccords } from "@/lib/types/fragrance";
import type { RankedFragrance } from "@/lib/ranker/types";

interface RecommendationCardProps {
  recommendation: RecommendationResult;
  fragrance: RankedFragrance | null;
  weather: WeatherResult | null;
  offline?: boolean;
  chosen?: boolean;
  feedbackDisabled?: boolean;
  loveLabel?: string;
  skipLabel?: string;
  onLove?: () => void;
  onSkip?: () => void;
}

export function RecommendationCard({
  recommendation,
  fragrance,
  weather,
  offline = false,
  chosen = false,
  feedbackDisabled = false,
  loveLabel = "Wear this",
  skipLabel = "Skip",
  onLove,
  onSkip,
}: RecommendationCardProps) {
  const accords = fragrance
    ? getAccords(fragrance)
    : [recommendation.accentAccord].filter(Boolean);
  const headlineId = "recommendation-headline";
  const showFeedback = Boolean(onLove || onSkip) && !chosen;

  return (
    <GlassCard
      as="article"
      className={`p-5 sm:p-6 ${chosen ? "border-(--accent-gold)/50" : ""}`}
      aria-labelledby={headlineId}
    >
      {weather && (
        <p
          className="text-xs text-(--text-secondary) tabular-nums"
          aria-live="polite"
        >
          {weather.tempC}°C · {weather.condition} · {weather.humidity}%
        </p>
      )}

      {offline && (
        <p
          className="mt-2 rounded-md border border-(--accent-gold)/30 bg-(--accent-gold)/10 px-3 py-2 text-xs text-(--accent-gold)"
          role="status"
        >
          Ranker pick — narrative unavailable right now.
        </p>
      )}

      <h2
        id={headlineId}
        className="mt-3 font-(family-name:--font-display) text-2xl leading-tight text-(--text-primary) sm:text-3xl"
      >
        {recommendation.headline}
      </h2>

      <p className="mt-2 text-sm text-(--text-secondary)">
        <span className="text-(--text-primary)">{recommendation.selectedPerfume}</span>
        {" · "}
        {recommendation.selectedBrand}
      </p>

      <div className="mt-3">
        <AccordBubbles accords={accords} size="sm" />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-(--text-secondary)">
        {recommendation.narrative}
      </p>

      {showFeedback && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={feedbackDisabled || !onLove}
            onClick={onLove}
            className="inline-flex min-h-(--space-touch) items-center justify-center rounded-full bg-(--accent-gold) px-4 text-sm font-medium text-(--text-on-accent) hover:bg-(--accent-gold-hover) disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            {loveLabel}
          </button>
          <button
            type="button"
            disabled={feedbackDisabled || !onSkip}
            onClick={onSkip}
            className="inline-flex min-h-(--space-touch) items-center justify-center rounded-full border border-(--glass-border) px-4 text-sm text-(--text-primary) hover:border-(--accent-gold)/50 disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            {skipLabel}
          </button>
        </div>
      )}

      {chosen && (
        <p className="mt-4 text-sm text-(--success)" role="status">
          Noted for today — we&apos;ll remember this choice.
        </p>
      )}

      {fragrance && (
        <Link
          href={`/fragrance/${fragrance.id}`}
          className="mt-4 inline-flex min-h-(--space-touch) items-center text-sm text-(--accent-gold) underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          View details
        </Link>
      )}
    </GlassCard>
  );
}

interface RecommendationOptionProps {
  fragrance: RankedFragrance;
  featured?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onChoose: () => void;
}

export function RecommendationOption({
  fragrance,
  featured = false,
  selected = false,
  disabled = false,
  onChoose,
}: RecommendationOptionProps) {
  return (
    <GlassCard
      as="li"
      className={`p-4 transition-colors ${
        selected
          ? "border-(--accent-gold) bg-(--accent-gold)/10"
          : "hover:border-(--accent-gold)/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {featured && (
            <p className="text-[11px] uppercase tracking-wide text-(--accent-gold)">
              Best match right now
            </p>
          )}
          <h3 className="font-(family-name:--font-display) text-lg leading-tight text-(--text-primary)">
            {fragrance.perfume}
          </h3>
          <p className="mt-0.5 text-sm text-(--text-secondary)">
            {fragrance.brand}
          </p>
          <div className="mt-2">
            <AccordBubbles
              accords={getAccords(fragrance)}
              maxVisible={3}
              size="sm"
              highlightPrimary={false}
            />
          </div>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-(--text-secondary)">
          ★ {fragrance.ratingValue.toFixed(1)}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onChoose}
        className={`mt-4 inline-flex min-h-(--space-touch) w-full items-center justify-center rounded-full px-5 text-sm font-medium focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50 ${
          selected
            ? "bg-(--accent-gold) text-(--text-on-accent)"
            : "border border-(--glass-border) text-(--text-primary) hover:border-(--accent-gold)/50"
        }`}
      >
        {selected ? "Chosen for today" : "Choose this"}
      </button>
    </GlassCard>
  );
}
