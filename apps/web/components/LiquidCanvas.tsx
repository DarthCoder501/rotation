/** Atmospheric background as a fixed layer behind app content. */
export function LiquidCanvas() {
  return (
    <div
      aria-hidden="true"
      className="liquid-canvas fixed inset-0 -z-10 pointer-events-none"
    />
  );
}
