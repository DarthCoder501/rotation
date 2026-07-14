"use client";

import { useRef, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AccordBubbles } from "@/components/collection/AccordBubbles";
import { getAccords } from "@/lib/types/fragrance";
import type { RankedFragrance } from "@/lib/ranker/types";

const SWIPE_THRESHOLD = 64;

interface CandidateCarouselProps {
  candidates: RankedFragrance[];
  selectedPerfume: string;
  disabled?: boolean;
  onPrefer: (winner: RankedFragrance, loser: RankedFragrance | null) => void;
  onSkipCandidate?: (skipped: RankedFragrance) => void;
}

export function CandidateCarousel({
  candidates,
  selectedPerfume,
  disabled = false,
  onPrefer,
  onSkipCandidate,
}: CandidateCarouselProps) {
  const others = candidates
    .filter(
      (item) =>
        item.perfume.toLowerCase() !== selectedPerfume.toLowerCase(),
    )
    .slice(0, 4);

  if (others.length === 0) return null;

  const current =
    candidates.find(
      (item) =>
        item.perfume.toLowerCase() === selectedPerfume.toLowerCase(),
    ) ?? null;

  return (
    <section aria-labelledby="also-consider-heading" className="mt-8">
      <h2
        id="also-consider-heading"
        className="mb-1 text-sm font-medium text-(--text-secondary)"
      >
        Also consider
      </h2>
      <p className="mb-3 text-xs text-(--text-secondary)">
        Tap prefer, or swipe right to choose / left to skip — teaches the ranker
        quietly.
      </p>
      <ul
        role="list"
        className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {others.map((candidate) => (
          <CarouselCard
            key={candidate.id}
            candidate={candidate}
            disabled={disabled}
            onPrefer={() => onPrefer(candidate, current)}
            onSkip={() => onSkipCandidate?.(candidate)}
          />
        ))}
      </ul>
    </section>
  );
}

function CarouselCard({
  candidate,
  disabled,
  onPrefer,
  onSkip,
}: {
  candidate: RankedFragrance;
  disabled: boolean;
  onPrefer: () => void;
  onSkip: () => void;
}) {
  const startX = useRef<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);

  function endGesture(clientX: number) {
    if (startX.current == null || disabled) {
      startX.current = null;
      setOffsetX(0);
      setDragging(false);
      return;
    }

    const delta = clientX - startX.current;
    startX.current = null;
    setDragging(false);
    setOffsetX(0);

    if (delta >= SWIPE_THRESHOLD) {
      onPrefer();
      return;
    }
    if (delta <= -SWIPE_THRESHOLD) {
      onSkip();
    }
  }

  return (
    <li className="min-w-46 shrink-0 touch-pan-y">
      <GlassCard
        as="article"
        className="relative flex h-full flex-col overflow-hidden p-3 transition-transform"
        style={{
          transform: offsetX ? `translateX(${offsetX * 0.35}px)` : undefined,
          opacity: dragging ? 0.92 : 1,
        }}
      >
        <div
          className="flex flex-1 flex-col"
          onPointerDown={(e) => {
            if (disabled) return;
            startX.current = e.clientX;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (startX.current == null) return;
            setOffsetX(e.clientX - startX.current);
          }}
          onPointerUp={(e) => endGesture(e.clientX)}
          onPointerCancel={() => {
            startX.current = null;
            setOffsetX(0);
            setDragging(false);
          }}
        >
          <p className="font-(family-name:--font-display) text-base leading-tight text-(--text-primary)">
            {candidate.perfume}
          </p>
          <p className="mt-0.5 text-xs text-(--text-secondary)">
            {candidate.brand}
          </p>
          <div className="mt-2">
            <AccordBubbles
              accords={getAccords(candidate)}
              maxVisible={2}
              size="sm"
              highlightPrimary={false}
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onPrefer}
            className="flex-1 min-h-9 rounded-full bg-(--accent-gold)/15 px-2 text-xs text-(--accent-gold) disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            Prefer
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onSkip}
            className="flex-1 min-h-9 rounded-full border border-(--glass-border) px-2 text-xs text-(--text-secondary) disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            Skip
          </button>
        </div>
      </GlassCard>
    </li>
  );
}
