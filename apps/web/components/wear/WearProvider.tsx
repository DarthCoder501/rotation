"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  fetchTodayWears,
  localDateString,
  logWear,
} from "@/lib/api/wears-client";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import type { CreateWearBody, WearEvent } from "@/lib/types/wear";

type WearContextValue = {
  wornOn: string;
  todayWears: WearEvent[];
  loading: boolean;
  error: string | null;
  refreshToday: () => Promise<void>;
  recordWear: (body: CreateWearBody) => Promise<WearEvent>;
};

const WearContext = createContext<WearContextValue | null>(null);

export function WearProvider({ children }: { children: ReactNode }) {
  const { profileId, loading: authLoading } = useAuth();
  const [wornOn] = useState(() => localDateString());
  const [todayWears, setTodayWears] = useState<WearEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshToday = useCallback(async () => {
    if (!profileId) {
      setTodayWears([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const wears = await fetchTodayWears(wornOn);
      setTodayWears(wears);
    } catch (e) {
      setError(toUserFacingMessage(e, "Could not load today's wears."));
      setTodayWears([]);
    } finally {
      setLoading(false);
    }
  }, [profileId, wornOn]);

  useEffect(() => {
    if (authLoading) return;
    const timeoutId = window.setTimeout(() => {
      void refreshToday();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [authLoading, refreshToday]);

  const recordWear = useCallback(
    async (body: CreateWearBody) => {
      const wear = await logWear({
        ...body,
        wornOn: body.wornOn ?? wornOn,
      });
      setTodayWears((prev) => {
        if (prev.some((item) => item.id === wear.id)) return prev;
        return [wear, ...prev];
      });
      return wear;
    },
    [wornOn],
  );

  const value = useMemo(
    () => ({
      wornOn,
      todayWears,
      loading,
      error,
      refreshToday,
      recordWear,
    }),
    [wornOn, todayWears, loading, error, refreshToday, recordWear],
  );

  return (
    <WearContext.Provider value={value}>{children}</WearContext.Provider>
  );
}

export function useWears() {
  const context = useContext(WearContext);
  if (!context) {
    throw new Error("useWears must be used within WearProvider");
  }
  return context;
}
