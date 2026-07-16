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
      className={`glass-surface rounded-md border border-(--glass-border) ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
