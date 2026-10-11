"use client";

import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";
import { GUIDES, NIYAM_ONE_LINE } from "@/lib/guides";
import { LangToggle, useLang } from "./lang";

const LABELS = {
  what: { en: "What is this page?", hi: "यह पेज क्या है?", mr: "हे पान काय आहे?" },
  who: { en: "Who is it for?", hi: "यह किसके लिए है?", mr: "हे कोणासाठी आहे?" },
  todo: { en: "What to do here", hi: "यहां क्या करें", mr: "येथे काय करावे" },
};

// Shown under every page title. English is always visible; Hindi or Marathi is added when chosen.
export function PageGuide({ id, showCheckLink = true }: { id: string; showCheckLink?: boolean }) {
  const { lang } = useLang();
  const g = GUIDES[id];
  if (!g) throw new Error(`No guide for ${id}`);
  return (
    <aside aria-label="About this page" className="rounded-2xl border border-accent/25 bg-accent-soft/40 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-accent"><Compass className="h-4 w-4" aria-hidden /> About this page</p>
        <LangToggle compact />
      </div>
      <p className="mb-4 text-sm text-text">
        {NIYAM_ONE_LINE.en}
        {lang !== "en" && <span lang={lang} className="deva mt-1 block text-muted">{NIYAM_ONE_LINE[lang]}</span>}
      </p>
      <dl className="grid gap-4 sm:grid-cols-3">
        {(["what", "who", "todo"] as const).map((k) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text/70">
              {LABELS[k].en}
              {lang !== "en" && <span lang={lang} className="deva ml-1 normal-case tracking-normal">/ {LABELS[k][lang]}</span>}
            </dt>
            <dd className="mt-1 text-sm text-text">{g[k].en}</dd>
            {lang !== "en" && <dd lang={lang} className="deva mt-1 text-sm text-muted">{g[k][lang]}</dd>}
          </div>
        ))}
      </dl>
      {showCheckLink && id !== "check" && (
        <p className="mt-4 border-t border-accent/15 pt-3 text-sm">
          Want to know if you can get money from a scheme?{" "}
          <Link href="/check/" className="inline-flex items-center gap-1 font-semibold text-accent underline underline-offset-2">
            Check your eligibility in 2 minutes <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </p>
      )}
    </aside>
  );
}
