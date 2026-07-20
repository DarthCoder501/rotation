import { describe, expect, it } from "vitest";

// Mirror flatten logic expectations via a tiny local helper test of merge behavior
// Embedding API itself is integration-tested against HF when HF_TOKEN is present.

describe("embed-query configuration", () => {
  it("reports missing token as unconfigured in test env", async () => {
    const prevHf = process.env.HF_TOKEN;
    const prevAlias = process.env.HUGGINGFACE_API_KEY;
    delete process.env.HF_TOKEN;
    delete process.env.HUGGINGFACE_API_KEY;

    const { isQueryEmbeddingConfigured, embedSearchQuery } = await import(
      "./server/embed-query"
    );

    expect(isQueryEmbeddingConfigured()).toBe(false);
    expect(await embedSearchQuery("vanilla gourmand")).toBeNull();

    if (prevHf !== undefined) process.env.HF_TOKEN = prevHf;
    if (prevAlias !== undefined) process.env.HUGGINGFACE_API_KEY = prevAlias;
  });
});
