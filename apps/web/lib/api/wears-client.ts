import type {
  CreateWearBody,
  WearEvent,
  WearInsights,
} from "@/lib/types/wear";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";

export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function fetchTodayWears(
  wornOn = localDateString(),
): Promise<WearEvent[]> {
  const res = await fetch(
    `/api/wears/today?wornOn=${encodeURIComponent(wornOn)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      toUserFacingMessage(
        (body as { message?: string }).message,
        "Could not load today's wears.",
      ),
    );
  }
  const payload = (await res.json()) as { wears: WearEvent[] };
  return payload.wears ?? [];
}

export async function fetchWearHistory(options?: {
  limit?: number;
  offset?: number;
}): Promise<WearEvent[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  const qs = params.toString();
  const res = await fetch(`/api/wears${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      toUserFacingMessage(
        (body as { message?: string }).message,
        "Could not load wear history.",
      ),
    );
  }
  const payload = (await res.json()) as { wears: WearEvent[] };
  return payload.wears ?? [];
}

export async function logWear(body: CreateWearBody): Promise<WearEvent> {
  const res = await fetch("/api/wears", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      wornOn: body.wornOn ?? localDateString(),
      timezone: body.timezone ?? localTimeZone(),
    }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(
      toUserFacingMessage(
        (payload as { message?: string }).message,
        "Could not log this wear.",
      ),
    );
  }
  const data = (await res.json()) as { wear: WearEvent };
  return data.wear;
}

export async function fetchWearInsights(): Promise<WearInsights> {
  const res = await fetch("/api/wears/insights", { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      toUserFacingMessage(
        (body as { message?: string }).message,
        "Could not load wear insights.",
      ),
    );
  }
  return res.json() as Promise<WearInsights>;
}
