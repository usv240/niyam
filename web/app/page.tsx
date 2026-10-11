import { ArrowRight, BookOpenCheck, CheckCircle2, XCircle, Bot, Building2, Code2, ExternalLink, FileWarning, Landmark, Scale, Users } from "lucide-react";
import Link from "next/link";
import { HeroVisual } from "@/components/hero-visual";
import { Info } from "@/components/info";
import { Pipeline } from "@/components/pipeline";
import { Results } from "@/components/results";
import { MobileCta } from "@/components/mobile-cta";
import { Badge, ButtonLink, Card, Container, ExtLink, Section, Stat } from "@/components/ui";
import { evals, pct, showcase, usd } from "@/lib/data";
import { plainAffects, plainChange } from "@/lib/plain";
import { SITE } from "@/lib/site";

const PROBLEMS = [
  {
    Icon: FileWarning,
    title: "When code drifts from the law, people lose food",
    body: "In Telangana, an eligibility algorithm cancelled more than 1.8 million food security cards between 2014 and 2019. A widow lost her rations after the system confused her late husband, a rickshaw puller, with a car owner. Her case reached the Supreme Court.",
    source: "Al Jazeera and Pulitzer Center, 2024",
    href: "https://www.aljazeera.com/economy/2024/1/24/how-an-algorithm-denied-food-to-thousands-of-poor-in-indias-telangana",
  },
  {
    Icon: Landmark,
    title: "Huge money, low reach",
    body: "India spends about $210 billion a year on welfare and more than 800 million people are eligible, yet only about 40 percent manage to apply. Every app that answers \"am I eligible?\" depends on rules that are kept up to date by hand.",
    source: "Acumen, Haqdarshak case study",
    href: "https://acumen.org/case-studies/haqdarshak/",
  },
  {
    Icon: Scale,
    title: "Rules change, enforcement lags",
    body: "Maharashtra later removed 92 lakh women from one scheme after verification, after about Rs 14,000 crore had already been paid. Rules such as the income ceiling existed on paper; the systems applying them did not keep up.",
    source: "Business Today, July 2026",
    href: "https://www.businesstoday.in/india/story/92-lakh-beneficiaries-removed-from-maharashtras-ladki-bahin-yojana-after-verification-report-542573-2026-07-13",
  },
];

const AUDIENCES = [
  { Icon: Users, title: "People checking eligibility", body: "Answer a few questions and see which schemes you may qualify for, with the reason and the official source, in English, Hindi or Marathi.", cta: "Check eligibility", href: "/check/" },
  { Icon: Building2, title: "NGOs and field workers", body: "Explain every answer with the official clause, and see exactly when and why a rule changed.", cta: "Explore the rules", href: "/explore/" },
  { Icon: Code2, title: "Developers and apps", body: "One API call returns eligibility with sources. Plug it into your app, helpline or chatbot.", cta: "Get an API key", href: "/developers/" },
  { Icon: Bot, title: "AI assistants", body: "Add Niyam as an MCP tool so your assistant answers with current rules instead of guessing.", cta: "Add the MCP server", href: "/developers/#mcp" },
];

const TOOLS = [
  { name: "neatlogs", plain: "A flight recorder for AI agents.", role: "Records every step of every run. We used the traces to find a costly loop in version 1, fix it, and prove the fix with numbers." },
  { name: "Entire", plain: "A memory of how code was written.", role: "Saves the agent's full reasoning with every rule change, so anyone can ask \"why does this rule say this?\" and see the session behind it." },
  { name: "cfo.ai", plain: "An AI finance planner.", role: "Built our pricing, costs, revenue and runway plan from the real cost per document measured in neatlogs." },
  { name: "Claude", plain: "The AI models.", role: "Read Marathi government orders, write and test rule code (Claude Code), and check the result independently." },
  { name: "OpenFisca format", plain: "An open standard for laws as code.", role: "Every limit is stored with its start date and its source, so history is never overwritten." },
  { name: "AWS", plain: "Cloud servers.", role: "Runs the watcher and the API around the clock." },
];

const FAQ = [
  ["What is a GR?", "A Government Resolution: an official order from a state government department. GRs create schemes and change their rules. Maharashtra publishes them as PDFs, mostly in Marathi."],
  ["What does \"rules as code\" mean?", "Writing the rules of a scheme as a small computer program, so a computer applies them exactly the same way every time and anyone can test them."],
  ["Is Niyam an official government service?", "No. It is an independent project built at a hackathon. Final eligibility is always decided by the government department."],
  ["How do I know Niyam is right?", "Every rule links to its source clause. Every change is tested, and a second agent that never sees the change checks it against the law. When anything is unclear, or a change would remove people from a scheme, a human decides."],
  ["Does Niyam collect personal data?", "No. The eligibility checker needs facts like age and income, never names, Aadhaar or phone numbers. The API rejects anything that looks like an ID number."],
  ["Which schemes are covered?", "This first version covers Mukhyamantri Majhi Ladki Bahin Yojana in Maharashtra, built from its real government orders. The design scales to any scheme and state."],
  ["Can I use it in my own app or AI assistant?", "Yes. Create a free API key on the Developers page, or add the MCP server to Claude, Cursor or any MCP client."],
  ["What happens when two orders disagree, or a clause is unclear?", "Niyam applies clear rules first, such as a correction overriding the original. If it is still unclear, it writes a plain-English question with both readings and waits for a human."],
];

const START_PATHS = [
  { href: "/check/", n: "1", title: "I want to know if I can get money", hi: "क्या मुझे योजना का लाभ मिल सकता है?", body: "Answer a few questions in English, Hindi or Marathi. See which schemes you may qualify for, and why. About 2 minutes.", cta: "Check eligibility" },
  { href: "/how-it-works/", n: "2", title: "I want to understand how Niyam works", hi: "नियम कैसे काम करता है?", body: "Seven simple steps, from a new government order to correct rules, with a real example at each step.", cta: "See how it works" },
  { href: "/judges/", n: "3", title: "I am a judge or reviewer", hi: "जज और समीक्षकों के लिए", body: "A 3-minute path through the evidence: a real run, the real change request, and the measured results.", cta: "Go to the judges page" },
];

export default function Home() {
  const v = showcase.verdict;
  const v3 = evals.find((e) => e.version === "v3") ?? evals[evals.length - 1];
  const age = showcase.changes.find((c) => c.target === "age_max") ?? showcase.changes[0];
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
              An AI agent for public welfare <Info id="agent" />
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">When the law changes, the code changes with it.</h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Niyam reads every new government order (called a GR) <Info id="gr" /> and updates the welfare eligibility rules, written as code <Info id="rules-as-code" />, by itself.
              Every rule links back to the exact sentence of the order it came from.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/demo/">Watch it work <ArrowRight className="h-4 w-4" aria-hidden /></ButtonLink>
              <ButtonLink href="/try/" variant="secondary">Try it with your own document</ButtonLink>
            </div>
            <p className="mt-6 flex items-start gap-2.5 text-sm text-muted">
              <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              <span>
                Latest real run: Ladki Bahin amendment, {showcase.changes.length} changes found, {v?.cases_agree} of {v?.cases_valid} independent checks agree.{" "}
                <Info id="status-line" />
              </span>
            </p>
          </div>
          <HeroVisual />
        </Container>
      </section>

      {/* Start here: three paths for three kinds of visitor */}
      <section aria-labelledby="start-here" className="border-b border-border">
        <Container className="py-10">
          <h2 id="start-here" className="text-xl font-semibold">New here? Start with what you need</h2>
          <p className="mt-1 text-sm text-muted">Pick one. Every page has an About this page box, and i buttons that explain each term. Use EN, हिं or मरा at the top to read help in English, Hindi or Marathi.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {START_PATHS.map((x) => (
              <Link key={x.href} href={x.href} className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-accent">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-contrast">{x.n}</span>
                <span className="mt-3 font-semibold">{x.title}</span>
                <span lang="hi" className="deva text-sm text-muted">{x.hi}</span>
                <span className="mt-2 flex-1 text-sm text-muted">{x.body}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">{x.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Proof in numbers */}
      <section aria-label="Results in numbers" className="border-b border-border bg-surface">
        <Container className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
          <Stat value={<>{usd(v3?.summary.cost_usd)} <Info id="cost-per-order" /></>} label="average AI cost per government order, down from $0.88" source="Measured on 6 test documents" href="/judges/#evidence" />
          <Stat value={pct(v3?.summary.outcome_accuracy)} label="of test citizens get the right answer, every version since v2" source="Evaluation results" href="/judges/#evidence" />
          <Stat value={<>25 of 25 <Info id="test-citizen" /></>} label="hand-written test citizens correct after the agent rebuilt a whole scheme from its founding order" source="From-scratch run" href="/judges/#agent" />
          <Stat value="2" label="real Maharashtra schemes, built from their real Marathi orders" source="Explore the rules" href="/explore/" />
        </Container>
      </section>

      {/* Problem */}
      <Section
        id="problem"
        eyebrow="The problem"
        title="Rules live in PDFs. Decisions are made by code. Nobody keeps them in sync."
        intro="Eligibility for welfare is decided by software: portals, field-worker apps, helplines and chatbots. The law behind it is published as PDF orders that change often. When the code falls behind the law, real people are wrongly excluded or wrongly paid."
      >
        <div className="grid gap-5 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <Card key={p.title} className="flex flex-col">
              <p.Icon className="h-6 w-6 text-accent" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{p.body}</p>
              <a href={p.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                {p.source} <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">Niyam is not about any party or government. Rules change for good reasons. The problem is that the change reaches the code late, or never, and nobody can check it.</p>
      </Section>

      {/* What it is */}
      <Section id="what" eyebrow="What Niyam is" title="An agent that keeps the rules correct, and proves it." className="border-t border-border bg-surface/50">
        <div className="mb-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-danger/25 bg-danger-soft/40 p-6">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-danger"><XCircle className="h-4 w-4" aria-hidden /> Today, without Niyam</p>
            <ol className="mt-4 space-y-3 text-sm">
              {["A department publishes a GR as a Marathi PDF.", "Someone has to notice it, read it and find what changed.", "Each app and helpline updates its own rules by hand, weeks later, or never.", "Nobody can see which clause an answer came from, so mistakes are hard to challenge."].map((x, i) => (
                <li key={x} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bg text-xs font-semibold text-danger">{i + 1}</span><span className="text-text">{x}</span></li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-success/30 bg-success-soft/50 p-6">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-success"><CheckCircle2 className="h-4 w-4" aria-hidden /> With Niyam</p>
            <ol className="mt-4 space-y-3 text-sm">
              {["Niyam spots the new GR on the official list within 15 minutes.", "It quotes each changed clause and checks every quote against the PDF.", "It updates one open rulebook with tests; a second agent verifies it against the law.", "Every answer shows its clause, and every line shows who wrote it and why."].map((x, i) => (
                <li key={x} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bg text-xs font-semibold text-success">{i + 1}</span><span className="text-text">{x}</span></li>
              ))}
            </ol>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Card><h3 className="font-semibold">What it does</h3><p className="mt-2 text-sm text-muted">Watches official sources for new government orders, finds the clauses that change who is eligible, and updates the rule code with tests, without a person watching.</p></Card>
          <Card><h3 className="font-semibold">Who it helps</h3><p className="mt-2 text-sm text-muted">Anyone who answers &quot;am I eligible?&quot;: helplines, field workers, NGOs, apps and chatbots. They all get correct, current rules from one open place.</p></Card>
          <Card><h3 className="font-semibold">What makes it different</h3><p className="mt-2 text-sm text-muted">It proves its work. A second agent checks every change against the law, every line of code links to its clause, and the agent&apos;s reasoning is saved with the change.</p></Card>
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" eyebrow="How it works" title="Seven steps, from a government order to correct rules" intro="Each step is recorded in a trace, so you can see exactly what happened, including mistakes and recoveries.">
        <Pipeline />
        <div className="mt-8"><ButtonLink href="/how-it-works/" variant="secondary">See every step explained <ArrowRight className="h-4 w-4" aria-hidden /></ButtonLink></div>
      </Section>

      {/* Live proof */}
      <Section id="proof" eyebrow="Live proof" title="This is a real run, not a mock-up" intro="The real 3 July 2024 amendment to the Ladki Bahin scheme, in Marathi, processed end to end by Niyam." className="border-t border-border bg-surface/50">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Clause {age.citation.clause}, page {age.citation.page}</Badge>
              <Badge tone="success">Quote verified in the document</Badge>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Original government order (Marathi) <Info id="original-translation" /></p>
            <blockquote lang="mr" className="deva mt-1 border-l-4 border-accent pl-4 text-lg">{age.citation.quote_original}</blockquote>
            <p className="mt-2 pl-5 text-sm text-muted"><span className="font-semibold text-text">English translation: </span>{age.citation.quote_english}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {showcase.changes.slice(0, 6).map((c) => (
                <div key={c.change_id} className="rounded-xl border border-border bg-bg p-3 text-sm">
                  <p className="font-medium">{c.summary}</p>
                  <p className="mt-1 text-xs text-muted">{plainChange(c.change_type)}: {plainAffects(c.affects).toLowerCase()}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted">Independent verifier <Info id="step-verify" /></p>
              <p className="text-3xl font-semibold">{v?.cases_agree} of {v?.cases_valid}</p>
              <p className="text-sm text-muted">test citizens agree with the new rules</p>
            </div>
            <div>
              <p className="text-sm text-muted">Confidence <Info id="confidence" /></p>
              <p className="text-3xl font-semibold">{showcase.confidence?.toFixed(2)}</p>
              <p className="text-sm text-muted">Sent to a human because one change removes people from the scheme; reviewed and merged <Info id="autonomy" /></p>
            </div>
            <p className="text-sm text-muted">Cost of this run: {usd(showcase.cost_usd)}</p>
            <div className="mt-auto flex flex-col gap-2">
              {showcase.pr_url && <a className="inline-flex items-center justify-between rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium hover:bg-surface-2" href={showcase.pr_url} target="_blank" rel="noreferrer">See the change request <Info id="pull-request" /></a>}
              {showcase.checkpoint_url && <a className="inline-flex items-center justify-between rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium hover:bg-surface-2" href={showcase.checkpoint_url} target="_blank" rel="noreferrer">See the reasoning (checkpoint) <Info id="checkpoint" /></a>}
              <Link className="inline-flex items-center justify-between rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium hover:bg-surface-2" href="/demo/">Replay every step <Info id="trace" /></Link>
            </div>
          </Card>
        </div>
      </Section>

      {/* Results */}
      <Section id="results" eyebrow="Measured, not claimed" title="We test the whole agent on documents with known answers" intro={<>Version 1 worked, but its traces showed a costly loop. Version 2 fixed what the traces revealed. Version 3 used cheaper models wherever measurement showed no loss, cutting cost per document from $0.88 to $0.13. It also encoded the whole scheme from its founding order and passed all 25 of our hand-written test citizens. <Info id="eval" /></>}>
        <Card><Results /></Card>
        <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/judges/#evidence" variant="secondary">See every run and trace</ButtonLink></div>
      </Section>

      {/* Audiences */}
      <Section id="who" eyebrow="Who it is for" title="One source of truth, many ways to use it" className="border-t border-border bg-surface/50">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <Card key={a.title} className="flex flex-col">
              <a.Icon className="h-6 w-6 text-accent" aria-hidden />
              <h3 className="mt-4 font-semibold">{a.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{a.body}</p>
              <Link href={a.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">{a.cta} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </Card>
          ))}
        </div>
      </Section>

      {/* Built with */}
      <Section id="built-with" eyebrow="Built with" title="The tools that make Niyam trustworthy">
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Tool</th><th className="px-4 py-3">In plain words</th><th className="hidden px-4 py-3 sm:table-cell">What it does in Niyam</th></tr>
            </thead>
            <tbody>
              {TOOLS.map((t) => (
                <tr key={t.name} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-semibold">{t.name}</td>
                  <td className="px-4 py-3 text-muted">{t.plain}<span className="mt-1 block sm:hidden">{t.role}</span></td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{t.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Trust */}
      <Section id="trust" eyebrow="Trust and limits" title="What Niyam will and will not do" className="border-t border-border bg-surface/50">
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h3 className="flex items-center gap-2 font-semibold"><BookOpenCheck className="h-5 w-5 text-success" aria-hidden /> Will</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
              <li>Act on its own only for simple, verified changes, such as an amount or a date.</li>
              <li>Ask a human whenever a clause is unclear, or a change would remove people from a scheme.</li>
              <li>Show the source clause and the reasoning for every rule.</li>
              <li>Keep every past version of every rule, so any date can be checked.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="flex items-center gap-2 font-semibold"><FileWarning className="h-5 w-5 text-danger" aria-hidden /> Will not</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
              <li>Decide anyone&apos;s application. The government department decides.</li>
              <li>Ask for names, Aadhaar numbers or phone numbers.</li>
              <li>Get around a CAPTCHA or a login on any government website.</li>
              <li>Follow instructions hidden inside documents. We test this on purpose.</li>
            </ul>
          </Card>
        </div>
        <div className="mt-6"><ButtonLink href="/trust/" variant="secondary">Read the full trust policy</ButtonLink></div>
      </Section>

      {/* Developers teaser */}
      <Section id="developers" eyebrow="For developers" title="Eligibility with sources, in one call" intro={<>Free API keys, a live event stream for agent runs, and an MCP server for AI assistants. <Info id="api-key" /></>}>
        <pre tabIndex={0} aria-label="Code example" className="overflow-x-auto rounded-2xl border border-border bg-surface p-5 font-mono text-[13px] leading-6">
{`curl -X POST $NIYAM_API/api/v1/eligibility \\
  -H "Authorization: Bearer $NIYAM_KEY" \\
  -d '{"age": 34, "gender": "female", "annual_family_income": 240000}'`}
        </pre>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/developers/">Get an API key</ButtonLink>
          <ButtonLink href="/developers/#reference" variant="secondary">Read the API reference</ButtonLink>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" eyebrow="Questions" title="Questions a first-time visitor asks" className="border-t border-border bg-surface/50">
        <div className="divide-y divide-border rounded-2xl border border-border bg-bg">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span className="text-muted transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-3 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">More in <Link href="/learn/" className="text-accent underline underline-offset-2">Learn</Link>, written for people with no technical background. Evidence for judges is on <Link href="/judges/" className="text-accent underline underline-offset-2">one page</Link>.</p>
      </Section>

      {/* References */}
      <Section id="references" eyebrow="References" title="Sources">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
          <li><ExtLink href="https://www.aljazeera.com/economy/2024/1/24/how-an-algorithm-denied-food-to-thousands-of-poor-in-indias-telangana">Al Jazeera and Pulitzer Center, How an algorithm denied food to thousands of poor in India&apos;s Telangana (2024)</ExtLink></li>
          <li><ExtLink href="https://www.amnesty.org/en/latest/research/2024/04/entity-resolution-in-indias-welfare-digitalization/">Amnesty International, Use of Entity Resolution in India (2024)</ExtLink></li>
          <li><ExtLink href="https://acumen.org/case-studies/haqdarshak/">Acumen, Haqdarshak case study</ExtLink></li>
          <li><ExtLink href="https://www.businesstoday.in/india/story/92-lakh-beneficiaries-removed-from-maharashtras-ladki-bahin-yojana-after-verification-report-542573-2026-07-13">Business Today, 92 lakh beneficiaries removed after verification (2026)</ExtLink></li>
          <li><ExtLink href="https://arxiv.org/abs/2103.03198">Merigoux, Chataing, Protzenko, Catala: A Programming Language for the Law (2021)</ExtLink></li>
          <li><ExtLink href="https://oecd-opsi.org/publications/cracking-the-code/">OECD OPSI, Cracking the Code: Rulemaking for humans and machines (2020)</ExtLink></li>
          <li><ExtLink href="https://openfisca.org/">OpenFisca, rules as code</ExtLink></li>
          <li><ExtLink href="https://gr.maharashtra.gov.in/Site/Upload/Government%20Resolutions/Marathi/202406281814018230.pdf">Government of Maharashtra, GR 202406281814018230 (28 June 2024)</ExtLink> and <ExtLink href="https://gr.maharashtra.gov.in/Site/Upload/Government%20Resolutions/Marathi/202407031335114330.pdf">GR 202407031335114330 (3 July 2024)</ExtLink></li>
        </ol>
        <p className="mt-6 text-xs text-muted">Built in 56 hours at neatHack 2026. Source code: <ExtLink href={SITE.repo}>usv240/niyam</ExtLink>. Rulebook: <ExtLink href={SITE.rulebookRepo}>usv240/niyam-rulebook</ExtLink>.</p>
      </Section>
      <MobileCta />
      <div className="h-16 lg:hidden" aria-hidden />
    </>
  );
}
