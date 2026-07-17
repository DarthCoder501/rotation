import { describe, expect, it } from "vitest";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatTemperature,
} from "./temperature";

describe("temperature helpers", () => {
  it("converts C ↔ F", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(20)).toBe(68);
    expect(celsiusToFahrenheit(30)).toBe(86);
    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(86)).toBe(30);
  });

  it("formats display strings", () => {
    expect(formatTemperature(22, "C")).toBe("22°C");
    expect(formatTemperature(22, "F")).toBe("72°F");
  });
});
