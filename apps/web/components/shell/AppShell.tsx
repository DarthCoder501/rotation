"use client";
import dynamic from "next/dynamic";
import { BottomNav } from "./BottomNav";

const LiquidCanvas = dynamic(
  () => import("../LiquidCanvas").then((m) => m.LiquidCanvas),
  { ssr: false },
);

export function AppShell({
  children,
  showNav = true,
}: {
  children: React.ReactNode;
  showNav?: boolean;
}) {
  return (
    <>
      <LiquidCanvas /> {/* z-0 fixed inset-0 */}
      <div className="relative z-10 min-h-dvh pb-[calc(64px+env(safe-area-inset-bottom))]">
        {children}
      </div>
      {showNav && <BottomNav />}
    </>
  );
}
