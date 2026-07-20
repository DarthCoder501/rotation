/**
 * Publish a provisional submission in place (same fragrance_id).
 * Reject leaves the Custom provisional row in the user's collection.
 */

import { embedSearchQuery } from "@/lib/server/embed-query";
import {
  fragranceSelect,
  mapFragrance,
  type FragranceRow,
} from "@/lib/server/fragrance-mapper";
import {
  mapSubmission,
  submissionSelect,
  type SubmissionRow,
} from "@/lib/server/submission-mapper";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import type { Fragrance } from "@/lib/types/fragrance";
import type { FragranceSubmission } from "@/lib/types/submission";

export type PromoteResult =
  | {
      ok: true;
      submission: FragranceSubmission;
      fragrance: Fragrance;
    }
  | { ok: false; status: number; message: string };

function buildEmbeddingText(row: {
  perfume: string;
  brand: string;
  main_accord_1?: string | null;
  main_accord_2?: string | null;
  main_accord_3?: string | null;
  main_accord_4?: string | null;
  main_accord_5?: string | null;
  top_notes?: string | null;
  middle_notes?: string | null;
  base_notes?: string | null;
}): string {
  const parts = [
    row.main_accord_1,
    row.main_accord_2,
    row.main_accord_3,
    row.main_accord_4,
    row.main_accord_5,
    row.top_notes,
    row.middle_notes,
    row.base_notes,
  ];
  const joined = parts
    .map((p) => (p ? String(p).trim() : ""))
    .filter(Boolean)
    .join(" ");
  return joined || `${row.perfume} ${row.brand}`;
}

async function loadSubmission(id: number): Promise<SubmissionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("fragrance_submissions")
    .select(submissionSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as SubmissionRow | null) ?? null;
}

async function resolveFragranceForSubmission(
  submission: SubmissionRow,
): Promise<FragranceRow | null> {
  if (submission.promoted_fragrance_id != null) {
    const { data, error } = await supabaseAdmin
      .from("fragrances")
      .select(fragranceSelect)
      .eq("id", submission.promoted_fragrance_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as FragranceRow;
  }

  // Legacy submissions (pre-005): find/create provisional by perfume+brand.
  const { data: existing, error: findError } = await supabaseAdmin
    .from("fragrances")
    .select(fragranceSelect)
    .eq("perfume", submission.perfume)
    .eq("brand", submission.brand)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing) return existing as FragranceRow;

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("fragrances")
    .insert({
      perfume: submission.perfume,
      brand: submission.brand,
      country: submission.country,
      gender: submission.gender,
      rating_value: 4.0,
      rating_count: 0,
      top_notes: submission.top_notes,
      middle_notes: submission.middle_notes,
      base_notes: submission.base_notes,
      main_accord_1: submission.main_accord_1,
      main_accord_2: submission.main_accord_2,
      main_accord_3: submission.main_accord_3,
      main_accord_4: submission.main_accord_4,
      main_accord_5: submission.main_accord_5,
      visibility: "provisional",
    })
    .select(fragranceSelect)
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Failed to create fragrance row");
  }
  return inserted as FragranceRow;
}

export async function approveSubmission(
  submissionId: number,
  reviewedBy: string,
): Promise<PromoteResult> {
  const submission = await loadSubmission(submissionId);
  if (!submission) {
    return { ok: false, status: 404, message: "Submission not found." };
  }
  if (submission.status === "approved") {
    return { ok: false, status: 409, message: "Submission already approved." };
  }

  const fragrance = await resolveFragranceForSubmission(submission);
  if (!fragrance) {
    return {
      ok: false,
      status: 500,
      message: "Could not resolve linked fragrance.",
    };
  }

  const embedText = buildEmbeddingText({
    perfume: fragrance.perfume,
    brand: fragrance.brand,
    main_accord_1: fragrance.main_accord_1,
    main_accord_2: fragrance.main_accord_2,
    main_accord_3: fragrance.main_accord_3,
    main_accord_4: fragrance.main_accord_4,
    main_accord_5: fragrance.main_accord_5,
    top_notes: fragrance.top_notes,
    middle_notes: fragrance.middle_notes,
    base_notes: fragrance.base_notes,
  });

  const embedding = await embedSearchQuery(embedText);
  if (!embedding) {
    return {
      ok: false,
      status: 503,
      message:
        "Could not generate embedding (check HF_TOKEN). Approval aborted.",
    };
  }

  const { data: published, error: publishError } = await supabaseAdmin
    .from("fragrances")
    .update({
      visibility: "published",
      embedding,
      // Prefer submission metadata if fragrance was a thin provisional.
      country: fragrance.country ?? submission.country,
      gender: fragrance.gender ?? submission.gender,
      top_notes: fragrance.top_notes ?? submission.top_notes,
      middle_notes: fragrance.middle_notes ?? submission.middle_notes,
      base_notes: fragrance.base_notes ?? submission.base_notes,
      main_accord_1: fragrance.main_accord_1 ?? submission.main_accord_1,
      main_accord_2: fragrance.main_accord_2 ?? submission.main_accord_2,
      main_accord_3: fragrance.main_accord_3 ?? submission.main_accord_3,
      main_accord_4: fragrance.main_accord_4 ?? submission.main_accord_4,
      main_accord_5: fragrance.main_accord_5 ?? submission.main_accord_5,
    })
    .eq("id", fragrance.id)
    .select(fragranceSelect)
    .single();

  if (publishError || !published) {
    return {
      ok: false,
      status: 500,
      message: publishError?.message ?? "Failed to publish fragrance.",
    };
  }

  const { data: updatedSubmission, error: updateError } = await supabaseAdmin
    .from("fragrance_submissions")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      promoted_fragrance_id: Number(fragrance.id),
    })
    .eq("id", submissionId)
    .select(submissionSelect)
    .single();

  if (updateError || !updatedSubmission) {
    return {
      ok: false,
      status: 500,
      message: updateError?.message ?? "Failed to mark submission approved.",
    };
  }

  return {
    ok: true,
    submission: mapSubmission(updatedSubmission as SubmissionRow),
    fragrance: mapFragrance(published as FragranceRow),
  };
}

export async function rejectSubmission(
  submissionId: number,
  reviewedBy: string,
): Promise<PromoteResult> {
  const submission = await loadSubmission(submissionId);
  if (!submission) {
    return { ok: false, status: 404, message: "Submission not found." };
  }
  if (submission.status === "approved") {
    return {
      ok: false,
      status: 409,
      message: "Approved submissions cannot be rejected.",
    };
  }
  if (submission.status === "rejected") {
    return { ok: false, status: 409, message: "Submission already rejected." };
  }

  // Ensure a provisional fragrance exists for the submitter's collection link.
  const fragrance = await resolveFragranceForSubmission(submission);
  if (!fragrance) {
    return {
      ok: false,
      status: 500,
      message: "Could not resolve linked fragrance.",
    };
  }

  if ((fragrance.visibility ?? "published") !== "provisional") {
    // Keep published rows published; still mark rejected for the queue.
  } else {
    // Leave provisional as-is (still Custom for the user).
  }

  const { data: updatedSubmission, error: updateError } = await supabaseAdmin
    .from("fragrance_submissions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      promoted_fragrance_id: Number(fragrance.id),
    })
    .eq("id", submissionId)
    .select(submissionSelect)
    .single();

  if (updateError || !updatedSubmission) {
    return {
      ok: false,
      status: 500,
      message: updateError?.message ?? "Failed to reject submission.",
    };
  }

  return {
    ok: true,
    submission: mapSubmission(updatedSubmission as SubmissionRow),
    fragrance: mapFragrance(fragrance),
  };
}

export async function listSubmissionsForAdmin(
  status: "pending" | "approved" | "rejected" | "all" = "pending",
): Promise<FragranceSubmission[]> {
  let query = supabaseAdmin
    .from("fragrance_submissions")
    .select(submissionSelect)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as SubmissionRow[]).map(mapSubmission);
}
