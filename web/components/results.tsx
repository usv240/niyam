import { evals, pct, usd } from "@/lib/data";
import { Info } from "./info";

const ROWS: { key: string; label: string; kind: "pct" | "usd"; better: "up" | "down"; info?: string }[] = [
  { key: "change_recall", label: "Changes found", kind: "pct", better: "up" },
  { key: "value_accuracy", label: "New values exactly right", kind: "pct", better: "up" },
  { key: "boundary_accuracy", label: "Limits read correctly (more than vs or more)", kind: "pct", better: "up", info: "boundary" },
  { key: "outcome_accuracy", label: "Test citizens get the right answer", kind: "pct", better: "up" },
  { key: "decision_correct", label: "Correct choice to act alone or ask a human", kind: "pct", better: "up", info: "autonomy" },
  { key: "verifier_agreement", label: "Independent verifier agrees", kind: "pct", better: "up", info: "verifier-agreement" },
  { key: "cost_usd", label: "Average cost per document", kind: "usd", better: "down" },
];

// Before/after bars from evals/results/*.json. Numbers are measured, never typed in.
export function Results({ compact = false }: { compact?: boolean }) {
  const versions = evals.slice(-2);
  if (!versions.length) return <p className="text-muted">Evaluation results will appear here after the first run.</p>;
  const max: Record<string, number> = {};
  for (const r of ROWS) max[r.key] = Math.max(...versions.map((v) => v.summary[r.key] ?? 0), r.kind === "pct" ? 1 : 0.01);
  const rows = compact ? ROWS.filter((r) => ["outcome_accuracy", "decision_correct", "cost_usd"].includes(r.key)) : ROWS;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {versions.map((v, i) => (
          <span key={v.version} className="inline-flex items-center gap-2">
            <span className={`h-2.5 w-6 rounded-full ${i === versions.length - 1 ? "bg-accent" : "bg-muted/40"}`} aria-hidden />
            <b className="text-text">{v.version}</b> {v.note}
          </span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.key}>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">{r.label} {r.info && <Info id={r.info} />}</p>
          <div className="space-y-1">
            {versions.map((v, i) => {
              const val = v.summary[r.key];
              const w = val === undefined ? 0 : Math.max(2, (val / max[r.key]) * 100);
              return (
                <div key={v.version} className="flex items-center gap-3">
                  <span className="w-8 text-xs text-muted">{v.version}</span>
                  <div className="h-3 flex-1 rounded-full bg-surface-2">
                    <div className={`h-3 rounded-full ${i === versions.length - 1 ? "bg-accent" : "bg-muted/40"}`} style={{ width: `${w}%` }} />
                  </div>
                  <span className="w-16 text-right text-sm tabular-nums">{r.kind === "pct" ? pct(val) : usd(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">
        Measured by us on {versions[versions.length - 1].summary.runs} runs: a real Ladki Bahin amendment, the same order as a scan,
        two real unrelated orders, and two labelled synthetic robustness tests. Lower cost is better.
      </p>
    </div>
  );
}
