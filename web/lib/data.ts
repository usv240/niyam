import evalsJson from "@/data/evals.json";
import evalsExtraJson from "@/data/evals-extra.json";
import metaJson from "@/data/meta.json";
import mainJson from "@/data/rulebook-main.json";
import proposedJson from "@/data/rulebook-proposed.json";
import showcaseJson from "@/data/showcase.json";
import provenanceJson from "@/data/provenance.json";
import type { Snapshot, Source } from "./rules";

export const rulebookMain = mainJson as unknown as Snapshot;
export const rulebookProposed = proposedJson as unknown as Snapshot;

export type Change = {
  change_id: string; scheme_id: string; change_type: string; target: string; summary: string;
  old_value: string | null; new_value: string | null; boundary: string | null; effective_from: string;
  affects: string; confidence: number;
  citation: { page: number; clause: string; quote_original: string; quote_english: string };
};
export type JobEvent = { id: number; ts: number; type: string; stage: string | null; message: string; payload: Record<string, unknown> };
export type VerifierCase = {
  name: string; date: string; person: Record<string, unknown>; scheme_id: string; status: string;
  expected: { eligible: boolean; monthly_inr: number | null }; actual?: { eligible: boolean; monthly_inr: number; unmet: string[] };
  reasoning: string; citation: { page: number; clause: string; quote_original: string; quote_english: string };
};
export type Showcase = {
  id: string; state: string; document: { title?: string; code?: string; source_url?: string; published_at?: string };
  title_en?: string; changes: Change[];
  ambiguities: { question: string; readings: string[]; citation: Change["citation"] }[];
  skipped: { topic: string; reason: string }[];
  verdict: { cases_valid: number; cases_agree: number; cases_disagree: number; agreement_rate: number; verdict: string } | null;
  verifier_cases: VerifierCase[];
  resolutions: { case_name: string; decision: string; explanation: string; fix_instruction?: string | null; human_question?: string | null }[];
  reasons: string[]; encode: { attempts?: number; files?: string[]; tests?: { passed: number; failed: number }; rounds?: number };
  confidence: number; decision: string; pr_url: string | null; commit_sha: string | null; checkpoint_id: string | null;
  checkpoint_url: string | null; trace_id: string | null; cost_usd: number; started_at: number; finished_at: number;
  events: JobEvent[]; diff_files?: Record<string, string>;
};
export const showcase = showcaseJson as unknown as Showcase;

// Line-level provenance from `entire why`: who wrote each agent-changed rule line, with which model, in which session.
export type LineProvenance = { commit_sha: string; author: string; author_time: string; checkpoint_id: string; session_id: string; agent: string; model: string };
export const provenance = provenanceJson as unknown as Record<string, LineProvenance>;

export type EvalResult = Record<string, unknown> & { case: string; job_id: string; state: string; cost_usd: number; latency_s: number; trace_id?: string };
export type EvalVersion = { version: string; note?: string; ran_at?: string; summary: Record<string, number>; results: EvalResult[] };
export const evals = (evalsJson as unknown as { versions: EvalVersion[] }).versions;
// Extra runs: failures injected on purpose ("chaos"), and repeated runs to check consistency.
export const evalsExtra = evalsExtraJson as unknown as Record<string, EvalVersion>;

export const meta = metaJson as unknown as {
  generated_at: string; showcase_job: string; rulebook_main_sha: string; niyam_head: string;
  published: { id: string; doc_code: string; state: string; pr_url: string; commit_sha: string; checkpoint_id: string; checkpoint_url: string; trace_id: string; confidence: number; decision: string; cost_usd: number; title_en: string }[];
};

export function docTitle(snap: Snapshot, src: Source): string {
  const d = src.doc ? snap.sources[src.doc] : undefined;
  return d ? `GR ${d.code} (${String(d.date)})` : src.doc || "source";
}

export function docUrl(snap: Snapshot, src: Source): string | undefined {
  const d = src.doc ? snap.sources[src.doc] : undefined;
  return d?.url ? `${d.url}#page=${src.page ?? 1}` : undefined;
}

export const pct = (x: number | undefined | null) => (x === undefined || x === null ? "n/a" : `${Math.round(x * 1000) / 10}%`);
export const usd = (x: number | undefined | null) => (x === undefined || x === null ? "n/a" : `$${x.toFixed(2)}`);
