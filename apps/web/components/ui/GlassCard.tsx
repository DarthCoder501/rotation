import type { HTMLAttributes, ReactNode } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}

export function GlassCard({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: GlassCardProps) {
  return (
    <Tag
      className={`rounded-md border border-(--glass-border) bg-(--glass-bg) backdrop-blur-(--glass-blur) ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
