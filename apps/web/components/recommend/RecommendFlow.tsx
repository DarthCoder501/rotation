"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ActivityPicker,
  OtherActivityModal,
  type ActivityChoice,
  PRESET_ACTIVITIES,
} from "@/components/recommend/ActivityPicker";
import {
  RecommendationCard,
  RecommendationOption,
} from "@/components/recommend/RecommendationCard";
import { CandidateCarousel } from "@/components/recommend/CandidateCarousel";
import { RankerDebugPanel } from "@/components/recommend/RankerDebugPanel";
import { GlassCard } from "@/components/ui/GlassCard";
import { fetchCollection } from "@/lib/api/collection-client";
import { callMCPTool } from "@/lib/mcp-client";
import { fallbackRecommendation } from "@/lib/mcp/fallback";
import type { RecommendationResult, WeatherResult } from "@/lib/mcp/types";
import { loadAffinities } from "@/lib/ranker/affinity-store";
import { buildMCPContext } from "@/lib/ranker/build-mcp-context";
import type { RankingContext } from "@/lib/ranker/context-features";
import {
  FragranceRanker,
  recommendationOptionCount,
} from "@/lib/ranker/fragrance-ranker";
import { syncAffinityTasteProfile } from "@/lib/ranker/sync-affinity-taste";
import type { RankedFragrance, UserProfile } from "@/lib/ranker/types";
import { EMPTY_PROFILE } from "@/lib/ranker/types";
import {
  cacheCollection,
  getCachedCollection,
} from "@/lib/collection-cache";
import { resolveCoordsQuickly } from "@/lib/geo";
import { useTempUnit } from "@/lib/temperature";
import type { Fragrance } from "@/lib/types/fragrance";

type FlowState = "boot" | "loading" | "ready" | "offline" | "empty" | "error";

const DEFAULT_ACTIVITY = "Relax";
const WEATHER_CACHE_KEY = "scent_last_weather";

function readCachedWeather(): WeatherResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeatherResult;
  } catch {
    return null;
  }
}

function writeCachedWeather(weather: WeatherResult): void {
  try {
    sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weather));
  } catch {
    /* ignore */
  }
}

export function RecommendFlow() {
  const router = useRouter();
  const { profileId, profile, loading: authLoading, refresh } = useAuth();
  const { unit: tempUnit } = useTempUnit();

  const [state, setState] = useState<FlowState>("boot");
  const [activity, setActivity] = useState(DEFAULT_ACTIVITY);
  const [selectedChip, setSelectedChip] =
    useState<ActivityChoice>(DEFAULT_ACTIVITY);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherDraft, setOtherDraft] = useState("");
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [recommendation, setRecommendation] =
    useState<RecommendationResult | null>(null);
  const [options, setOptions] = useState<RankedFragrance[]>([]);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  const rankerRef = useRef<FragranceRanker | null>(null);
  const profileRef = useRef<UserProfile>(EMPTY_PROFILE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!profileId) {
      rankerRef.current = null;
      return;
    }
    rankerRef.current = new FragranceRanker(profileId);
  }, [profileId]);

  const resolveCollection = useCallback(async (): Promise<Fragrance[]> => {
    const cached = await getCachedCollection();
    if (cached.length > 0) return cached;

    const { items } = await fetchCollection();
    await cacheCollection(items);
    return items;
  }, []);

  const runRecommend = useCallback(
    async (activityLabel: string) => {
      if (!profileId) return;

      const runId = ++runIdRef.current;
      // Keep existing recommendation visible during refreshes so window
      // focus / auth events do not blank the page to a dark loading state.
      setState((prev) =>
        prev === "ready" || prev === "offline" ? prev : "loading",
      );
      setErrorMessage(null);
      setChosenId(null);

      try {
        const collection = await resolveCollection();
        if (runId !== runIdRef.current) return;

        if (collection.length === 0) {
          setState("empty");
          router.replace("/onboarding");
          return;
        }

        const ranker = rankerRef.current ?? new FragranceRanker(profileId);
        rankerRef.current = ranker;
        const taste = profileRef.current ?? EMPTY_PROFILE;
        const affinities = loadAffinities(profileId);
        const optionCount = recommendationOptionCount(collection.length);

        const coords = resolveCoordsQuickly();
        const cachedWeather = readCachedWeather() ?? {
          tempC: 20,
          condition: "Unknown",
          humidity: 50,
        };
        setWeather(cachedWeather);

        const rankingContext: RankingContext = {
          activity: activityLabel,
          weather: cachedWeather,
        };

        let ranked = ranker.rankAll(
          collection,
          taste,
          Math.max(optionCount, 5),
          affinities,
          rankingContext,
        );

        if (ranked.length === 0) {
          setState("error");
          setErrorMessage(
            "None of your collection fragrances meet the rating floor yet.",
          );
          return;
        }

        let shortlist = ranked.slice(0, optionCount);
        setOptions(shortlist);

        const provisionalContext = buildMCPContext({
          userActivity: activityLabel,
          weather: cachedWeather,
          profile: taste,
          shortlist,
          tempUnit,
        });
        setRecommendation(fallbackRecommendation(provisionalContext));
        setState("ready");

        let weatherResult: WeatherResult = cachedWeather;
        try {
          weatherResult = await callMCPTool("get_weather", coords);
          writeCachedWeather(weatherResult);
        } catch {
          /* keep cached */
        }
        if (runId !== runIdRef.current) return;
        setWeather(weatherResult);

        const liveContext: RankingContext = {
          activity: activityLabel,
          weather: weatherResult,
        };
        ranked = ranker.rankAll(
          collection,
          taste,
          Math.max(optionCount, 5),
          affinities,
          liveContext,
        );
        shortlist = ranked.slice(0, optionCount);
        setOptions(shortlist);

        const context = buildMCPContext({
          userActivity: activityLabel,
          weather: weatherResult,
          profile: taste,
          shortlist,
          tempUnit,
        });

        try {
          const result = await callMCPTool(
            "synthesize_recommendation",
            context,
          );
          if (runId !== runIdRef.current) return;
          setRecommendation(result);
          setState("ready");
        } catch {
          if (runId !== runIdRef.current) return;
          setRecommendation(fallbackRecommendation(context));
          setState("offline");
        }
      } catch (error) {
        if (runId !== runIdRef.current) return;
        setState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not build a recommendation.",
        );
      }
    },
    [profileId, resolveCollection, router, tempUnit],
  );

  useEffect(() => {
    if (authLoading || !profileId) return;
    const timeoutId = window.setTimeout(() => {
      void runRecommend(activity);
    }, 0);
    return () => window.clearTimeout(timeoutId);
    // Boot once we have a profile. Activity changes go through scheduleRecommend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profileId]);

  const showInitialLoading =
    (state === "boot" || state === "loading" || authLoading) &&
    recommendation == null;

  function scheduleRecommend(nextActivity: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runRecommend(nextActivity);
    }, 220);
  }

  function handlePreset(next: (typeof PRESET_ACTIVITIES)[number]) {
    setSelectedChip(next);
    setActivity(next);
    scheduleRecommend(next);
  }

  function handleConfirmOther() {
    const trimmed = otherDraft.trim();
    if (!trimmed) return;
    setSelectedChip("Other");
    setActivity(trimmed);
    setOtherOpen(false);
    scheduleRecommend(trimmed);
  }

  function haptic() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(10);
    }
  }

  const featured =
    options.find(
      (item) =>
        recommendation &&
        item.perfume.toLowerCase() ===
          recommendation.selectedPerfume.toLowerCase(),
    ) ?? options[0] ?? null;

  function currentRankingContext(): RankingContext {
    return {
      activity,
      weather: weather ?? undefined,
    };
  }

  function applyChoice(
    option: RankedFragrance,
    mode: "choose" | "love" | "prefer" = "choose",
  ) {
    if (!rankerRef.current || choosing) return;
    setChoosing(true);

    const taste = profileRef.current;
    const ctx = currentRankingContext();
    const strength = mode === "love" ? 100 : mode === "prefer" ? 85 : 100;
    rankerRef.current.recordPreference(option, taste, strength, ctx);

    for (const other of options) {
      if (other.id === option.id) continue;
      rankerRef.current.recordPairwiseChoice(
        option,
        other,
        taste,
        mode === "prefer" ? 70 : 80,
        ctx,
      );
    }

    void syncAffinityTasteProfile(taste, option, strength).then((saved) => {
      if (saved) {
        profileRef.current = saved;
        void refresh({ silent: true });
      }
    });

    setChosenId(option.id);
    setRecommendation((current) =>
      current
        ? {
            ...current,
            headline: option.perfume,
            selectedPerfume: option.perfume,
            selectedBrand: option.brand,
            accentAccord: option.mainAccord1 ?? current.accentAccord,
            narrative:
              current.selectedPerfume.toLowerCase() ===
              option.perfume.toLowerCase()
                ? current.narrative
                : `${option.perfume} by ${option.brand} is what you're wearing today — noted for next time.`,
          }
        : current,
    );
    haptic();
    setChoosing(false);
  }

  function handleChoose(option: RankedFragrance) {
    applyChoice(option, "choose");
  }

  function handleLove() {
    if (!featured) return;
    applyChoice(featured, "love");
  }

  function handleSkip() {
    if (!rankerRef.current || !featured || choosing) return;
    setChoosing(true);

    const taste = profileRef.current;
    const ctx = currentRankingContext();
    rankerRef.current.recordFeedback(featured, taste, -1, ctx);
    void syncAffinityTasteProfile(taste, featured, 0).then((saved) => {
      if (saved) {
        profileRef.current = saved;
        void refresh({ silent: true });
      }
    });

    const remaining = options.filter((item) => item.id !== featured.id);
    setOptions(remaining);

    if (remaining.length === 0) {
      setRecommendation((current) =>
        current
          ? {
              ...current,
              narrative:
                "Skipped for now — add more bottles or tweak taste preferences for a wider shortlist.",
            }
          : current,
      );
      setChosenId(null);
      haptic();
      setChoosing(false);
      return;
    }

    const next = remaining[0];
    setRecommendation((current) =>
      current
        ? {
            ...current,
            headline: next.perfume,
            selectedPerfume: next.perfume,
            selectedBrand: next.brand,
            accentAccord: next.mainAccord1 ?? current.accentAccord,
            narrative: `${next.perfume} by ${next.brand} is next up after your skip — still learning your taste.`,
          }
        : current,
    );
    haptic();
    setChoosing(false);
  }

  function handlePreferAlternative(
    winner: RankedFragrance,
    loser: RankedFragrance | null,
  ) {
    if (!rankerRef.current || choosing) return;
    const ctx = currentRankingContext();
    if (loser) {
      rankerRef.current.recordPairwiseChoice(
        winner,
        loser,
        profileRef.current,
        80,
        ctx,
      );
    }
    applyChoice(winner, "prefer");
  }

  function handleSkipCandidate(skipped: RankedFragrance) {
    if (!rankerRef.current || choosing) return;
    rankerRef.current.recordFeedback(
      skipped,
      profileRef.current,
      -1,
      currentRankingContext(),
    );
    void syncAffinityTasteProfile(profileRef.current, skipped, 0).then(
      (saved) => {
        if (saved) {
          profileRef.current = saved;
          void refresh({ silent: true });
        }
      },
    );
    setOptions((prev) => prev.filter((item) => item.id !== skipped.id));
    haptic();
  }

  const busy = showInitialLoading || choosing;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-4" aria-busy={busy}>
      <header className="mb-6">
        <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
          Today&apos;s scent
        </h1>
        <p className="mt-2 text-sm text-(--text-secondary)">
          We narrow your collection for the weather and activity — you pick
          what to wear, and we learn from the choice.
        </p>
      </header>

      {showInitialLoading && (
        <GlassCard className="p-6" aria-live="polite">
          <p className="font-(family-name:--font-display) text-lg text-(--text-primary)">
            Reading the air…
          </p>
          <p className="mt-2 text-sm text-(--text-secondary)">
            Ranking bottles you already love against today&apos;s conditions.
          </p>
          <div className="mt-5 h-28 animate-pulse rounded-md border border-(--glass-border) bg-(--glass-bg)" />
        </GlassCard>
      )}

      {state === "error" && (
        <GlassCard className="p-6" role="alert">
          <p className="text-sm text-(--danger)">
            {errorMessage ?? "Something went wrong."}
          </p>
          <button
            type="button"
            onClick={() => void runRecommend(activity)}
            className="mt-4 inline-flex min-h-(--space-touch) items-center text-(--accent-gold) underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            Try again
          </button>
        </GlassCard>
      )}

      {(state === "ready" || state === "offline") && recommendation && (
        <>
          <RecommendationCard
            recommendation={recommendation}
            fragrance={featured}
            weather={weather}
            offline={state === "offline"}
            chosen={chosenId != null && featured?.id === chosenId}
            feedbackDisabled={choosing || !featured}
            onLove={handleLove}
            onSkip={handleSkip}
          />

          <ActivityPicker
            value={activity}
            selectedChip={selectedChip}
            onSelectPreset={handlePreset}
            onSelectOther={() => {
              setOtherDraft(selectedChip === "Other" ? activity : "");
              setOtherOpen(true);
            }}
            disabled={choosing}
          />

          {options.length > 1 && recommendation && (
            <CandidateCarousel
              candidates={options}
              selectedPerfume={recommendation.selectedPerfume}
              disabled={choosing}
              onPrefer={handlePreferAlternative}
              onSkipCandidate={handleSkipCandidate}
            />
          )}

          <section aria-labelledby="options-heading" className="mt-8">
            <h2
              id="options-heading"
              className="mb-3 text-sm font-medium text-(--text-primary)"
            >
              {options.length <= 1
                ? "Your pick"
                : `Choose from ${options.length} options`}
            </h2>
            <p className="mb-3 text-xs text-(--text-secondary)">
              Ranked from your collection likes + weather fit. Wear this, Skip,
              or pick another option to quietly personalize future days.
            </p>
            <ul role="list" className="space-y-3">
              {options.map((option) => (
                <RecommendationOption
                  key={option.id}
                  fragrance={option}
                  featured={featured?.id === option.id}
                  selected={chosenId === option.id}
                  disabled={choosing}
                  onChoose={() => handleChoose(option)}
                />
              ))}
            </ul>
          </section>
        </>
      )}

      <OtherActivityModal
        open={otherOpen}
        draft={otherDraft}
        onDraftChange={setOtherDraft}
        onClose={() => setOtherOpen(false)}
        onConfirm={handleConfirmOther}
      />

      <RankerDebugPanel />
    </div>
  );
}
