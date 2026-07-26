"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AuthSection } from "@/components/auth/AuthSection";
import { SubmissionsList } from "@/components/profile/SubmissionsList";
import { TastePreferencesPanel } from "@/components/profile/TastePreferencesPanel";
import { SlideshowNav } from "@/components/ui/SlideshowNav";
import { TodayWearsPanel } from "@/components/wear/TodayWearsPanel";
import { WearHistoryPanel } from "@/components/wear/WearHistoryPanel";
import { WearInsightsPanel } from "@/components/wear/WearInsightsPanel";

const PROFILE_SECTIONS = [
  { id: "today", label: "Today" },
  { id: "taste", label: "Taste" },
  { id: "submissions", label: "Submissions" },
  { id: "history", label: "History" },
  { id: "insights", label: "Insights" },
  { id: "account", label: "Account" },
] as const;

type SectionId = (typeof PROFILE_SECTIONS)[number]["id"];

function isSectionId(value: string | null): value is SectionId {
  return PROFILE_SECTIONS.some((section) => section.id === value);
}

export function ProfilePageClient() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
          Profile
        </h1>
        <p className="mt-2 text-sm text-(--text-secondary)">
          One section at a time — swipe-style controls, or jump with the menu.
        </p>
      </header>

      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>

      <Suspense fallback={<ProfileSlideshowFallback />}>
        <ProfileSlideshow />
      </Suspense>
    </div>
  );
}

function ProfileSlideshowFallback() {
  return (
    <div className="h-64 animate-pulse rounded-md border border-(--glass-border) bg-(--glass-bg)" />
  );
}

function ProfileSlideshow() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const activeId: SectionId = isSectionId(sectionParam) ? sectionParam : "today";
  const section =
    PROFILE_SECTIONS.find((item) => item.id === activeId) ??
    PROFILE_SECTIONS[0];

  // Shallow URL update: keeps deep links / back button working without
  // re-running the server component tree on every section change.
  function goTo(id: string) {
    if (!isSectionId(id)) return;
    window.history.pushState(null, "", `/profile?section=${id}`);
  }

  let body: ReactNode = null;
  switch (section.id) {
    case "today":
      body = <TodayWearsPanel />;
      break;
    case "taste":
      body = <TastePreferencesPanel slideshow />;
      break;
    case "submissions":
      body = <SubmissionsList slideshow />;
      break;
    case "history":
      body = <WearHistoryPanel />;
      break;
    case "insights":
      body = <WearInsightsPanel />;
      break;
    case "account":
      body = <AuthSection />;
      break;
  }

  return (
    <div className="space-y-4">
      <SlideshowNav
        label="Profile section"
        options={PROFILE_SECTIONS.map((item) => ({
          id: item.id,
          label: item.label,
        }))}
        activeId={section.id}
        onSelect={goTo}
      />

      <div key={section.id}>{body}</div>
    </div>
  );
}

function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");
  if (!authError) return null;

  return (
    <p className="mb-4 text-sm text-(--danger)" role="alert">
      Google sign-in did not complete. Check Supabase Auth redirect URLs and try
      again.
    </p>
  );
}
