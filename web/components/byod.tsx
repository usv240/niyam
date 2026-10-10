"use client";

import { FileUp, Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { API_BASE, apiCall, apiHealth, type ApiError } from "@/lib/api";
import { Info } from "./info";
import { Pipeline } from "./pipeline";
import { Badge, Callout } from "./ui";

type Ev = { id: number; type: string; stage: string | null; message: string };
type Job = { id: string; state: string; pr_url?: string; confidence?: number; decision?: string; changes?: { summary: string }[]; cost_usd?: number };

export function Byod() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { apiHealth().then((h) => setOnline(Boolean(h?.ok))); }, []);

  useEffect(() => {
    if (!jobId) return;
    const es = new EventSource(`${API_BASE}/api/v1/jobs/${jobId}/events`);
    es.addEventListener("niyam", (m) => setEvents((x) => [...x, JSON.parse((m as MessageEvent).data)]));
    es.addEventListener("done", async () => { es.close(); setJob(await apiCall<Job>(`/api/v1/jobs/${jobId}`)); });
    es.onerror = () => { /* the browser retries automatically */ };
    return () => es.close();
  }, [jobId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setEvents([]); setJob(null); setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file); else fd.append("url", url);
      const key = localStorage.getItem("niyam_key");
      const r = await apiCall<{ job_id: string }>("/api/v1/documents", { method: "POST", body: fd, headers: key ? { Authorization: `Bearer ${key}` } : {} });
      setJobId(r.job_id);
    } catch (x) {
      setErr(x as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const stage = events.filter((e) => e.stage).at(-1)?.stage ?? undefined;

  return (
    <div className="space-y-8">
      {online === false && (
        <Callout tone="warning" title="The live agent is not reachable from this page right now">
          The website works without a server, but running a new document needs the Niyam API. {API_BASE ? "It may be restarting." : "This copy of the site was built without an API address."} You can still{" "}
          <Link href="/demo/" className="font-medium text-accent underline underline-offset-2">replay a real run step by step</Link>, or run Niyam yourself from the{" "}
          <a href="https://github.com/usv240/niyam#run-it-yourself" className="font-medium text-accent underline underline-offset-2">source code</a>.
        </Callout>
      )}
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setUrl(""); } }}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition ${drag ? "border-accent bg-accent-soft" : "border-border bg-bg"}`}
        >
          <FileUp className="h-8 w-8 text-accent" aria-hidden />
          <p className="font-medium">{file ? file.name : "Drop a government order (PDF) here"}</p>
          <p className="text-xs text-muted">PDF only, up to 10 MB and 30 pages.</p>
          <button type="button" onClick={() => input.current?.click()} className="min-h-11 rounded-lg border border-border bg-surface px-4 text-sm font-medium">Choose a file</button>
          <input ref={input} type="file" accept="application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setUrl(""); } }} aria-label="Choose a PDF" />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or paste a link<span className="h-px flex-1 bg-border" /></div>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3">
          <Link2 className="h-4 w-4 text-muted" aria-hidden />
          <span className="sr-only">Link to a PDF</span>
          <input value={url} onChange={(e) => { setUrl(e.target.value); setFile(null); }} placeholder="https://gr.maharashtra.gov.in/Site/Upload/...pdf" className="min-h-11 flex-1 bg-transparent text-sm outline-none" inputMode="url" />
        </label>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
          <li>Runs on a test copy of the rulebook. Nothing official changes, and it is never merged automatically. <Info id="byod" /></li>
          <li>Uploads are deleted after processing. Do not upload documents containing personal information.</li>
          <li>Without an API key: 3 documents per day. With a free key: 20.</li>
        </ul>
        <button disabled={busy || online === false || (!file && !url)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 font-semibold text-accent-contrast disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Run Niyam on this document
        </button>
        {err && <Callout tone="danger" title="That did not work">{err.message}</Callout>}
      </form>

      {jobId && (
        <section aria-live="polite" className="space-y-6">
          <Pipeline active={job ? "publish" : stage} />
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="mb-3 text-sm text-muted">Job <code className="font-mono">{jobId}</code></p>
            <ol className="space-y-2">
              {events.filter((e) => e.type !== "state").map((e) => (
                <li key={e.id} className="rounded-xl border border-border bg-bg p-3 text-sm">
                  <Badge tone={e.type.startsWith("recovery") ? "warning" : e.type.includes("failed") ? "danger" : e.type === "stage.done" ? "success" : "info"}>{e.stage || e.type}</Badge>
                  <p className="mt-1">{e.message}</p>
                </li>
              ))}
              {!job && <li className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Working. Each step appears as soon as it happens.</li>}
            </ol>
          </div>
          {job && (
            <Callout tone={job.state === "CLOSED_IRRELEVANT" || job.state === "NO_CHANGES" ? "neutral" : "success"} title={`Finished: ${job.state.replaceAll("_", " ").toLowerCase()}`}>
              {job.changes?.length ? <>Found {job.changes.length} change(s): {job.changes.map((c) => c.summary).join("; ")}. </> : "No eligibility changes for a covered scheme. "}
              {job.confidence != null && <>Confidence {job.confidence.toFixed(2)}. </>}
              {job.cost_usd != null && <>Cost ${job.cost_usd.toFixed(3)}.</>}
            </Callout>
          )}
        </section>
      )}
    </div>
  );
}
