"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { loadWeights } from "@/lib/ranker/storage";
import {
  getRankerTelemetry,
  topWeightEntries,
  weightL2Norm,
  type RankerTelemetryEvent,
} from "@/lib/ranker/telemetry";
import { getActiveProfileId } from "@/lib/ranker/weight-sync";

function shouldShowDebug(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development") {
    return (
      new URLSearchParams(window.location.search).get("debug") === "ranker" ||
      window.localStorage.getItem("scent_ranker_debug") === "1"
    );
  }
  return new URLSearchParams(window.location.search).get("debug") === "ranker";
}

export function RankerDebugPanel() {
  const [visible, setVisible] = useState(false);
  const [events, setEvents] = useState<RankerTelemetryEvent[]>([]);
  const [weights, setWeights] = useState<Float32Array | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVisible(shouldShowDebug());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const refresh = () => {
      setEvents(getRankerTelemetry());
      const profileId = getActiveProfileId();
      setWeights(profileId ? loadWeights(profileId) : null);
    };

    const kickoff = window.setTimeout(refresh, 0);
    const id = window.setInterval(refresh, 1500);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(id);
    };
  }, [visible]);

  if (!visible) return null;

  const norm = weights ? weightL2Norm(weights) : null;
  const tops = weights ? topWeightEntries(weights, 8) : [];

  return (
    <GlassCard
      className="mt-8 p-4 font-mono text-[11px] text-(--text-secondary)"
      aria-label="Ranker debug telemetry"
    >
      <p className="mb-2 text-xs font-medium text-(--accent-gold)">
        Ranker debug
      </p>
      {norm != null && (
        <p className="mb-2 tabular-nums">
          weight L2: {norm.toFixed(3)}
          {norm < 0.4 ? " · cold-start priors active" : ""}
        </p>
      )}
      {tops.length > 0 && (
        <ul className="mb-3 space-y-0.5">
          {tops.map((entry) => (
            <li key={entry.index} className="tabular-nums">
              [{entry.index}] {entry.label}: {entry.value.toFixed(3)}
            </li>
          ))}
        </ul>
      )}
      <p className="mb-1 text-(--text-primary)">Recent updates</p>
      {events.length === 0 ? (
        <p>No learning events yet this session.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={`${event.at}-${event.reason}`}>
              <span className="text-(--text-primary)">{event.reason}</span>
              {" · "}
              {new Date(event.at).toLocaleTimeString()}
              {" · norm "}
              {event.weightNorm.toFixed(3)}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 opacity-70">
        Hide: remove ?debug=ranker or localStorage scent_ranker_debug
      </p>
    </GlassCard>
  );
}
