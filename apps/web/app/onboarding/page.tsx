import Link from "next/link";
import { AppShell } from "../../components/shell/AppShell";

export default function OnboardingPage() {
  return (
    <AppShell showNav={false}>
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="font-(family-name:--font-display) text-4xl leading-tight text-(--text-primary) sm:text-5xl">
            Rotation
          </h1>
          <p className="mt-3 text-base text-(--text-secondary)">
            Daily recommendations need a collection first.
          </p>
        </header>

        <section
          aria-labelledby="onboarding-cta-heading"
          className="glass-surface rounded-md border border-(--glass-border) p-6 text-center sm:p-8"
        >
          <h2
            id="onboarding-cta-heading"
            className="font-(family-name:--font-display) text-2xl text-(--text-primary)"
          >
            Add your first fragrance
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-(--text-secondary) sm:text-base">
            Search the catalog, claim bottles you own, and we&apos;ll start
            ranking a pick for today.
          </p>
          <Link
            href="/collection/search"
            className="mt-6 inline-flex min-h-(--space-touch) w-full items-center justify-center rounded-full bg-(--accent-gold) px-6 text-base font-medium text-(--text-on-accent) hover:bg-(--accent-gold-hover) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            Search the catalog
          </Link>
          <Link
            href="/collection"
            className="mt-3 inline-flex min-h-(--space-touch) w-full items-center justify-center text-sm text-(--accent-gold) underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            View collection
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
