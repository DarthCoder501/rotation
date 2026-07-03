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

export function accordColor(accord: string): string {
  return ACCORD_COLORS[accord.trim().toLowerCase()] ?? FALLBACK;
}

/** Dark text on light accord pills — passes contrast on most mapped colors. */
export function accordTextColor(accord: string): string {
  const color = accordColor(accord);
  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.55 ? "#1a1028" : "#fff8ec";
}
