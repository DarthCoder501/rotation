import Link from "next/link";
import { AppShell } from "../../components/shell/AppShell";

export default function OnboardingPage() {
  return (
    <AppShell showNav={false}>
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-12">
        <p className="mb-2 text-center font-(family-name:--font-display) text-3xl text-(--text-primary)">
          Rotation
        </p>
        <p className="mb-8 text-center text-sm text-(--text-secondary)">
          Daily recommendations need a collection first.
        </p>

        <div className="rounded-md border border-(--glass-border) bg-(--glass-bg) p-6 text-center backdrop-blur-(--glass-blur)">
          <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
            Add your first fragrance
          </h1>
          <p className="mt-3 text-sm text-(--text-secondary)">
            Search the catalog, claim bottles you own, and we&apos;ll start ranking
            a pick for today.
          </p>
          <Link
            href="/collection/search"
            className="mt-6 inline-flex min-h-(--space-touch) w-full items-center justify-center rounded-full bg-(--accent-gold) px-6 text-sm font-medium text-(--text-on-accent) hover:bg-(--accent-gold-hover) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            Search the catalog
          </Link>
          <Link
            href="/collection"
            className="mt-3 inline-flex min-h-(--space-touch) w-full items-center justify-center text-sm text-(--accent-gold) underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            View collection
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
