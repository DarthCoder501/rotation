"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "scent_pwa_install_dismissed";

/**
 * Soft install banner for Chromium browsers that fire beforeinstallprompt.
 * iOS users get a short tip instead (no programmatic install API).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* private mode */
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    if (isStandalone) return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !/crios|fxios|edgios/i.test(navigator.userAgent);

    const timeoutId = window.setTimeout(() => {
      if (isIos) {
        setIosHint(true);
        setVisible(true);
      }
    }, 0);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setDeferred(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user dismissed native sheet */
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Install Rotation"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto w-[min(100%-1.5rem,28rem)] rounded-md border border-(--glass-border) bg-(--glass-bg) p-4 shadow-lg"
    >
      <p className="font-(family-name:--font-display) text-base text-(--text-primary)">
        Install Rotation
      </p>
      <p className="mt-1 text-xs leading-relaxed text-(--text-secondary)">
        {iosHint
          ? "On iPhone: tap Share, then Add to Home Screen for the full-screen app."
          : "Add to your home screen for faster launches and offline collection access."}
      </p>
      <div className="mt-3 flex gap-2">
        {!iosHint && deferred && (
          <button
            type="button"
            onClick={() => void install()}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-(--accent-gold) px-4 text-sm font-medium text-(--text-on-accent)"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-(--glass-border) px-4 text-sm text-(--text-secondary)"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
