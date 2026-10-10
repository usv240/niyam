import { Eye, FileSearch, GitPullRequest, Quote, Scale, ShieldCheck, Wrench } from "lucide-react";
import { Info } from "./info";

export const STEPS = [
  { id: "watch", label: "Watch", line: "Checks official sources every 15 minutes for new government orders.", Icon: Eye },
  { id: "triage", label: "Triage", line: "Decides if the document changes any scheme Niyam covers.", Icon: FileSearch },
  { id: "extract", label: "Extract", line: "Quotes the exact clauses that change eligibility, and checks every quote.", Icon: Quote },
  { id: "encode", label: "Encode", line: "A coding agent updates the rulebook and writes tests.", Icon: Wrench },
  { id: "verify", label: "Verify", line: "A separate agent checks the new rules against the law, blind to the change.", Icon: ShieldCheck },
  { id: "resolve", label: "Resolve", line: "Settles disagreements, or asks a human a plain question.", Icon: Scale },
  { id: "publish", label: "Publish", line: "Opens a change request with sources and proof. Merges alone only when safe.", Icon: GitPullRequest },
];

export function Pipeline({ active }: { active?: string }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {STEPS.map((s, i) => {
        const on = active === s.id;
        return (
          <li
            key={s.id}
            className={`relative rounded-2xl border p-4 transition ${on ? "border-accent bg-accent-soft shadow-pop" : "border-border bg-surface"}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${on ? "bg-accent text-accent-contrast" : "bg-bg text-accent"}`}>
                <s.Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="text-xs font-semibold text-muted">{i + 1}</span>
            </div>
            <p className="flex items-center gap-1.5 font-semibold">
              {s.label} <Info id={`step-${s.id}`} />
            </p>
            <p className="mt-1 text-sm text-muted">{s.line}</p>
          </li>
        );
      })}
    </ol>
  );
}
