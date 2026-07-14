import { AppShell } from "@/components/shell/AppShell";
import { FragranceDetailClient } from "@/components/fragrance/FragranceDetailClient";

export default async function FragranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fragranceId = Number(id);
  const validId = Number.isInteger(fragranceId) && fragranceId > 0;

  return (
    <AppShell>
      {validId ? (
        <FragranceDetailClient fragranceId={fragranceId} />
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
            Fragrance not found
          </h1>
          <p className="mt-2 text-sm text-(--text-secondary)">
            That link doesn&apos;t point to a valid catalog entry.
          </p>
        </div>
      )}
    </AppShell>
  );
}
