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
}
