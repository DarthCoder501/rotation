"use client";
import { AppNav } from "./AppNav";
import { LiquidCanvas } from "../LiquidCanvas";

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
      {showNav && <AppNav />}
      <div
        className={`relative z-10 min-h-dvh ${
          showNav
            ? "pt-[calc(56px+env(safe-area-inset-top))] sm:pt-[calc(64px+env(safe-area-inset-top))]"
            : ""
        }`}
      >
        {children}
      </div>
    </>
  );
}
