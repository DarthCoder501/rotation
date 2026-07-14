"use client";
import { BottomNav } from "./BottomNav";
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
      <div className="relative z-10 min-h-dvh pb-[calc(64px+env(safe-area-inset-bottom))]">
        {children}
      </div>
      {showNav && <BottomNav />}
    </>
  );
}
