import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { InProgressPanel } from "@/components/ui/InProgressPanel";

export default async function FragranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/collection"
          className="text-sm text-(--accent-gold) hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          ← Back to collection
        </Link>

        <header className="mt-4 mb-8">
          <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
            Fragrance detail
          </h1>
          <p className="mt-2 text-sm text-(--text-secondary)">
            Notes, accords, and wear context for this bottle.
          </p>
        </header>

        <InProgressPanel
          title="Detail view in progress"
          description="The full note pyramid and bottle story for this fragrance are still being built. Your collection entry is saved — check back for the richer view."
          href="/collection"
          linkLabel="Back to collection"
        />

        <p className="mt-6 text-center text-xs text-(--text-secondary) tabular-nums">
          Catalog id · {id}
        </p>
      </div>
    </AppShell>
  );
}
