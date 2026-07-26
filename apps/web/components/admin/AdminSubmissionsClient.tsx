"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminApprovedEditForm } from "@/components/admin/AdminApprovedEditForm";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import type { FragranceSubmission } from "@/lib/types/submission";
import { normalizeExternalUrl } from "@/lib/url";

type FilterStatus = "pending" | "approved" | "rejected" | "all";

export function AdminSubmissionsClient() {
  const { isAuthenticated, isAdmin, loading: authLoading, signInWithGoogle } =
    useAuth();
  const [status, setStatus] = useState<FilterStatus>("pending");
  const [submissions, setSubmissions] = useState<FragranceSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [urlDrafts, setUrlDrafts] = useState<Record<number, string>>({});
  const [urlErrors, setUrlErrors] = useState<Record<number, string>>({});

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
      const rows = body.submissions ?? [];
      setSubmissions(rows);
      setUrlDrafts(
        Object.fromEntries(rows.map((row) => [row.id, row.sourceUrl ?? ""])),
      );
      setUrlErrors({});
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

  function selectStatus(next: FilterStatus) {
    setEditingId(null);
    setStatus(next);
  }

  async function handleApprove(id: number) {
    const draft = (urlDrafts[id] ?? "").trim();
    const url = draft ? normalizeExternalUrl(draft) : null;
    if (draft && !url) {
      setUrlErrors((prev) => ({
        ...prev,
        [id]: "Enter a full web address, like https://www.fragrantica.com/perfume/…",
      }));
      return;
    }
    setUrlErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setBusyId(id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(body.message ?? `Approve failed (${res.status})`);
      }
      setMessage(
        url
          ? "Published to catalog with the reference link attached."
          : "Published to catalog — Custom badge cleared for that scent.",
      );
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
            onClick={() => selectStatus(value)}
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
                  {s.sourceUrl && (
                    <div>
                      <dt className="inline text-(--text-primary)">Link: </dt>
                      <dd className="inline">
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--accent-gold) underline underline-offset-2 hover:text-(--accent-gold-hover)"
                        >
                          Submitted reference
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </dd>
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
                  <>
                    <div className="mt-4">
                      <label
                        htmlFor={`admin-url-${s.id}`}
                        className="block text-xs text-(--text-primary)"
                      >
                        Fragrantica link{" "}
                        <span className="text-(--text-secondary)">
                          (optional)
                        </span>
                      </label>
                      <p
                        id={`admin-url-hint-${s.id}`}
                        className="mt-1 text-xs text-(--text-secondary)"
                      >
                        Saved to the published scent on approve. Leave as-is to
                        keep the submitter&apos;s link.
                      </p>
                      <input
                        id={`admin-url-${s.id}`}
                        type="text"
                        inputMode="url"
                        autoComplete="url"
                        spellCheck={false}
                        value={urlDrafts[s.id] ?? ""}
                        disabled={busyId === s.id}
                        onChange={(e) => {
                          setUrlDrafts((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }));
                          if (urlErrors[s.id]) {
                            setUrlErrors((prev) => {
                              const next = { ...prev };
                              delete next[s.id];
                              return next;
                            });
                          }
                        }}
                        aria-invalid={urlErrors[s.id] ? true : undefined}
                        aria-describedby={
                          urlErrors[s.id]
                            ? `admin-url-hint-${s.id} admin-url-error-${s.id}`
                            : `admin-url-hint-${s.id}`
                        }
                        placeholder="https://www.fragrantica.com/perfume/…"
                        className={`mt-2 h-11 w-full rounded-md border bg-(--glass-bg) px-3 text-sm text-(--text-primary) placeholder:text-(--text-secondary) disabled:opacity-50 ${
                          urlErrors[s.id]
                            ? "border-(--danger)"
                            : "border-(--glass-border)"
                        }`}
                      />
                      {urlErrors[s.id] && (
                        <p
                          id={`admin-url-error-${s.id}`}
                          role="alert"
                          className="mt-1 text-xs text-(--danger)"
                        >
                          {urlErrors[s.id]}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => void handleApprove(s.id)}
                        className="min-h-(--space-touch) flex-1 rounded-md border border-(--accent-gold)/60 bg-(--accent-gold)/10 text-sm text-(--accent-gold) hover:border-(--accent-gold) hover:bg-(--accent-gold)/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
                      >
                        {busyId === s.id ? "Working…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => void handleReject(s.id)}
                        className="min-h-(--space-touch) flex-1 rounded-md border border-(--glass-border) text-sm text-(--text-secondary) hover:border-(--danger)/60 hover:text-(--danger) disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}

                {s.status === "approved" && (
                  <>
                    {editingId === s.id ? (
                      <AdminApprovedEditForm
                        submission={s}
                        busy={busyId === s.id}
                        onCancel={() => setEditingId(null)}
                        onSaved={async () => {
                          setEditingId(null);
                          await load();
                        }}
                        onError={(msg) => {
                          setMessage(null);
                          setError(msg);
                        }}
                        onSuccess={(msg) => {
                          setError(null);
                          setMessage(msg);
                        }}
                      />
                    ) : (
                      <div className="mt-4">
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => {
                            setEditingId(s.id);
                            setError(null);
                            setMessage(null);
                          }}
                          className="min-h-(--space-touch) w-full rounded-md border border-(--accent-gold)/60 bg-(--accent-gold)/10 text-sm text-(--accent-gold) hover:border-(--accent-gold) hover:bg-(--accent-gold)/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
                        >
                          Edit published scent
                        </button>
                      </div>
                    )}
                  </>
                )}
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
