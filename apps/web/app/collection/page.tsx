import { Suspense } from "react";
import { CollectionPageClient } from "@/components/collection/CollectionPageClient";

export default function CollectionHomePage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-6 text-sm text-(--text-secondary)">
          Loading collection…
        </p>
      }
    >
      <CollectionPageClient />
    </Suspense>
  );
}
