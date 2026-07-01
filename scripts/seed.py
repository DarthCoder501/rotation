#!/usr/bin/env python3
"""Ingest fragrances.csv → Supabase with vector embeddings."""
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from huggingface_hub import login
from sentence_transformers import SentenceTransformer
from supabase import create_client

load_dotenv(Path(__file__).resolve().parent / ".env")
if token := os.environ.get("HF_TOKEN"):
    login(token)

BATCH = 100
MODEL = SentenceTransformer("all-MiniLM-L6-v2")


def clean_str(val) -> str | None:
    """Convert cell to string; treat NaN/empty as None."""
    if pd.isna(val):
        return None
    s = str(val).strip()
    return s if s else None


def build_embedding_text(row: pd.Series) -> str:
    accord_keys = [f"Main Accord {i}" for i in range(1, 6)]
    note_keys = ["Top Notes", "Middle Notes", "Base Notes"]
    parts = [clean_str(row.get(k)) for k in accord_keys + note_keys]
    return " ".join(p for p in parts if p)

def normalize_gender(val) -> str | None:
    if pd.isna(val): return None
    v = str(val).lower().strip()
    return v if v in ("men", "women", "unisex") else "unisex"

def parse_rating(val):
    if pd.isna(val):
        return 0.0
    s = str(val).strip().replace(",", ".")
    return float(s)

def row_to_record(row: pd.Series, embedding: list[float]) -> dict:
    return {
        "url": clean_str(row.get("URL")),
        "perfume": clean_str(row["Perfume"]),
        "brand": clean_str(row["Brand"]),
        "country": clean_str(row.get("Country")),
        "gender": normalize_gender(row.get("Gender")),
        "rating_value": parse_rating(row.get("Rating Value")),
        "rating_count": int(row["Rating Count"]) if pd.notna(row.get("Rating Count")) else 0,
        "year": int(row["Year"]) if pd.notna(row.get("Year")) else None,
        "top_notes": clean_str(row.get("Top Notes")),
        "middle_notes": clean_str(row.get("Middle Notes")),
        "base_notes": clean_str(row.get("Base Notes")),
        "perfumer1": clean_str(row.get("Perfumer1")),
        "perfumer2": clean_str(row.get("Perfumer2")),
        "main_accord_1": clean_str(row.get("Main Accord 1")),
        "main_accord_2": clean_str(row.get("Main Accord 2")),
        "main_accord_3": clean_str(row.get("Main Accord 3")),
        "main_accord_4": clean_str(row.get("Main Accord 4")),
        "main_accord_5": clean_str(row.get("Main Accord 5")),
        "embedding": embedding,
    }

def get_supabase_client():
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in scripts/.env")
    if "your-project" in url or url.endswith("rotation.supabase.co"):
        raise SystemExit(
            "SUPABASE_URL looks wrong. Use Project Settings → API → Project URL, "
            "e.g. https://<project-ref>.supabase.co (not the display name)."
        )
    return create_client(url, key)


def main(csv_path: str = "/Users/peguero/rotation/data/fragrances.csv"):
    sb = get_supabase_client()
    df = pd.read_csv(csv_path, sep=";", encoding="latin-1")
    df.columns = df.columns.str.strip().str.lower()
    RENAME = {
        "url": "URL",
        "perfume": "Perfume",
        "brand": "Brand",
        "country": "Country",
        "gender": "Gender",
        "rating value": "Rating Value",
        "rating count": "Rating Count",
        "year": "Year",
        "top": "Top Notes",
        "middle": "Middle Notes",
        "base": "Base Notes",
        "perfumer1": "Perfumer1",
        "perfumer2": "Perfumer2",
        "mainaccord1": "Main Accord 1",
        "mainaccord2": "Main Accord 2",
        "mainaccord3": "Main Accord 3",
        "mainaccord4": "Main Accord 4",
        "mainaccord5": "Main Accord 5",
    }
    df = df.rename(columns=RENAME)
    df = df.dropna(subset=["Perfume", "Brand"])

    # CSV has duplicate perfume+brand pairs; upsert batches fail if duplicates share a batch
    before = len(df)
    df["_rating_value"] = df["Rating Value"].apply(parse_rating)
    df["_rating_count"] = pd.to_numeric(df["Rating Count"], errors="coerce").fillna(0)
    df = df.sort_values(["_rating_count", "_rating_value"], ascending=False)
    df = df.drop_duplicates(subset=["Perfume", "Brand"], keep="first")
    df = df.drop(columns=["_rating_value", "_rating_count"])
    removed = before - len(df)
    if removed:
        print(f"Deduped {removed} duplicate Perfume+Brand rows ({len(df)} unique remaining)")

    texts = [build_embedding_text(row) for _, row in df.iterrows()]
    embeddings = MODEL.encode(texts, show_progress_bar=True, batch_size=BATCH)

    records = [row_to_record(row, emb.tolist()) for (_, row), emb in zip(df.iterrows(), embeddings)]
    for i in range(0, len(records), BATCH):
        batch = records[i : i + BATCH]
        sb.table("fragrances").upsert(batch, on_conflict="perfume,brand").execute()
        print(f"Inserted {min(i + BATCH, len(records))}/{len(records)}")

if __name__ == "__main__":
    main()