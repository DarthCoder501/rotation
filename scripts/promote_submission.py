#!/usr/bin/env python3
"""
Promote an approved fragrance submission into the source catalog.

Usage:
  python scripts/promote_submission.py --id 123 --rating 4.0

This script is the admin gate: user submissions never write directly to `fragrances`.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).resolve().parent / ".env")


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote a submission to fragrances")
    parser.add_argument("--id", type=int, required=True, help="fragrance_submissions.id")
    parser.add_argument(
        "--rating",
        type=float,
        default=4.0,
        help="Initial rating_value for the new catalog row",
    )
    parser.add_argument("--reviewed-by", default="admin", help="Reviewer label")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in scripts/.env")

    sb = create_client(url, key)

    submission = (
        sb.table("fragrance_submissions")
        .select("*")
        .eq("id", args.id)
        .single()
        .execute()
        .data
    )
    if not submission:
        raise SystemExit(f"Submission {args.id} not found")

    if submission["status"] == "approved":
        raise SystemExit(f"Submission {args.id} is already approved")

    row = {
        "perfume": submission["perfume"],
        "brand": submission["brand"],
        "country": submission.get("country"),
        "gender": submission.get("gender"),
        "rating_value": args.rating,
        "rating_count": 0,
        "top_notes": submission.get("top_notes"),
        "middle_notes": submission.get("middle_notes"),
        "base_notes": submission.get("base_notes"),
        "main_accord_1": submission.get("main_accord_1"),
        "main_accord_2": submission.get("main_accord_2"),
        "main_accord_3": submission.get("main_accord_3"),
        "main_accord_4": submission.get("main_accord_4"),
        "main_accord_5": submission.get("main_accord_5"),
    }

    inserted = sb.table("fragrances").insert(row).execute().data
    if not inserted:
        raise SystemExit("Failed to insert into fragrances")

    fragrance_id = inserted[0]["id"]
    print(f"Inserted fragrance id={fragrance_id}")

    # TODO: generate embedding with SentenceTransformer and update fragrances.embedding
    # Reuse build_embedding_text logic from scripts/seed.py

    sb.table("fragrance_submissions").update(
        {
            "status": "approved",
            "reviewed_at": "now()",
            "reviewed_by": args.reviewed_by,
        }
    ).eq("id", args.id).execute()

    print(f"Submission {args.id} marked approved")


if __name__ == "__main__":
    main()
