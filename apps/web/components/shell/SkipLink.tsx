export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-(--accent-gold) focus:text-(--text-on-accent) focus:rounded-md focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      Skip to main content
    </a>
  );
}
