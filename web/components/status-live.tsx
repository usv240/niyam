"use client";

import { useEffect, useState } from "react";
import { API_BASE, API_ENABLED, apiCall } from "@/lib/api";
import { Badge, Callout } from "./ui";

type Status = { sources: Record<string, { state: string; detail: string; checked_at: number }>; running_jobs: number; last_job: { id: string; state: string } | null; tracing: boolean };

export function StatusLive() {
  const [s, setS] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!API_ENABLED) { setFailed(true); return; }
    apiCall<Status>("/api/v1/status").then(setS).catch(() => setFailed(true));
  }, []);
  if (failed) return <Callout tone="warning" title="Live status cannot be shown right now">The live server is not answering, so the watcher's latest check cannot be shown here. This does not affect checking your eligibility, exploring the rules, or replaying a real run. The box on the right shows the last saved build.</Callout>;
  if (!s) return <p className="text-sm text-muted">Checking the live agent...</p>;
  return (
    <div className="space-y-3">
      {Object.entries(s.sources).map(([k, v]) => (
        <div key={k} className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium">{k.replaceAll("_", " ")}</p><p className="text-sm text-muted">{v.detail}</p></div>
          <div className="flex items-center gap-3">
            <Badge tone={v.state === "OK" ? "success" : v.state === "BLOCKED" ? "danger" : "warning"}>{v.state}</Badge>
            <span className="text-xs text-muted">{new Date(v.checked_at * 1000).toLocaleString()}</span>
          </div>
        </div>
      ))}
      <p className="text-sm text-muted">Running jobs: {s.running_jobs}. Tracing to neatlogs: {s.tracing ? "on" : "off"}.{s.last_job && <> Last job: <code className="font-mono">{s.last_job.id}</code> ({s.last_job.state.toLowerCase()}).</>}</p>
    </div>
  );
}
