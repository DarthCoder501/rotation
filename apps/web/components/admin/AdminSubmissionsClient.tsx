"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import type { FragranceSubmission } from "@/lib/types/submission";

type FilterStatus = "pending" | "approved" | "rejected" | "all";

export function AdminSubmissionsClient() {
  const { isAuthenticated, isAdmin, loading: authLoading, signInWithGoogle } =
    useAuth();
  const [status, setStatus] = useState<FilterStatus>("pending");
  const [submissions, setSubmissions] = useState<FragranceSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/submissions?status=${encodeURIComponent(status)}`,
      );
      const body = (await res.json().catch(() => ({}))) as {
        submissions?: FragranceSubmission[];
        message?: string;
      };
      if (!res.ok) {
        throw new Error(body.message ?? `Failed (${res.status})`);
      }
      setSubmissions(body.submissions ?? []);
    } catch (e) {
      setSubmissions([]);
      setError(toUserFacingMessage(e, "Couldn't load submissions."));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function handleApprove(id: number) {
    setBusyId(id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/approve`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(body.message ?? `Approve failed (${res.status})`);
      }
      setMessage("Published to catalog — Custom badge cleared for that scent.");
      await load();
    } catch (e) {
      setError(toUserFacingMessage(e, "Couldn't approve that submission."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: number) {
    setBusyId(id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/reject`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(body.message ?? `Reject failed (${res.status})`);
      }
      setMessage(
        "Rejected — the submitter keeps their Custom scent privately.",
      );
      await load();
    } catch (e) {
      setError(toUserFacingMessage(e, "Couldn't reject that submission."));
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) {
    return (
      <p className="text-sm text-(--text-secondary)" aria-busy="true">
        Checking session…
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <GlassCard className="p-5">
        <p className="text-sm text-(--text-secondary)">
          Sign in with Google using an admin account to review submissions.
        </p>
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="mt-4 min-h-(--space-touch) rounded-md border border-(--accent-gold)/40 px-4 text-sm text-(--accent-gold)"
        >
          Continue with Google
        </button>
      </GlassCard>
    );
  }

  if (!isAdmin) {
    return (
      <GlassCard className="p-5">
        <p className="text-sm text-(--text-secondary)">
          Your account is signed in but not on the admin allowlist (
          <code className="text-(--text-primary)">ADMIN_EMAILS</code>).
        </p>
        <Link
          href="/profile"
          className="mt-4 inline-flex text-sm text-(--accent-gold) underline-offset-2 hover:underline"
        >
          Back to profile
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Filter by status"
        className="flex flex-wrap gap-2"
      >
        {(
          [
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
            ["all", "All"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            className={`min-h-9 rounded-md border px-3 text-xs ${
              status === value
                ? "border-(--accent-gold)/50 text-(--accent-gold)"
                : "border-(--glass-border) text-(--text-secondary)"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <p className="text-sm text-(--accent-gold)" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-(--danger)" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-(--text-secondary)" aria-busy="true">
          Loading…
        </p>
      ) : submissions.length === 0 ? (
        <p className="text-sm text-(--text-secondary)">No submissions here.</p>
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => (
            <li key={s.id}>
              <GlassCard className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-(family-name:--font-display) text-lg">
                      {s.perfume}
                    </h2>
                    <p className="text-sm text-(--text-secondary)">{s.brand}</p>
                  </div>
                  <span className="rounded-sm border border-(--glass-border) px-2 py-0.5 text-xs uppercase tracking-wide text-(--text-secondary)">
                    {s.status}
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-xs text-(--text-secondary)">
                  {s.topNotes && (
                    <div>
                      <dt className="inline text-(--text-primary)">Top: </dt>
                      <dd className="inline">{s.topNotes}</dd>
                    </div>
                  )}
                  {s.middleNotes && (
                    <div>
                      <dt className="inline text-(--text-primary)">Heart: </dt>
                      <dd className="inline">{s.middleNotes}</dd>
                    </div>
                  )}
                  {s.baseNotes && (
                    <div>
                      <dt className="inline text-(--text-primary)">Base: </dt>
                      <dd className="inline">{s.baseNotes}</dd>
                    </div>
                  )}
                  {(s.mainAccord1 || s.mainAccord2) && (
                    <div>
                      <dt className="inline text-(--text-primary)">Accords: </dt>
                      <dd className="inline">
                        {[
                          s.mainAccord1,
                          s.mainAccord2,
                          s.mainAccord3,
                          s.mainAccord4,
                          s.mainAccord5,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </dd>
                    </div>
                  )}
                  {s.userNotes && (
                    <div>
                      <dt className="inline text-(--text-primary)">Notes: </dt>
                      <dd className="inline">{s.userNotes}</dd>
                    </div>
                  )}
                  {s.promotedFragranceId != null && (
                    <div>
                      <dt className="inline text-(--text-primary)">
                        Fragrance id:{" "}
                      </dt>
                      <dd className="inline">
                        <Link
                          href={`/fragrance/${s.promotedFragranceId}`}
                          className="text-(--accent-gold) underline-offset-2 hover:underline"
                        >
                          #{s.promotedFragranceId}
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>
                {s.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => void handleApprove(s.id)}
                      className="min-h-10 flex-1 rounded-md border border-(--accent-gold)/40 text-sm text-(--accent-gold) disabled:opacity-50"
                    >
                      {busyId === s.id ? "Working…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => void handleReject(s.id)}
                      className="min-h-10 flex-1 rounded-md border border-(--glass-border) text-sm text-(--text-secondary) hover:border-(--danger)/40 hover:text-(--danger) disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
