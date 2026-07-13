import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";

export default function ProfilePage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <p className="px-4 py-6 text-sm text-(--text-secondary)">
            Loading profile…
          </p>
        }
      >
        <ProfilePageClient />
      </Suspense>
    </AppShell>
  );
}
