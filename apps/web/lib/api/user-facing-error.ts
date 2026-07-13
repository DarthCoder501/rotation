/**
 * Maps thrown/API errors into short copy safe for the UI.
 * Hides Postgres/schema internals (e.g. "column … does not exist").
 */
export function toUserFacingMessage(
  error: unknown,
  fallback: string,
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;

  if (isInternalErrorMessage(raw)) {
    return fallback;
  }

  return raw || fallback;
}

/** True for DB/schema messages that should never be shown to users. */
export function isInternalErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("failed to load user profile") ||
    lower.includes("failed to load device profile") ||
    lower.includes("failed to load auth profile") ||
    lower.includes("failed to link auth") ||
    lower.includes("failed to create auth profile") ||
    lower.includes("permission denied for") ||
    lower.includes("pgrst") ||
    /\b42\d{3}\b/.test(lower)
  );
}
