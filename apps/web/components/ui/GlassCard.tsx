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
      className={`rounded-md border border-(--glass-border) bg-(--glass-bg) backdrop-blur-(--glass-blur) ${className}`}
    >
      {children}
    </Tag>
  );
}
