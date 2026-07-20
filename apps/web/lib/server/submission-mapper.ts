import type {
  FragranceSubmission,
  SubmissionStatus,
} from "@/lib/types/submission";

export type SubmissionRow = {
  id: number;
  perfume: string;
  brand: string;
  country: string | null;
  gender: string | null;
  top_notes: string | null;
  middle_notes: string | null;
  base_notes: string | null;
  main_accord_1: string | null;
  main_accord_2: string | null;
  main_accord_3: string | null;
  main_accord_4: string | null;
  main_accord_5: string | null;
  user_notes: string | null;
  status: SubmissionStatus;
  created_at: string;
  reviewed_at: string | null;
  promoted_fragrance_id?: number | null;
};

export const submissionSelect = `
  id,
  perfume,
  brand,
  country,
  gender,
  top_notes,
  middle_notes,
  base_notes,
  main_accord_1,
  main_accord_2,
  main_accord_3,
  main_accord_4,
  main_accord_5,
  user_notes,
  status,
  created_at,
  reviewed_at,
  promoted_fragrance_id
`;

export function mapSubmission(row: SubmissionRow): FragranceSubmission {
  return {
    id: Number(row.id),
    perfume: row.perfume,
    brand: row.brand,
    country: row.country,
    gender: row.gender,
    topNotes: row.top_notes,
    middleNotes: row.middle_notes,
    baseNotes: row.base_notes,
    mainAccord1: row.main_accord_1,
    mainAccord2: row.main_accord_2,
    mainAccord3: row.main_accord_3,
    mainAccord4: row.main_accord_4,
    mainAccord5: row.main_accord_5,
    userNotes: row.user_notes,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    promotedFragranceId:
      row.promoted_fragrance_id != null
        ? Number(row.promoted_fragrance_id)
        : null,
  };
}
