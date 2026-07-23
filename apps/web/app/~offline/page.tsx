import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Precached offline shell shown when navigation fails without a network.
 * Keep this page dependency-light so the SW can serve it reliably.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12 text-center">
      <p className="font-(family-name:--font-display) text-3xl text-(--text-primary)">
        Rotation
      </p>
      <h1 className="mt-6 font-(family-name:--font-display) text-2xl text-(--text-primary)">
        You&apos;re offline
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-(--text-secondary)">
        Your cached collection can still power recommendations once you&apos;re
        back online. Check your connection and try again.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-(--space-touch) items-center justify-center rounded-full bg-(--accent-gold) px-6 text-sm font-medium text-(--text-on-accent)"
      >
        Try again
      </Link>
      <Link
        href="/collection"
        className="mt-3 inline-flex min-h-(--space-touch) items-center justify-center text-sm text-(--accent-gold) underline-offset-4 hover:underline"
      >
        Open collection
      </Link>
    </div>
  );
}
