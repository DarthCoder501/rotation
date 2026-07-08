const ACCORD_COLORS: Record<string, string> = {
  vanilla: "#F5E6C8",
  sweet: "#E8B4BC",
  amber: "#D4A056",
  oud: "#5C4033",
  "warm spicy": "#C4622D",
  spicy: "#B85C38",
  woody: "#8B6914",
  floral: "#E8C4D4",
  citrus: "#F0E68C",
  fresh: "#A8D8EA",
  "fresh spicy": "#7CB083",
  musky: "#C4B8A8",
  aromatic: "#9AB89A",
  fruity: "#F4A896",
  powdery: "#E8DDD4",
  leather: "#6B4423",
  smoky: "#5C5C5C",
  cinnamon: "#A0522D",
  rose: "#D4869C",
  "white floral": "#F5F0E8",
};

const FALLBACK = "#8B7E74";

/** Theme-aligned text candidates for accord pill labels. */
const TEXT_CANDIDATES = ["#050505", "#f5ede0", "#ffffff"] as const;

function relativeLuminance(hex: string): number {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const channel = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  );
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function accordColor(accord: string): string {
  return ACCORD_COLORS[accord.trim().toLowerCase()] ?? FALLBACK;
}

/** Picks the highest-contrast theme text color for each accord pill (WCAG AA 4.5:1). */
export function accordTextColor(accord: string): string {
  const background = accordColor(accord);

  return TEXT_CANDIDATES.reduce((best, candidate) =>
    contrastRatio(candidate, background) > contrastRatio(best, background)
      ? candidate
      : best,
  );
}
