import { AppShell } from "../components/shell/AppShell";
import { InProgressPanel } from "../components/ui/InProgressPanel";

export default function Home() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col px-4 pt-6 pb-4">
        <header className="mb-8">
          <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
            Today&apos;s scent
          </h1>
          <p className="mt-2 text-sm text-(--text-secondary)">
            A daily pick from your collection, tuned to your taste.
          </p>
        </header>

        <InProgressPanel
          title="Recommendations coming soon"
          description="We're finishing the ranking engine that picks today's fragrance from your collection. Explore Search and Collection in the meantime."
          href="/collection"
          linkLabel="Go to collection"
        />
      </div>
    </AppShell>
  );
}
