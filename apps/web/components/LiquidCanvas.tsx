"use client";
import { useEffect, useRef } from "react";

export function LiquidCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      canvas.style.background = "linear-gradient(135deg, #1a1028, #2d1f3d)";
      return;
    }

    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = "#1a1028";
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
