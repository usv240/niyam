"use client";

import { CheckCircle2, FileText, GitCommitHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

// Three panels light up in turn: the clause, the code change, the verification.
// With reduced motion, all three are shown at once without animation.
export function HeroVisual() {
  const [step, setStep] = useState(3);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 1800);
    return () => clearInterval(t);
  }, []);
  const lit = (n: number) => (step === n ? "ring-2 ring-accent/60 -translate-y-0.5" : "ring-0 translate-y-0");
  return (
    <div className="relative rounded-3xl border border-border bg-surface p-4 shadow-pop sm:p-6" aria-label="How a government order becomes a verified rule">
      <div className={`rounded-2xl border border-border bg-bg p-4 transition duration-500 ${lit(0)}`}>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <FileText className="h-4 w-4" aria-hidden /> Government order (Marathi original), page 2, clause 4(3)
        </p>
        <p className="deva text-[15px]">
          किमान वयाची 21 वर्षे पूर्ण व कमाल वयाची <mark className="rounded bg-warning-soft px-1 text-text">65 वर्ष</mark> पूर्ण होईपर्यंत
        </p>
        <p className="mt-1 text-sm text-muted"><span className="font-semibold text-text">English: </span>Minimum age 21, until the maximum age of 65 is completed.</p>
      </div>
      <div className={`mt-3 rounded-2xl border border-border bg-bg p-4 font-mono text-[13px] transition duration-500 ${lit(1)}`}>
        <p className="mb-2 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted">
          <GitCommitHorizontal className="h-4 w-4" aria-hidden /> Rule code, parameters/age_max.yaml
        </p>
        <p className="text-muted">  2024-06-28: value: 60</p>
        <p className="rounded bg-success-soft px-1 text-success">+ 2024-07-03: value: 65</p>
        <p className="text-success">+   reference: GR 202407031335114330, p.2</p>
      </div>
      <div className={`mt-3 flex items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success-soft p-4 transition duration-500 ${lit(2)}`}>
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-5 w-5" aria-hidden /> Verified by an independent agent
        </p>
        <p className="text-sm text-text">age 65 eligible, 66 not</p>
      </div>
    </div>
  );
}
