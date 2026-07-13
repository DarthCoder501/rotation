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
import { createClient } from "@/lib/supabase/client";
import { hydrateRankerWeights } from "@/lib/ranker/weight-sync";
import type { UserProfile } from "@/lib/ranker/types";
import { EMPTY_PROFILE } from "@/lib/ranker/types";

type SessionState = {
  isAuthenticated: boolean;
  email: string | null;
  profileId: string | null;
  profile: UserProfile;
  loading: boolean;
  refresh: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<SessionState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load session");
      }

      const data = (await response.json()) as {
        isAuthenticated: boolean;
        email: string | null;
        profileId: string;
        profile: UserProfile;
      };

      setIsAuthenticated(data.isAuthenticated);
      setEmail(data.email);
      setProfileId(data.profileId);
      setProfile(data.profile ?? EMPTY_PROFILE);
      await hydrateRankerWeights(data.profileId);
    } catch {
      setIsAuthenticated(false);
      setEmail(null);
      setProfileId(null);
      setProfile(EMPTY_PROFILE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const signInWithGoogle = useCallback(async () => {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/profile`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    setIsAuthenticated(false);
    setEmail(null);
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      email,
      profileId,
      profile,
      loading,
      refresh,
      signInWithGoogle,
      signOut,
    }),
    [
      isAuthenticated,
      email,
      profileId,
      profile,
      loading,
      refresh,
      signInWithGoogle,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): SessionState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
