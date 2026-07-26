import { describe, expect, it } from "vitest";
import { normalizeExternalUrl } from "./url";

describe("normalizeExternalUrl", () => {
  it("keeps valid http(s) links", () => {
    expect(
      normalizeExternalUrl("https://www.fragrantica.com/perfume/Dior/Sauvage-31861.html"),
    ).toBe("https://www.fragrantica.com/perfume/Dior/Sauvage-31861.html");
    expect(normalizeExternalUrl("http://example.com/a")).toBe(
      "http://example.com/a",
    );
  });

  it("adds https to scheme-less input", () => {
    expect(normalizeExternalUrl("www.fragrantica.com/perfume/x")).toBe(
      "https://www.fragrantica.com/perfume/x",
    );
    expect(normalizeExternalUrl("  fragrantica.com  ")).toBe(
      "https://fragrantica.com/",
    );
  });

  it("rejects empty and non-string values", () => {
    expect(normalizeExternalUrl("")).toBeNull();
    expect(normalizeExternalUrl("   ")).toBeNull();
    expect(normalizeExternalUrl(null)).toBeNull();
    expect(normalizeExternalUrl(undefined)).toBeNull();
  });

  it("rejects non-http schemes", () => {
    expect(normalizeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeExternalUrl("data:text/html,<script>")).toBeNull();
    expect(normalizeExternalUrl("ftp://example.com/file")).toBeNull();
  });

  it("rejects values that aren't hostnames", () => {
    expect(normalizeExternalUrl("not a url")).toBeNull();
    expect(normalizeExternalUrl("localhost")).toBeNull();
    expect(normalizeExternalUrl("fragrantica")).toBeNull();
  });

  it("rejects overly long links", () => {
    expect(
      normalizeExternalUrl(`https://example.com/${"a".repeat(600)}`),
    ).toBeNull();
  });
});
