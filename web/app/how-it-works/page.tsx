import type { Metadata } from "next";
import { Info } from "@/components/info";
import { Pipeline, STEPS } from "@/components/pipeline";
import { Badge, ButtonLink, Card, Container, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "How it works", description: "Each step of the Niyam agent explained: what happens, why, what can go wrong and how it recovers." };

const DETAIL: Record<string, { what: string; why: string; fails: string; example: string }> = {
  watch: {
    what: "Every 15 minutes, Niyam reads the public list of the latest Maharashtra government orders and downloads new ones from departments that run welfare schemes.",
    why: "Orders appear without notice. A person checking by hand will eventually miss one.",
    fails: "The website times out or returns errors: Niyam retries with growing waits, marks the source as degraded, and tries again next cycle. If a source ever asks for a CAPTCHA, Niyam stops and marks it blocked. It never gets around a CAPTCHA.",
    example: "The live list read today contained orders from the Skill Development and Environment departments, which Niyam correctly closed as not relevant for less than one cent each.",
  },
  triage: {
    what: "A small, fast model reads the first three pages and decides whether the order changes eligibility or benefits of a covered scheme.",
    why: "Most orders are about budgets, committees or other departments. Skipping them early keeps the cost near zero.",
    fails: "If the PDF has no text on its first pages (a scan), triage reads the PDF images instead.",
    example: "A synthetic test order that only extended an application deadline, and hid an instruction telling AI systems to raise the income limit, was closed as not relevant. The hidden instruction was ignored.",
  },
  extract: {
    what: "A stronger model reads the whole order next to the current rules and lists every change, each with the exact quote, page and clause, and whether it widens or narrows eligibility.",
    why: "Everything after this depends on reading the law correctly, word for word.",
    fails: "Marathi PDFs often have damaged text layers (the vowel sign ि comes out as ह). Niyam checks quotes on a consonant skeleton, requires every number to match exactly, rejects invented quotes, and asks the model to fix them once. Scanned orders are transcribed first.",
    example: "From the 3 July 2024 amendment it found all six eligibility changes, skipped five procedural ones, and raised two genuine questions for a human.",
  },
  encode: {
    what: "Claude Code works in its own copy of the rulebook. It adds dated values (never overwriting history), ends old conditions and starts new ones, writes test citizens at every limit, and runs the tests until they pass.",
    why: "This is where the law becomes something a computer can apply the same way every time.",
    fails: "Failing tests are fed back for another attempt. Edits outside the rule folders are reverted. The coding agent never sees the raw PDF, only the checked change list, so instructions hidden in a document cannot reach a tool-using agent.",
    example: "The amendment produced 20 new test citizens on top of the 25 baseline ones, all passing on the first attempt.",
  },
  verify: {
    what: "A separate agent, using a different model, reads the order and the old rules but never sees the code change. It writes its own test citizens with expected results, and those are run against the new rules.",
    why: "If the checker saw the change, it would tend to agree with it. Writing expectations from the law alone is a real second opinion.",
    fails: "Invalid test people are skipped and counted. Any disagreement goes to Resolve.",
    example: "In version 2, all 15 of the verifier's independent test citizens agreed with the new rules.",
  },
  resolve: {
    what: "A coordinator rereads the disputed clause and decides: the encoder is wrong (send a precise fix), the verifier is wrong (accept with a reason), or the clause is genuinely ambiguous (ask a human).",
    why: "Some clauses can be read two ways. Guessing could stop people being paid.",
    fails: "A disagreement that survives a fix is escalated instead of retried. We added this after the version 1 traces showed one case going round three times.",
    example: "Whether the original order's \"pay the difference\" rule still applies after the amendment is now flagged as a question for a human.",
  },
  publish: {
    what: "Niyam commits the change (Entire links the coding agent's full session as a checkpoint), opens a pull request with quotes, verification, confidence and reasons, and merges on its own only when the trust policy allows.",
    why: "Every change is visible and reviewable, and its reasoning can be audited months later.",
    fails: "If GitHub is unreachable the job keeps its state and resumes later.",
    example: "The amendment went to human review, because one change (\"Rs 1,500 or more\" instead of \"more than Rs 1,500\") removes some people from the scheme.",
  },
};

export default function HowItWorks() {
  return (
    <>
      <PageHeader guide="how-it-works" eyebrow="How it works" title="From a government order to correct, verified rules" intro={<>Niyam is an AI agent <Info id="agent" />: it takes a goal, plans steps, uses tools, checks its own work, and recovers when something fails. Here is every step, with what can go wrong.</>}>
        <Pipeline />
      </PageHeader>
      <Container className="py-12">
        <div className="space-y-6">
          {STEPS.map((s, i) => {
            const d = DETAIL[s.id];
            return (
              <Card key={s.id} className="scroll-mt-24" >
                <div id={s.id} className="flex flex-wrap items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><s.Icon className="h-5 w-5" aria-hidden /></span>
                  <h2 className="text-xl font-semibold">{i + 1}. {s.label}</h2>
                  <Info id={`step-${s.id}`} />
                </div>
                <dl className="mt-4 grid gap-4 md:grid-cols-2">
                  <div><dt className="text-sm font-semibold">What happens</dt><dd className="mt-1 text-sm text-muted">{d.what}</dd></div>
                  <div><dt className="text-sm font-semibold">Why it is needed</dt><dd className="mt-1 text-sm text-muted">{d.why}</dd></div>
                  <div><dt className="flex items-center gap-2 text-sm font-semibold">What can go wrong <Badge tone="warning">Recovery</Badge></dt><dd className="mt-1 text-sm text-muted">{d.fails}</dd></div>
                  <div><dt className="flex items-center gap-2 text-sm font-semibold">From a real run <Badge tone="success">Measured</Badge></dt><dd className="mt-1 text-sm text-muted">{d.example}</dd></div>
                </dl>
              </Card>
            );
          })}
        </div>
      </Container>

      <Section eyebrow="Under the hood" title="Architecture" intro="The simple version first. The technical detail is one click away.">
        <Card>
          <ol className="grid gap-3 text-sm md:grid-cols-5">
            {["Official sources and uploads", "Agent worker on AWS (state machine, saved after every step)", "Claude models and Claude Code", "Rulebook repository on GitHub (Entire checkpoints)", "Website, API and MCP server"].map((x, k) => (
              <li key={x} className="rounded-xl border border-border bg-bg p-3"><span className="text-xs font-semibold text-accent">{k + 1}</span><p className="mt-1">{x}</p></li>
            ))}
          </ol>
          <details className="mt-5 rounded-xl border border-border bg-bg p-4">
            <summary className="cursor-pointer font-semibold">Technical detail</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
              <li>Python 3.12 orchestrator: a persisted state machine in SQLite. A crash resumes from the last completed state; a failed job retries from its last good state.</li>
              <li>Every stage output is validated against a schema (structured outputs). Invalid output gets one repair attempt; overload falls back to another model.</li>
              <li>neatlogs traces: one trace per job, a span per stage, recovery events as their own spans, tokens and cost per call.</li>
              <li>Encoder: Claude Code headless in a git worktree per job, tools limited to file edits and the rulebook test command, no MCP servers. Entire hooks capture the session; <code>commit_linking: always</code> links it to the commit as a checkpoint.</li>
              <li>Rulebook: YAML in OpenFisca parameter format, dated conditions, a whitelisted expression evaluator (no arbitrary code), validation and tests in CI.</li>
              <li>Website: static Next.js export with the same rules engine ported to the browser, so eligibility checks need no server.</li>
            </ul>
          </details>
        </Card>
        <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/demo/">Replay a real run</ButtonLink><ButtonLink href="/trust/" variant="secondary">Trust policy</ButtonLink></div>
      </Section>
    </>
  );
}
