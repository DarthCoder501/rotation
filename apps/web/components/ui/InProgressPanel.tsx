import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";

interface InProgressPanelProps {
  title: string;
  description: string;
  /** Optional back/secondary link */
  href?: string;
  linkLabel?: string;
  className?: string;
}

/**
 * Soft placeholder for unfinished surfaces — matches Liquid Obsidian glass UI.
 */
export function InProgressPanel({
  title,
  description,
  href,
  linkLabel,
  className = "",
}: InProgressPanelProps) {
  return (
    <GlassCard
      className={`mx-auto max-w-md px-6 py-10 text-center ${className}`}
      as="article"
    >
      <p className="text-xs font-medium tracking-[0.18em] uppercase text-(--accent-gold)">
        In progress
      </p>
      <h2 className="mt-3 font-(family-name:--font-display) text-2xl text-(--text-primary)">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-(--text-secondary)">
        {description}
      </p>
      {href && linkLabel && (
        <Link
          href={href}
          className="mt-8 inline-flex min-h-(--space-touch) items-center justify-center rounded-full border border-(--glass-border) px-6 text-sm text-(--text-primary) hover:border-(--accent-gold) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          {linkLabel}
        </Link>
      )}
    </GlassCard>
  );
}
