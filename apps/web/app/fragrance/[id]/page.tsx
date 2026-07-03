import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";

/**
 * Detail view stub — flesh out in a later phase with full note pyramid UI.
 * Will load fragrance by id from GET /api/catalog/[id] or similar.
 */
export default async function FragranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/collection"
          className="text-sm text-(--accent-gold) hover:underline"
        >
          ← Back to collection
        </Link>
        <h1 className="mt-4 font-(family-name:--font-display) text-2xl">
          Fragrance detail
        </h1>
        <p className="mt-2 text-(--text-secondary)">
          ID: {id} — implement data fetch when your catalog API is ready.
        </p>
      </div>
    </AppShell>
  );
}
