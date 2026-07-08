import { AppShell } from "@/components/shell/AppShell";
import { SubmitPageClient } from "@/components/submit/SubmitPageClient";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <AppShell>
      <SubmitPageClient initialQuery={q ?? ""} />
    </AppShell>
  );
}
