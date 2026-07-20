#!/usr/bin/env python3
"""
Publish a fragrance submission into the shared catalog (in place).

Usage:
  python scripts/promote_submission.py --id 123

Prefers the provisional fragrance linked via promoted_fragrance_id (migration 005).
Publishes that same row with a MiniLM embedding — collection FKs stay unchanged.
Falls back to insert if no linked provisional exists (legacy submissions).
"""
from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import login
from sentence_transformers import SentenceTransformer
from supabase import create_client

load_dotenv(Path(__file__).resolve().parent / ".env")
if token := os.environ.get("HF_TOKEN"):
    login(token)

MODEL = SentenceTransformer("all-MiniLM-L6-v2")


def build_embedding_text(row: dict) -> str:
    parts = [
        row.get("main_accord_1"),
        row.get("main_accord_2"),
        row.get("main_accord_3"),
        row.get("main_accord_4"),
        row.get("main_accord_5"),
        row.get("top_notes"),
        row.get("middle_notes"),
        row.get("base_notes"),
    ]
    joined = " ".join(str(p).strip() for p in parts if p and str(p).strip())
    if joined:
        return joined
    return f"{row.get('perfume', '')} {row.get('brand', '')}".strip()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Publish a submission to the shared catalog (in place)"
    )
    parser.add_argument("--id", type=int, required=True, help="fragrance_submissions.id")
    parser.add_argument(
        "--rating",
        type=float,
        default=4.0,
        help="rating_value when inserting a legacy row (ignored if publishing provisional)",
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

    fragrance = None
    promoted_id = submission.get("promoted_fragrance_id")
    if promoted_id:
        fragrance = (
            sb.table("fragrances")
            .select("*")
            .eq("id", promoted_id)
            .single()
            .execute()
            .data
        )

    if not fragrance:
        existing = (
            sb.table("fragrances")
            .select("*")
            .eq("perfume", submission["perfume"])
            .eq("brand", submission["brand"])
            .execute()
            .data
        )
        fragrance = existing[0] if existing else None

    embed_src = fragrance or submission
    embed_text = build_embedding_text(embed_src)
    print(f"Embedding: {embed_text[:120]}…")
    embedding = MODEL.encode([embed_text])[0].tolist()
    reviewed_at = datetime.now(timezone.utc).isoformat()

    if fragrance:
        fragrance_id = fragrance["id"]
        sb.table("fragrances").update(
            {
                "visibility": "published",
                "embedding": embedding,
                "country": fragrance.get("country") or submission.get("country"),
                "gender": fragrance.get("gender") or submission.get("gender"),
                "top_notes": fragrance.get("top_notes") or submission.get("top_notes"),
                "middle_notes": fragrance.get("middle_notes")
                or submission.get("middle_notes"),
                "base_notes": fragrance.get("base_notes") or submission.get("base_notes"),
                "main_accord_1": fragrance.get("main_accord_1")
                or submission.get("main_accord_1"),
                "main_accord_2": fragrance.get("main_accord_2")
                or submission.get("main_accord_2"),
                "main_accord_3": fragrance.get("main_accord_3")
                or submission.get("main_accord_3"),
                "main_accord_4": fragrance.get("main_accord_4")
                or submission.get("main_accord_4"),
                "main_accord_5": fragrance.get("main_accord_5")
                or submission.get("main_accord_5"),
            }
        ).eq("id", fragrance_id).execute()
        print(f"Published fragrance id={fragrance_id} (in place)")
    else:
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
            "embedding": embedding,
            "visibility": "published",
        }
        inserted = sb.table("fragrances").insert(row).execute().data
        if not inserted:
            raise SystemExit("Failed to insert into fragrances")
        fragrance_id = inserted[0]["id"]
        print(f"Inserted fragrance id={fragrance_id} with embedding")

    sb.table("fragrance_submissions").update(
        {
            "status": "approved",
            "reviewed_at": reviewed_at,
            "reviewed_by": args.reviewed_by,
            "promoted_fragrance_id": fragrance_id,
        }
    ).eq("id", args.id).execute()

    print(f"Submission {args.id} marked approved")


if __name__ == "__main__":
    main()
