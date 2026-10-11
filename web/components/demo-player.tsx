"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { JobEvent, Showcase } from "@/lib/data";
import { plainAffects, plainChange } from "@/lib/plain";
import { Info } from "./info";
import { Pipeline } from "./pipeline";
import { Badge, type Tone } from "./ui";

const STAGE_OF: Record<string, string> = { triage: "triage", extract: "extract", encode: "encode", verify: "verify", resolve: "resolve", publish: "publish" };

function tone(e: JobEvent): Tone {
  if (e.type.startsWith("recovery") || e.type === "encode.retry" || e.type === "resolve.loop_guard" || e.type === "orchestrator.retry") return "warning";
  if (e.type.includes("failed") || e.type === "budget.exceeded") return "danger";
  if (e.type === "stage.done" || e.type === "encode.tests_passed" || e.type === "publish.commit") return "success";
  return "info";
}

function label(e: JobEvent): string {
  if (e.type.startsWith("recovery")) return "Recovery";
  if (e.type === "orchestrator.retry" || e.type === "orchestrator.resume") return "Resume";
  if (e.type === "resolve.decision") return "Decision";
  if (e.type === "resolve.glossary") return "Learned";
  if (e.type === "stage.done") return "Done";
  if (e.type === "stage.start") return "Start";
  if (e.type === "job.failed") return "Failed";
  return e.type.split(".").pop() || e.type;
}

export function DemoPlayer({ job }: { job: Showcase }) {
  const events = useMemo(() => job.events.filter((e) => e.type !== "state"), [job.events]);
  const [i, setI] = useState(events.length);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;
    if (i >= events.length) { setPlaying(false); return; }
    const t = setTimeout(() => setI((x) => x + 1), 1100 / speed);
    return () => clearTimeout(t);
  }, [playing, i, events.length, speed]);

  const shown = events.slice(0, i);
  const current = shown[shown.length - 1];
  const activeStage = current?.stage ? STAGE_OF[current.stage] : i === 0 ? "watch" : undefined;
  const done = i >= events.length;
  const reachedVerify = shown.some((e) => e.stage === "verify" && e.type === "stage.done");
  const reachedEncode = shown.some((e) => e.stage === "encode" && e.type === "stage.done");
  const reachedExtract = shown.some((e) => e.stage === "extract" && e.type === "stage.done");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <button onClick={() => { if (done) setI(0); setPlaying((p) => !p); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-contrast">
          {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          {playing ? "Pause" : done ? "Replay the run" : "Play"}
        </button>
        <button onClick={() => setI((x) => Math.min(events.length, x + 1))} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-4 text-sm font-medium" aria-label="Next step">
          <SkipForward className="h-4 w-4" aria-hidden /> Step
        </button>
        <button onClick={() => { setPlaying(false); setI(0); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-4 text-sm font-medium" aria-label="Restart">
          <RotateCcw className="h-4 w-4" aria-hidden /> Restart
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          Speed
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="min-h-11 rounded-lg border border-border bg-bg px-2 text-text">
            <option value={1}>1x</option><option value={2}>2x</option><option value={4}>4x</option>
          </select>
        </label>
        <p className="w-full text-xs text-muted" aria-live="polite">
          Step {i} of {events.length}. {current ? current.message : "Ready. Press Play to replay the recorded run step by step."}
        </p>
      </div>

      <Pipeline active={done ? "publish" : activeStage} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section aria-label="Event timeline" className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">Timeline <Info id="trace" /></h3>
          <ol tabIndex={0} aria-label="Run events" className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            {shown.length === 0 && <li className="text-sm text-muted">Nothing yet.</li>}
            {shown.map((e) => (
              <li key={e.id} className="rounded-xl border border-border bg-bg p-3 text-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone={tone(e)}>{label(e)}</Badge>
                  {e.stage && <span className="text-xs font-medium uppercase tracking-wide text-muted">{e.stage}</span>}
                </div>
                <p className="text-text">{e.message}</p>
              </li>
            ))}
          </ol>
        </section>

        <Tabs.Root defaultValue="document" className="rounded-2xl border border-border bg-surface p-4">
          <Tabs.List aria-label="Run details" className="mb-4 flex flex-wrap gap-1 rounded-xl bg-bg p-1">
            {[["document", "Document"], ["code", "Code change"], ["verify", "Verification"], ["decision", "Decision"]].map(([v, l]) => (
              <Tabs.Trigger key={v} value={v} className="min-h-10 flex-1 rounded-lg px-3 text-sm font-medium text-muted data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-card">
                {l}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="document" className="space-y-3">
            {!reachedExtract ? <p className="text-sm text-muted">The changes appear once the Extract step finishes.</p> : (
              <>
                {job.changes.map((c) => (
                  <article key={c.change_id} className="rounded-xl border border-border bg-bg p-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge tone={c.affects === "narrows" ? "warning" : "success"}>{plainAffects(c.affects)}</Badge>
                      <Badge tone="neutral" icon={false}>{plainChange(c.change_type)}</Badge>
                    </div>
                    <p className="font-medium">{c.summary}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Original (Marathi) <Info id="original-translation" /></p>
                    <blockquote lang="mr" className="deva mt-1 border-l-4 border-accent pl-3 text-[15px]">{c.citation.quote_original}</blockquote>
                    <p className="mt-1 pl-4 text-xs text-muted"><span className="font-semibold text-text">English: </span>{c.citation.quote_english} (page {c.citation.page}, clause {c.citation.clause})</p>
                  </article>
                ))}
                {job.ambiguities.length > 0 && (
                  <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">
                    <p className="mb-2 flex items-center gap-2 font-semibold">Questions flagged for a human <Info id="ambiguity" /></p>
                    <ul className="list-disc space-y-1 pl-5 text-muted">{job.ambiguities.map((a) => <li key={a.question}>{a.question}</li>)}</ul>
                  </div>
                )}
                {job.skipped.length > 0 && (
                  <p className="text-xs text-muted">Not modelled, because they are procedure or paperwork rather than eligibility: {job.skipped.map((s) => s.topic).join("; ")}.</p>
                )}
              </>
            )}
          </Tabs.Content>

          <Tabs.Content value="code">
            {!reachedEncode ? <p className="text-sm text-muted">The code change appears once the Encode step finishes.</p> : (
              <div className="space-y-4">
                <p className="text-sm text-muted">Files changed by the coding agent: {(job.encode.files || []).filter((f) => !f.startsWith(".niyam")).join(", ")}. Tests: {job.encode.tests?.passed} passed, {job.encode.tests?.failed ?? 0} failed.</p>
                {Object.entries(job.diff_files || {}).map(([f, d]) => d && (
                  <div key={f}>
                    <p className="mb-1 font-mono text-xs text-muted">{f}</p>
                    <pre tabIndex={0} aria-label="Code change" className="max-h-80 overflow-auto rounded-xl border border-border bg-bg p-3 font-mono text-[12px] leading-5">
                      {d.split("\n").filter((l) => !l.startsWith("diff --git") && !l.startsWith("index ")).map((l, k) => (
                        <span key={k} className={`block ${l.startsWith("+") && !l.startsWith("+++") ? "bg-success-soft text-success" : l.startsWith("-") && !l.startsWith("---") ? "bg-danger-soft text-danger" : "text-muted"}`}>{l || " "}</span>
                      ))}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="verify">
            {!reachedVerify ? <p className="text-sm text-muted">Verification appears once the Verify step finishes.</p> : (
              <div>
                <p className="mb-3 text-sm text-muted">The verifier never saw the code change. It wrote these test citizens from the law alone. <Info id="step-verify" /></p>
                <ul className="space-y-2">
                  {job.verifier_cases.map((c) => (
                    <li key={c.name} className="rounded-xl border border-border bg-bg p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{c.name}</p>
                        <Badge tone={c.status === "agree" ? "success" : c.status === "disagree" ? "warning" : "neutral"}>{c.status === "agree" ? "Agrees" : c.status === "disagree" ? "Disagrees" : "Invalid"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Expected {c.expected.eligible ? "eligible" : "not eligible"}{c.expected.monthly_inr != null ? `, Rs ${c.expected.monthly_inr}` : ""}.
                        {c.actual && <> Rules say {c.actual.eligible ? "eligible" : "not eligible"}{c.actual.eligible ? `, Rs ${c.actual.monthly_inr}` : ""}.</>}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="decision" className="space-y-3 text-sm">
            {!done ? <p className="text-muted">The decision appears at the end of the run.</p> : (
              <>
                {job.resolutions.map((r, k) => (
                  <div key={k} className="rounded-xl border border-border bg-bg p-4">
                    <p className="mb-1 flex flex-wrap items-center gap-2 font-medium">Coordinator ruling <Badge tone="info">{r.decision.replaceAll("_", " ")}</Badge></p>
                    <p className="text-muted"><b className="text-text">{r.case_name}.</b> {r.explanation}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-border bg-bg p-4">
                  <p className="flex items-center gap-2 font-medium">Confidence {job.confidence?.toFixed(2)} <Info id="confidence" /></p>
                  <p className="mt-1 text-muted">Decision: {job.decision?.replaceAll("_", " ")} <Info id="autonomy" /></p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{job.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
              </>
            )}
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
