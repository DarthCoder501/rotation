import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { AdminSubmissionsClient } from "@/components/admin/AdminSubmissionsClient";

export default function AdminSubmissionsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-(family-name:--font-display) text-3xl text-(--text-primary)">
          Submission review
        </h1>
        <p className="mt-2 text-sm text-(--text-secondary)">
          Approve publishes the linked Custom scent into the shared catalog
          (same id — collections stay intact). Reject leaves it Custom for the
          submitter only. Switch to Approved to edit published name, accords,
          notes, or Fragrantica link.
        </p>
        <div className="mt-6">
          <Suspense
            fallback={
              <p className="text-sm text-(--text-secondary)">Loading…</p>
            }
          >
            <AdminSubmissionsClient />
          </Suspense>
        </div>
      </div>
    </AppShell>
  );
}
