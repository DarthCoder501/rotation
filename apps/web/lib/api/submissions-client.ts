import type {
  CreateSubmissionBody,
  FragranceSubmission,
} from "@/lib/types/submission";

export interface SubmissionsResponse {
  submissions: FragranceSubmission[];
}

export type { CreateSubmissionBody };

export interface CreateSubmissionResponse {
  ok: true;
  submission: FragranceSubmission;
}

export async function fetchSubmissions(): Promise<SubmissionsResponse> {
  const res = await fetch("/api/submissions");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Fetch submissions failed (${res.status})`,
    );
  }
  return res.json() as Promise<SubmissionsResponse>;
}

export async function createSubmission(
  body: CreateSubmissionBody,
): Promise<CreateSubmissionResponse> {
  const res = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(
      (payload as { message?: string }).message ??
        `Submission failed (${res.status})`,
    );
  }
  return res.json() as Promise<CreateSubmissionResponse>;
}
