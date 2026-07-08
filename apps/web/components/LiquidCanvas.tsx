"use client";
import { useEffect, useRef } from "react";

function readToken(name: string, fallback: string): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

export function LiquidCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const bgCanvas = readToken("--bg-canvas", "#0a0a0a");
    const bgMid = readToken("--bg-canvas-mid", "#121110");
    const bgEnd = readToken("--bg-canvas-end", "#1a1814");

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      canvas.style.background = `linear-gradient(135deg, ${bgCanvas}, ${bgMid}, ${bgEnd})`;
      return;
    }

    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, bgCanvas);
    gradient.addColorStop(0.55, bgMid);
    gradient.addColorStop(1, bgEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
}
