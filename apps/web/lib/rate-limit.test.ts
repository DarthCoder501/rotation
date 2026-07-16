import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit and blocks after", () => {
    const key = `test-${Math.random()}`;
    const windowMs = 60_000;

    for (let i = 0; i < 3; i++) {
      const result = rateLimit(key, 3, windowMs);
      expect(result.ok).toBe(true);
    }

    const blocked = rateLimit(key, 3, windowMs);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
