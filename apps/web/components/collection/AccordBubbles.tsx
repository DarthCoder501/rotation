import { accordColor, accordTextColor } from "@/lib/accord-colors";

interface AccordBubblesProps {
  accords: string[];
  maxVisible?: number;
  size?: "sm" | "md";
  /** Index 0 gets a subtle ring to mark primary accord */
  highlightPrimary?: boolean;
}

export function AccordBubbles({
  accords,
  maxVisible = 5,
  size = "md",
  highlightPrimary = true,
}: AccordBubblesProps) {
  const visible = accords.filter(Boolean).slice(0, maxVisible);
  const overflow = accords.length - visible.length;
  const px = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  if (visible.length === 0) return null;

  return (
    <ul role="list" aria-label="Scent accords" className="flex flex-wrap gap-1.5">
      {visible.map((accord, i) => (
        <li key={`${accord}-${i}`} role="listitem">
          <span
            className={`inline-block rounded-full font-medium leading-tight ${px} ${
              highlightPrimary && i === 0
                ? "ring-1 ring-(--accent-gold)/60 ring-offset-1 ring-offset-transparent"
                : ""
            }`}
            style={{
              backgroundColor: accordColor(accord),
              color: accordTextColor(accord),
            }}
            aria-label={i === 0 ? `Primary accord: ${accord}` : accord}
          >
            {accord}
          </span>
        </li>
      ))}
      {overflow > 0 && (
        <li role="listitem">
          <span
            className={`inline-block rounded-full bg-white/10 text-(--text-secondary) ${px}`}
            aria-label={`${overflow} more accords`}
          >
            +{overflow}
          </span>
        </li>
      )}
    </ul>
  );
}
