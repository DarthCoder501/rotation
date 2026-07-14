import { describe, expect, it } from "vitest";
import {
  clampPreference,
  preferenceLabel,
  preferenceToSignal,
} from "./preference";

describe("preference helpers", () => {
  it("maps 0–100 onto bipolar signals", () => {
    expect(preferenceToSignal(0)).toBe(-1);
    expect(preferenceToSignal(50)).toBe(0);
    expect(preferenceToSignal(100)).toBe(1);
    expect(preferenceToSignal(75)).toBeCloseTo(0.5);
  });

  it("clamps and labels ratings", () => {
    expect(clampPreference(140)).toBe(100);
    expect(clampPreference(-12)).toBe(0);
    expect(preferenceLabel(0)).toBe("Dislike");
    expect(preferenceLabel(75)).toBe("Like");
  });
});
