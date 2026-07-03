import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}

export function GlassCard({
  children,
  className = "",
  as: Tag = "div",
}: GlassCardProps) {
  return (
    <Tag
      className={`rounded-(--radius-md) border border-(--glass-border) bg-(--glass-bg) backdrop-blur-[var(--glass-blur)] ${className}`}
    >
      {children}
    </Tag>
  );
}
