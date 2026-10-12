import type { Metadata } from "next";
import { Info } from "@/components/info";
import { Results } from "@/components/results";
import { Badge, ButtonLink, Callout, Card, Container, ExtLink, PageHeader, Section } from "@/components/ui";
import { evals, evalsExtra, meta, pct, showcase, usd } from "@/lib/data";
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
  const v3 = evals.find((e) => e.version === "v3");
  const chaos = evalsExtra.chaos?.results?.[0];
  const repeat = evalsExtra.repeat;
  const scratch = evalsExtra["from-scratch"]?.results?.[0];
  const auto = evalsExtra.autonomy?.results ?? [];
  const realAuto = evalsExtra["real-autonomy"]?.results?.[0];
  return (
    <>
      <PageHeader guide="judges" eyebrow="For judges" title="Everything you need, one click each" intro="Niyam is an AI agent that keeps welfare eligibility rules, written as code, in sync with government orders. Below, each judging criterion is mapped to evidence you can open and check.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-muted">What</p><p className="text-sm">An agent that reads new government orders and updates the rule code itself, with tests.</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Why</p><p className="text-sm">When eligibility code drifts from the law, people are wrongly excluded or paid.</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">How</p><p className="text-sm">Seven stages, a blind verifier, a trust policy, and a checkpoint for every rule.</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">New</p><p className="text-sm">Entire checkpoints as legal provenance: every rule line shows the clause and the agent&apos;s reasoning.</p></Card>
        </div>
      </PageHeader>

      <Container className="space-y-10 py-12">
        <Card>
          <h2 className="text-xl font-semibold">The 3-minute path</h2>
          <p className="mt-1 text-sm text-muted">Open these in order. Each one-line note says what you will see.</p>
          <ol className="mt-4 space-y-3">
            {[
              ...(SITE.video ? [{ href: SITE.video, ext: true, t: "Watch the demo video", d: "The problem, the agent on a real order, Entire, cfo.ai, and three neatlogs incidents with their fixes." }] : []),
              { href: "/demo/", ext: false, t: "Replay a real run", d: "Every step the agent took on a real Marathi government order, with the document, code change, independent check and decision." },
              { href: showcase.pr_url || SITE.rulebookRepo, ext: true, t: "Open the agent's real change request (PR #2)", d: "The quotes, the verification, the confidence and the reasons, as the agent wrote them. Reviewed and merged." },
              { href: showcase.checkpoint_url || SITE.rulebookRepo, ext: true, t: "Open its Entire checkpoint", d: "The coding agent's full session behind that change: what it read, edited and tested." },
              { href: "#evidence", ext: false, t: "See the measured results", d: "Version 1 to 3 on the same six documents, with a neatlogs trace id for every run." },
            ].map((x, i) => (
              <li key={x.t} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-contrast">{i + 1}</span>
                <div>
                  {x.ext ? <ExtLink href={x.href}>{x.t}</ExtLink> : <a href={x.href} className="font-medium text-accent underline underline-offset-2">{x.t}</a>}
                  <p className="text-sm text-muted">{x.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm font-semibold">More</p>
          <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <li><ExtLink href={SITE.repo}>Agent repository</ExtLink>: the agent, API, website and evaluations.</li>
            <li><ExtLink href={SITE.rulebookRepo}>Rulebook repository</ExtLink> <Info id="rulebook" />: the rules the agent maintains, with its pull requests.</li>
            <li><ExtLink href={SITE.buildLog}>Build log</ExtLink>: what was built when, including mistakes and fixes.</li>
            <li><ExtLink href={SITE.cfoPlan}>Business plan in cfo.ai</ExtLink>: pricing, costs, revenue and runway for 36 months.</li>
          </ul>
        </Card>

        <section id="agent" className="scroll-mt-24">
          <h2 className="mb-1 text-2xl font-semibold">The agent <span className="text-base font-normal text-muted">(30%)</span></h2>
          <p className="mb-4 text-muted">A substantial task, end to end: a Marathi government order goes in; a verified, tested, sourced rule change comes out as a pull request.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Ev title="Happy path, real document">
              Job <code className="font-mono">{showcase.id}</code>: {showcase.changes.length} changes, {showcase.verdict?.cases_agree} of {showcase.verdict?.cases_valid} independent checks agree, confidence {showcase.confidence?.toFixed(2)}, {usd(showcase.cost_usd)}.{" "}
              {showcase.pr_url && <ExtLink href={showcase.pr_url}>Pull request</ExtLink>}. Trace id <Info id="trace-id" /> <code className="font-mono break-all">{showcase.trace_id}</code>.
            </Ev>
            <Ev title="Recovery from failures, injected on purpose">
              {chaos ? <>On the real amendment with a broken model output and an unusable text layer injected on purpose, Niyam repaired the output (<code className="font-mono">recovery.json_repair</code>), transcribed the PDF (<code className="font-mono">recovery.ocr_fallback</code>) and still scored {pct(chaos.outcome_accuracy as number)} on outcomes, for {usd(chaos.cost_usd)}. Trace id <code className="font-mono break-all">{chaos.trace_id}</code>.</> : "Scanned copy recovered by transcription."}{" "}
              A crashed run also resumed from its last good state without repeating work.
            </Ev>
            <Ev title="Verifier rejection, then a fix">
              Version 1: the verifier disagreed on one case, the coordinator sent a fix, and the traces showed the same case looping. Version 2 adds the missing context and a loop guard. Full story in the build log.
            </Ev>
            <Ev title="Calibrated autonomy">
              Acts alone only when a number or date changes and every check agrees. Never removes people from a scheme without a human. <Info id="autonomy" />{" "}
              {auto.length > 0 && <>On a labelled synthetic order that only adds people (age limit 60 to 62), {auto.filter((r) => r.decision === "auto_merge").length} of {auto.length} runs decided to act alone (dry run, never merged into the public rulebook). On the real amendment, which removes some people, every run asked a human.</>}
            </Ev>
            {realAuto && (
              <Ev title="A second real scheme, and a real order it may merge alone">
                On an operator&apos;s request, Niyam onboarded Sanjay Gandhi Niradhar Anudan Yojana from the real 56-page 2019 consolidated GR (<ExtLink href="https://github.com/usv240/niyam-rulebook/pull/3">PR #3</ExtLink>, 49 tests). On top of it, the real 6 July 2023 order raising assistance to Rs 1,500 was judged safe to merge alone: only amounts rise, {String(realAuto.verifier_agreement === 1 ? "every" : "most")} independent check agrees, confidence 0.98, {usd(realAuto.cost_usd)} in a dry run. Run live, the same order raised a question about widows with three or more children and went to a human instead (<ExtLink href="https://github.com/usv240/niyam-rulebook/pull/4">PR #4</ExtLink>, since merged): 2 of 4 runs would have acted alone, and the other 2 chose the safe path. Reviewing PR #3 also caught a real encoding mistake (a default that widened eligibility), fixed before merge.
              </Ev>
            )}
            {scratch && (
              <Ev title="A whole scheme from its founding order">
                Starting from an empty rulebook with only the real 28 June 2024 Marathi GR, Niyam recognised a new scheme, extracted {String(scratch.changes_extracted)} rules, wrote the rulebook and tests, and passed {Math.round((scratch.outcome_accuracy as number) * (scratch.answer_key_cases as number))} of {String(scratch.answer_key_cases)} of our hand-written baseline test citizens, which it never saw. {usd(scratch.cost_usd)}, {Math.round(scratch.latency_s)} s. Checkpoint <code className="font-mono">{String(scratch.checkpoint_id)}</code>.
              </Ev>
            )}
          </div>
          <div tabIndex={0} role="region" aria-label="Scrollable table" className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Focus area</th><th className="px-4 py-3">Where you can see it</th></tr></thead>
              <tbody>{FOCUS.map(([a, b]) => <tr key={a} className="border-t border-border align-top"><td className="px-4 py-3 font-medium">{a}</td><td className="px-4 py-3 text-muted">{b}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section id="tools" className="scroll-mt-24">
          <h2 className="mb-1 text-2xl font-semibold">neatlogs <Info id="neatlogs" />, Entire <Info id="entire" /> and cfo.ai <span className="text-base font-normal text-muted">(25%)</span></h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Ev title="neatlogs: used to improve the agent">
              One trace per job, a span per stage and per recovery. The v1 traces showed a $3.05 run with the coordinator ruling three ways on one case; the fix cut cost per document from {usd(v1?.summary.cost_usd)} to {usd(v2?.summary.cost_usd)}. Per-stage costs then showed the coding agent at 56% of spend; testing cheaper models stage by stage brought v3 to {usd(v3?.summary.cost_usd)} with no loss in quality (and rejected Haiku for extraction after it missed a real change). Every eval trace is tagged with case and version. Screenshots: <ExtLink href="https://github.com/usv240/niyam/blob/main/evidence/screens/neatlogs-trace-v1-loop.png">v1 trace looping</ExtLink>, <ExtLink href="https://github.com/usv240/niyam/blob/main/evidence/screens/neatlogs-trace-v2-showcase.png">v2 trace running straight through</ExtLink>. Incidents neatlogs flagged in our traces, each fixed: the $3.05 loop (fixed in <ExtLink href="https://github.com/usv240/niyam/commit/d5592eb">d5592eb</ExtLink>), <ExtLink href="https://github.com/usv240/niyam/blob/main/evidence/screens/neatlogs-validation-errors.png">validation errors</ExtLink> from answers cut off mid-way (retry with more room, <ExtLink href="https://github.com/usv240/niyam/commit/47527e0">47527e0</ExtLink>), and the provider&apos;s <ExtLink href="https://github.com/usv240/niyam/blob/main/evidence/screens/neatlogs-usage-limit.png">usage limit</ExtLink> (jobs pause and resume, <ExtLink href="https://github.com/usv240/niyam/commit/25caeb8">25caeb8</ExtLink>).
            </Ev>
            <Ev title="Entire: legal provenance">
              Every rule commit by the agent carries an Entire checkpoint with the coding agent&apos;s full session. Showcase checkpoint <code className="font-mono">{showcase.checkpoint_id}</code>{showcase.checkpoint_url && <> (<ExtLink href={showcase.checkpoint_url}>open</ExtLink>)</>}. Both repositories also capture our own build sessions. Browse them on Entire, no login needed: <ExtLink href="https://entire.io/gh/usv240/niyam-rulebook">rulebook</ExtLink> and <ExtLink href="https://entire.io/gh/usv240/niyam">agent</ExtLink>.
            </Ev>
            <Ev title="cfo.ai: business plan">
              cfo.ai is an AI finance planner. Its agent, Ari, built a 36-month plan with three cases from our prices and the cost per document measured in neatlogs ({usd(v3?.summary.cost_usd)}). Base case: revenue INR 2.51 crore in year 3, gross margin about 95%, cash flow positive from month 21, and INR 40.5 lakh needed on top of the starting INR 25 lakh. <ExtLink href={SITE.cfoPlan}>Open the plan in cfo.ai</ExtLink>, the <ExtLink href={SITE.cfoPlanPdf}>PDF</ExtLink>, or the <ExtLink href={SITE.businessPlan}>inputs</ExtLink>.
            </Ev>
          </div>
        </section>

        <section id="evidence" className="scroll-mt-24">
          <h2 className="mb-1 text-2xl font-semibold">Before and after, measured <Info id="eval" /></h2>
          <p className="mb-4 text-muted">Same 6 cases for every version. Small sample, real numbers.{repeat && <> Consistency check: {repeat.summary.runs} more v2 runs on the three positive cases gave outcome accuracy {pct(repeat.summary.outcome_accuracy)}, correct decisions {pct(repeat.summary.decision_correct)}, verifier agreement {pct(repeat.summary.verifier_agreement)}, at {usd(repeat.summary.cost_usd)} per document.</>}</p>
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
          <Ev title="Demo video (20%)" tone={SITE.video ? "success" : "neutral"} status={SITE.video ? "Done" : "Monday"}>Captioned, real runs only: the problem, Entire, cfo.ai, and three neatlogs incidents with their fixes. <ExtLink href={SITE.video}>Watch it</ExtLink>.</Ev>
          <Ev title="Building in public (15%)" tone="neutral" status="Ongoing">Posts tagged #neatHack throughout the event; links collected in the build log.</Ev>
          <Ev title="Code written during the event">Both repositories were created after 12:30 IST on 10 October 2026; every commit is dated during the event. Latest agent commit <code className="font-mono">{meta.niyam_head.slice(0, 7)}</code>.</Ev>
        </section>

        <section id="limits" className="scroll-mt-24">
          <h2 className="mb-3 text-2xl font-semibold">Honest limitations</h2>
          <Callout tone="warning">
            <ul className="list-disc space-y-1 pl-5">
              <li>Two schemes so far (Ladki Bahin and Sanjay Gandhi Niradhar), built from their real orders and merged after review. The second is a simplified encoding: it does not yet model which destitute categories qualify.</li>
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
