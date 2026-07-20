/**
 * Query → 384-d embedding in the same space as scripts/seed.py
 * (sentence-transformers / all-MiniLM-L6-v2).
 *
 * Uses Hugging Face Inference API. Set HF_TOKEN (or HUGGINGFACE_API_KEY).
 * Returns null when unset / failed so catalog search can fall back to text-only.
 */

export const EMBEDDING_DIM = 384;
export const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

function getHfToken(): string | null {
  const token =
    process.env.HF_TOKEN?.trim() ||
    process.env.HUGGINGFACE_API_KEY?.trim() ||
    null;
  return token || null;
}

export function isQueryEmbeddingConfigured(): boolean {
  return Boolean(getHfToken());
}

function flattenEmbedding(payload: unknown): number[] | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;

  // Single vector: [384]
  if (typeof payload[0] === "number") {
    return payload as number[];
  }

  // Token matrix: [[384], [384], ...] → mean pool
  if (Array.isArray(payload[0]) && typeof (payload[0] as unknown[])[0] === "number") {
    const rows = payload as number[][];
    const dim = rows[0]?.length ?? 0;
    if (dim !== EMBEDDING_DIM) return null;
    const means = new Array<number>(dim).fill(0);
    for (const row of rows) {
      for (let i = 0; i < dim; i++) means[i] += row[i] ?? 0;
    }
    for (let i = 0; i < dim; i++) means[i] /= rows.length;
    return means;
  }

  // Nested batch: [[[384]]]
  if (
    Array.isArray(payload[0]) &&
    Array.isArray((payload[0] as unknown[])[0]) &&
    typeof ((payload[0] as unknown[])[0] as unknown[])[0] === "number"
  ) {
    return flattenEmbedding(payload[0]);
  }

  return null;
}

function l2Normalize(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum);
  if (!Number.isFinite(norm) || norm === 0) return vector;
  return vector.map((value) => value / norm);
}

/**
 * Embed a search query. Returns null on missing config or API failure.
 */
export async function embedSearchQuery(
  query: string,
): Promise<number[] | null> {
  const text = query.trim();
  if (text.length < 2) return null;

  const token = getHfToken();
  if (!token) return null;

  const url = `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[embed] HF ${response.status}: ${detail.slice(0, 200)}`,
      );
      return null;
    }

    const payload = (await response.json()) as unknown;
    const vector = flattenEmbedding(payload);
    if (!vector || vector.length !== EMBEDDING_DIM) {
      console.error(
        `[embed] unexpected vector length ${vector?.length ?? 0}`,
      );
      return null;
    }

    return l2Normalize(vector);
  } catch (error) {
    console.error("[embed] query embedding failed:", error);
    return null;
  }
}
