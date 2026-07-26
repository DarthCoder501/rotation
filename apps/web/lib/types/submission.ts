export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface FragranceSubmission {
  id: number;
  perfume: string;
  brand: string;
  country: string | null;
  gender: string | null;
  topNotes: string | null;
  middleNotes: string | null;
  baseNotes: string | null;
  mainAccord1: string | null;
  mainAccord2: string | null;
  mainAccord3: string | null;
  mainAccord4: string | null;
  mainAccord5: string | null;
  userNotes: string | null;
  /** Optional reference link supplied by the submitter (usually Fragrantica). */
  sourceUrl: string | null;
  status: SubmissionStatus;
  createdAt: string;
  reviewedAt: string | null;
  /** Linked provisional/published catalog row (same id kept across approve). */
  promotedFragranceId: number | null;
}

export interface CreateSubmissionBody {
  perfume: string;
  brand: string;
  country?: string;
  gender?: "men" | "women" | "unisex";
  topNotes?: string;
  middleNotes?: string;
  baseNotes?: string;
  mainAccords?: string[];
  userNotes?: string;
  sourceUrl?: string;
}

/** Admin patch for an already-approved submission + its catalog fragrance. */
export interface UpdateApprovedSubmissionBody {
  perfume: string;
  brand: string;
  country?: string | null;
  gender?: "men" | "women" | "unisex" | null;
  topNotes?: string | null;
  middleNotes?: string | null;
  baseNotes?: string | null;
  mainAccords?: string[];
  sourceUrl?: string | null;
}
