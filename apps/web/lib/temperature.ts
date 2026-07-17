"use client";

import { useCallback, useSyncExternalStore } from "react";

export type TempUnit = "C" | "F";

const STORAGE_KEY = "scent_temp_unit";
const CHANGE_EVENT = "scent-temp-unit";

function readUnit(): TempUnit {
  if (typeof window === "undefined") return "C";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "F" ? "F" : "C";
  } catch {
    return "C";
  }
}

function writeUnit(unit: TempUnit): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, unit);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** Celsius → Fahrenheit (rounded for display). */
export function celsiusToFahrenheit(tempC: number): number {
  return Math.round((tempC * 9) / 5 + 32);
}

/** Fahrenheit → Celsius (for any future user input). */
export function fahrenheitToCelsius(tempF: number): number {
  return Math.round(((tempF - 32) * 5) / 9);
}

/** Format a Celsius value in the user's preferred unit. */
export function formatTemperature(tempC: number, unit: TempUnit): string {
  if (unit === "F") return `${celsiusToFahrenheit(tempC)}°F`;
  return `${Math.round(tempC)}°C`;
}

/**
 * Ranker / weather APIs always store Celsius.
 * This only affects display + Gemini narrative wording.
 */
export function useTempUnit(): {
  unit: TempUnit;
  setUnit: (unit: TempUnit) => void;
  toggleUnit: () => void;
  formatTemp: (tempC: number) => string;
} {
  const unit = useSyncExternalStore(subscribe, readUnit, () => "C" as TempUnit);

  const setUnit = useCallback((next: TempUnit) => {
    writeUnit(next);
  }, []);

  const toggleUnit = useCallback(() => {
    writeUnit(readUnit() === "F" ? "C" : "F");
  }, []);

  const formatTemp = useCallback(
    (tempC: number) => formatTemperature(tempC, unit),
    [unit],
  );

  return { unit, setUnit, toggleUnit, formatTemp };
}
