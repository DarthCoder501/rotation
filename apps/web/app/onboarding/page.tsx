import Link from "next/link";
import { AppShell } from "../../components/shell/AppShell";
import { InProgressPanel } from "../../components/ui/InProgressPanel";

export default function OnboardingPage() {
  return (
    <AppShell showNav={false}>
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-12">
        <p className="mb-2 text-center font-(family-name:--font-display) text-3xl text-(--text-primary)">
          Rotation
        </p>
        <p className="mb-10 text-center text-sm text-(--text-secondary)">
          Build a collection. Get a better daily scent.
        </p>

        <InProgressPanel
          title="Onboarding in progress"
          description="Taste setup and first-run guidance are still being shaped. You can jump in now — search the catalog, build a collection, and sign in from Profile."
          href="/collection/search"
          linkLabel="Start with search"
        />

        <p className="mt-8 text-center text-sm text-(--text-secondary)">
          Already know your way around?{" "}
          <Link
            href="/"
            className="text-(--accent-gold) hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            Enter the app
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
