import type { Metadata } from "next";
import { Info } from "@/components/info";
import { Results } from "@/components/results";
import { Badge, ButtonLink, Callout, Card, Container, ExtLink, PageHeader, Section } from "@/components/ui";
import { evals, meta, pct, showcase, usd } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "For judges", description: "Every neatHack judging criterion mapped to evidence you can open in one click." };

function Ev({ title, children, tone = "success", status = "Done" }: { title: string; children: React.ReactNode; tone?: "success" | "warning" | "neutral"; status?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{title}</p><Badge tone={tone}>{status}</Badge></div>
      <div className="text-sm text-muted">{children}</div>
    </div>
  );
}

const FOCUS = [
  ["Planning", "Each job runs a fixed plan of seven stages; the coordinator plans fixes when agents disagree."],
  ["Tool use", "PDF reading and transcription, a citation checker, git worktrees, Claude Code, the rulebook test runner, simulation, GitHub."],
  ["State", "Every state is saved before the next step. A failed run retried from its last good state (job_20261010_8b7a02ea)."],
  ["Context", "Triage reads 3 pages; the encoder sees only the checked change list; v2 added the missing benefit formula after the traces showed it was needed."],
  ["Execution", "Watcher every 15 minutes; full runs of 1 to 3 minutes without a person."],
  ["Recovery", "Transcription fallback for scans, schema repair, model fallback, encoder retries, budget stop, loop guard, resume."],
  ["Verification", "A blind verifier on a different model writes its own test citizens; quotes are checked against the PDF; every change has boundary tests."],
  ["Iteration", "Verifier disagreements become precise fixes; reusable interpretations are written to the glossary for later runs."],
];

export default function Judges() {
  const v1 = evals.find((e) => e.version === "v1");
  const v2 = evals.find((e) => e.version === "v2");
  return (
    <>
      <PageHeader eyebrow="For judges" title="Everything you need, one click each" intro="Niyam is an AI agent that keeps welfare eligibility rules, written as code, in sync with government orders. Below, each judging criterion is mapped to evidence you can open and check.">
        <div className="grid gap-3 sm:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-muted">What</p><p className="text-sm">An agent that reads new government orders and updates the rule code itself, with tests.</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Why</p><p className="text-sm">When eligibility code drifts from the law, people are wrongly excluded or paid.</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">How</p><p className="text-sm">Seven stages, a blind verifier, a trust policy, and a checkpoint for every rule.</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">New</p><p className="text-sm">Entire checkpoints as legal provenance: every rule line shows the clause and the agent&apos;s reasoning.</p></Card>
        </div>
      </PageHeader>

      <Container className="space-y-10 py-12">
        <Card>
          <h2 className="text-xl font-semibold">Quick links</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {SITE.video && <ButtonLink href={SITE.video} external>Demo video</ButtonLink>}
            <ButtonLink href="/demo/">Replay a real run</ButtonLink>
            <ButtonLink href={SITE.repo} external variant="secondary">Agent repository</ButtonLink>
            <ButtonLink href={SITE.rulebookRepo} external variant="secondary">Rulebook repository</ButtonLink>
            {showcase.pr_url && <ButtonLink href={showcase.pr_url} external variant="secondary">Agent pull request</ButtonLink>}
            <ButtonLink href={SITE.buildLog} external variant="secondary">Build log</ButtonLink>
            <ButtonLink href={SITE.businessPlan} external variant="secondary">Business plan</ButtonLink>
          </div>
        </Card>

        <section id="agent" className="scroll-mt-24">
          <h2 className="mb-1 text-2xl font-semibold">The agent <span className="text-base font-normal text-muted">(30%)</span></h2>
          <p className="mb-4 text-muted">A substantial task, end to end: a Marathi government order goes in; a verified, tested, sourced rule change comes out as a pull request.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Ev title="Happy path, real document">
              Job <code className="font-mono">{showcase.id}</code>: {showcase.changes.length} changes, {showcase.verdict?.cases_agree} of {showcase.verdict?.cases_valid} independent checks agree, confidence {showcase.confidence?.toFixed(2)}, {usd(showcase.cost_usd)}.{" "}
              {showcase.pr_url && <ExtLink href={showcase.pr_url}>Pull request</ExtLink>}. Trace id <code className="font-mono break-all">{showcase.trace_id}</code>.
            </Ev>
            <Ev title="Recovery from a failure">
              A scanned copy with no text layer: Niyam detected it and transcribed the PDF (<code className="font-mono">recovery.ocr_fallback</code>), then scored 100%. A crashed run resumed from its last good state without repeating work.
            </Ev>
            <Ev title="Verifier rejection, then a fix">
              Version 1: the verifier disagreed on one case, the coordinator sent a fix, and the traces showed the same case looping. Version 2 adds the missing context and a loop guard. Full story in the build log.
            </Ev>
            <Ev title="Calibrated autonomy">
              Acts alone only when a number or date changes and every check agrees. Never removes people from a scheme without a human. <Info id="autonomy" />
            </Ev>
          </div>
          <div tabIndex={0} role="region" aria-label="Scrollable table" className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Focus area</th><th className="px-4 py-3">Where you can see it</th></tr></thead>
              <tbody>{FOCUS.map(([a, b]) => <tr key={a} className="border-t border-border align-top"><td className="px-4 py-3 font-medium">{a}</td><td className="px-4 py-3 text-muted">{b}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section id="tools" className="scroll-mt-24">
          <h2 className="mb-1 text-2xl font-semibold">neatlogs, Entire and cfo.ai <span className="text-base font-normal text-muted">(25%)</span></h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Ev title="neatlogs: used to improve the agent">
              One trace per job, a span per stage and per recovery. The v1 traces showed a $3.05 run with the coordinator ruling three ways on one case; the fix cut cost per document from {usd(v1?.summary.cost_usd)} to {usd(v2?.summary.cost_usd)}. Every eval trace is tagged with case and version.
            </Ev>
            <Ev title="Entire: legal provenance">
              Every rule commit by the agent carries an Entire checkpoint with the coding agent&apos;s full session. Showcase checkpoint <code className="font-mono">{showcase.checkpoint_id}</code>{showcase.checkpoint_url && <> (<ExtLink href={showcase.checkpoint_url}>open</ExtLink>)</>}. Both repositories also capture our own build sessions.
            </Ev>
            <Ev title="cfo.ai: business plan" tone="warning" status="In progress">
              Pricing, costs, revenue and runway, with cost per document taken from measured runs ({usd(v2?.summary.cost_usd)}). <ExtLink href={SITE.businessPlan}>Plan folder</ExtLink>.
            </Ev>
          </div>
        </section>

        <section id="evidence" className="scroll-mt-24">
          <h2 className="mb-1 text-2xl font-semibold">Before and after, measured <Info id="eval" /></h2>
          <p className="mb-4 text-muted">Same 6 cases for both versions. Small sample, real numbers.</p>
          <Card><Results /></Card>
          <div tabIndex={0} role="region" aria-label="Scrollable table" className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Version</th><th className="px-4 py-3">Case</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Outcomes</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">neatlogs trace id</th></tr></thead>
              <tbody>
                {evals.flatMap((v) => v.results.map((r) => (
                  <tr key={v.version + r.job_id} className="border-t border-border align-top">
                    <td className="px-4 py-2">{v.version}</td>
                    <td className="px-4 py-2">{r.case}</td>
                    <td className="px-4 py-2 text-muted">{String(r.state).replaceAll("_", " ").toLowerCase()}</td>
                    <td className="px-4 py-2">{r.outcome_accuracy !== undefined ? pct(r.outcome_accuracy as number) : r.triage_correct ? "correctly closed" : "n/a"}</td>
                    <td className="px-4 py-2">{usd(r.cost_usd)}</td>
                    <td className="px-4 py-2 font-mono text-xs break-all">{r.trace_id}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="public" className="scroll-mt-24 grid gap-3 md:grid-cols-3">
          <Ev title="Demo video (20%)" tone={SITE.video ? "success" : "neutral"} status={SITE.video ? "Done" : "Monday"}>Under 3 minutes, captioned, real runs only.</Ev>
          <Ev title="Building in public (15%)" tone="neutral" status="Ongoing">Posts tagged #neatHack throughout the event; links collected in the build log.</Ev>
          <Ev title="Code written during the event">Both repositories were created after 12:30 IST on 10 October 2026; every commit is dated during the event. Latest agent commit <code className="font-mono">{meta.niyam_head.slice(0, 7)}</code>.</Ev>
        </section>

        <section id="limits" className="scroll-mt-24">
          <h2 className="mb-3 text-2xl font-semibold">Honest limitations</h2>
          <Callout tone="warning">
            <ul className="list-disc space-y-1 pl-5">
              <li>One scheme so far (Ladki Bahin), built from its real orders. More schemes need their founding orders encoded as a baseline.</li>
              <li>The evaluation set is small: one real amendment, its scanned copy, two real unrelated orders and two labelled synthetic tests.</li>
              <li>Only eligibility and amounts are modelled, not required documents or procedure.</li>
              <li>Hindi and Marathi interface text was drafted with AI help and needs review by a native speaker.</li>
              <li>The official GR search uses a CAPTCHA, so Niyam only watches the public latest-orders list and never searches.</li>
            </ul>
          </Callout>
        </section>
      </Container>
    </>
  );
}
