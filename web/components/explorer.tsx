"use client";

import * as Popover from "@radix-ui/react-popover";
import { Code2, ExternalLink, History } from "lucide-react";
import { useMemo, useState } from "react";
import { docTitle, docUrl, meta, provenance, rulebookMain, rulebookProposed } from "@/lib/data";
import { activeConditions, changeDates, paramsAt, paramValueAt, renderText, type Snapshot, type Source } from "@/lib/rules";
import { Info } from "./info";
import { Badge } from "./ui";

// Which agent job encoded this source document (its PR and Entire checkpoint).
function provenanceFor(snap: Snapshot, src: Source) {
  const code = src.doc ? String(snap.sources[src.doc]?.code ?? "") : "";
  return code ? meta.published.find((p) => p.doc_code === code) : undefined;
}

export function Why({ snap, src, label = "Why?", provKey }: { snap: Snapshot; src: Source; label?: string; provKey?: string }) {
  const line = provKey ? provenance[provKey] : undefined;
  const url = docUrl(snap, src);
  const doc = src.doc ? snap.sources[src.doc] : undefined;
  const isAgentChange = doc && String(doc.code) !== "202406281814018230";
  const prov = isAgentChange ? provenanceFor(snap, src) : undefined;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-bg px-2.5 text-xs font-semibold text-accent hover:bg-accent-soft" aria-label="Why does this rule say this? Show the source">
          {label}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} collisionPadding={12} className="z-50 w-[min(94vw,28rem)] rounded-xl border border-border bg-bg p-4 text-sm shadow-pop">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Source <Info id="provenance" /></p>
          <p className="font-semibold">{docTitle(snap, src)}, page {src.page}, clause {src.clause}</p>
          {doc?.title_en && <p className="text-xs text-muted">{doc.title_en}</p>}
          {src.quote && <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Original (Marathi)</p>}
          {src.quote && <blockquote lang="mr" className="deva mt-1 border-l-4 border-accent pl-3 text-[15px]">{src.quote}</blockquote>}
          {src.quote_en && <p className="mt-1 pl-4 text-xs text-muted"><span className="font-semibold text-text">English: </span>{src.quote_en}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface">Open the government order <ExternalLink className="h-3 w-3" aria-hidden /></a>}
            {prov?.checkpoint_url && <a href={prov.checkpoint_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface">Agent reasoning (Entire checkpoint) <ExternalLink className="h-3 w-3" aria-hidden /></a>}
            {prov?.pr_url && <a href={prov.pr_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface">Change request <ExternalLink className="h-3 w-3" aria-hidden /></a>}
          </div>
          {line && (
            <div className="mt-3 rounded-lg border border-border bg-surface p-3 text-xs">
              <p className="mb-1 font-semibold text-text">Who wrote this line (from Entire) <Info id="checkpoint" /></p>
              <p className="text-muted">{line.agent} ({line.model}), as {line.author}, on {line.author_time.slice(0, 16).replace("T", " ")} UTC.</p>
              <p className="mt-1 font-mono text-[11px] text-muted">checkpoint {line.checkpoint_id}<br />session {line.session_id}<br />commit {line.commit_sha.slice(0, 7)}</p>
            </div>
          )}
          {!isAgentChange && <p className="mt-3 text-xs text-muted">Encoded by hand as the starting point (baseline), from the original order.</p>}
          {isAgentChange && <p className="mt-3 text-xs text-muted">Encoded by the Niyam agent. Its full session is saved as an Entire checkpoint on the commit.</p>}
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Explorer() {
  const [withProposed, setWithProposed] = useState(true);
  const snap = withProposed ? rulebookProposed : rulebookMain;
  const [schemeId, setSchemeId] = useState("mh.ladki_bahin");
  const scheme = snap.schemes[schemeId] ?? Object.values(snap.schemes)[0];
  const dates = useMemo(() => changeDates(scheme), [scheme]);
  const [on, setOn] = useState<string>(dates[dates.length - 1] || scheme.launched);
  const date = on < scheme.launched ? scheme.launched : on;
  const params = paramsAt(scheme, date);
  const conds = activeConditions(scheme, date);
  const [showCode, setShowCode] = useState(false);

  const timeline = useMemo(() => {
    const ev: { date: string; text: string; src: Source; kind: string; key?: string }[] = [];
    for (const [name, p] of Object.entries(scheme.parameters)) {
      p.values.forEach((v, k) => {
        if (k === 0) return;
        ev.push({ date: v.start, kind: "change", text: `${p.description}: ${JSON.stringify(p.values[k - 1].value)} to ${JSON.stringify(v.value)}`, src: v.reference, key: `param:${scheme.id}:${name}:${v.start}` });
      });
    }
    for (const c of scheme.conditions) {
      if (c.valid_from !== scheme.launched) ev.push({ date: c.valid_from, kind: "added", text: `Condition starts: ${renderText(c.text, paramsAt(scheme, c.valid_from))}`, src: c.source, key: `cond:${scheme.id}:${c.id}:${c.valid_from}` });
      if (c.valid_until) ev.push({ date: c.valid_until, kind: "ended", text: `Condition ends after this day: ${renderText(c.text, paramsAt(scheme, c.valid_until))}`, src: c.source });
    }
    return ev.sort((a, b) => a.date.localeCompare(b.date));
  }, [scheme]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          {Object.keys(snap.schemes).length > 1 && (
            <div role="tablist" aria-label="Scheme" className="mb-4 inline-flex flex-wrap gap-1 rounded-lg border border-border bg-bg p-1">
              {Object.values(snap.schemes).map((s) => (
                <button key={s.id} role="tab" aria-selected={s.id === scheme.id} onClick={() => { setSchemeId(s.id); const d = changeDates(s); setOn(d[d.length - 1] || s.launched); }}
                  className={`min-h-10 rounded-md px-3 text-sm font-medium ${s.id === scheme.id ? "bg-accent text-accent-contrast" : "text-muted hover:text-text"}`}>
                  {s.name.replace(" Yojana", "")}
                </button>
              ))}
            </div>
          )}
          <p className="text-sm text-muted">{scheme.department}</p>
          <h2 className="text-2xl font-semibold">{scheme.name}</h2>
          <p lang="mr" className="deva text-muted">{scheme.name_mr} <span className="font-sans text-xs">(name in Marathi)</span></p>
          <p className="mt-2 max-w-2xl text-sm text-muted">{scheme.summary}</p>
          <p className="mt-2 max-w-2xl text-xs text-muted">The starting rules were written by hand from the scheme&apos;s first government order. Every later change was made by the Niyam agent from a newer order and approved by a person. Press Why? to see which. <Info id="provenance" /></p>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            <span className="flex items-center gap-1.5">Show the rules on <Info id="time-travel" /></span>
            <input type="date" value={date} min={scheme.launched} onChange={(e) => setOn(e.target.value)} className="min-h-11 rounded-lg border border-border bg-bg px-3" />
          </label>
          <div className="flex flex-wrap gap-1">
            {dates.map((d) => (
              <button key={d} onClick={() => setOn(d)} className={`rounded-md border px-2 py-1 text-xs ${d === date ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-text"}`}>{d}</button>
            ))}
          </div>
{meta.pending_changes && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withProposed} onChange={(e) => setWithProposed(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Include changes waiting for human review
          </label>
)}
        </div>
      </div>

      <section aria-label="Rules on the chosen date">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">On {date}, a person can receive Rs {Number(params.monthly_benefit ?? 0).toLocaleString("en-IN")} a month if all of these are true</h3>
          <button onClick={() => setShowCode((s) => !s)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-bg px-3 text-sm font-medium" aria-pressed={showCode}>
            <Code2 className="h-4 w-4" aria-hidden /> {showCode ? "Hide" : "View as"} code
          </button>
        </div>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-bg">
          {conds.map((c) => (
            <li key={`${c.id}-${c.valid_from}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{renderText(c.text, params)}</p>
                <p className="text-xs text-muted">
                  {c.kind === "disqualification" ? "Disqualification rule" : "Eligibility rule"} since {c.valid_from}
                  {c.valid_until ? `, until ${c.valid_until}` : ""}
                </p>
                {showCode && <code className="mt-1 block font-mono text-xs text-muted">{c.when}</code>}
              </div>
              <Why snap={snap} src={c.source} provKey={`cond:${scheme.id}:${c.id}:${c.valid_from}`} />
            </li>
          ))}
        </ul>
        {showCode && (
          <div tabIndex={0} role="region" aria-label="Scrollable table" className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface p-4">
            <p className="mb-2 text-sm font-semibold">Parameters on {date}</p>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(scheme.parameters).map(([k, p]) => {
                  const v = paramValueAt(p, date);
                  return v && (
                    <tr key={k} className="border-t border-border">
                      <td className="py-2 pr-3 font-mono text-xs">{k}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{JSON.stringify(v.value)}</td>
                      <td className="py-2 pr-3 text-xs text-muted">since {v.start}</td>
                      <td className="py-2"><Why snap={snap} src={v.reference} provKey={`param:${scheme.id}:${k}:${v.start}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="History">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><History className="h-5 w-5 text-accent" aria-hidden /> History of changes</h3>
        {timeline.length === 0 ? <p className="text-sm text-muted">No changes since this scheme launched.</p> : (
          <ol className="relative space-y-3 border-l-2 border-border pl-6">
            {timeline.map((t, k) => (
              <li key={k} className="relative">
                <span className="absolute -left-[31px] top-2 h-3 w-3 rounded-full border-2 border-bg bg-accent" aria-hidden />
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted">{t.date} <Badge tone={t.kind === "ended" ? "warning" : "info"} icon={false}>{t.kind}</Badge></p>
                    <p className="text-sm">{t.text}</p>
                  </div>
                  <Why snap={snap} src={t.src} provKey={t.key} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
