"use client";
import { AppNav } from "./AppNav";
import { LiquidCanvas } from "../LiquidCanvas";
import { TodayStrip } from "@/components/wear/TodayStrip";

export function AppShell({
  children,
  showNav = true,
}: {
  children: React.ReactNode;
  showNav?: boolean;
}) {
  return (
    <>
      <LiquidCanvas />
      {showNav && (
        <>
          <AppNav />
          <TodayStrip />
        </>
      )}
      <div
        className={`relative z-10 min-h-dvh ${
          showNav
            ? // Nav (56/64) + today strip (36) + safe area
              "pt-[calc(92px+env(safe-area-inset-top))] sm:pt-[calc(100px+env(safe-area-inset-top))]"
            : ""
        }`}
      >
        {children}
      </div>
    </>
  );
}
