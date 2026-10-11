import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "@/components/info";
import { Card, Container, ExtLink, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Learn", description: "Plain-language explainers: welfare schemes, government orders, rules as code, AI agents, traces and checkpoints." };

const TOPIC_INFO: Record<string, string> = { scheme: "scheme", gr: "gr", "rules-as-code": "rules-as-code", agent: "agent", trace: "trace", checkpoint: "checkpoint", verify: "step-verify", human: "autonomy" };

const TOPICS: { id: string; q: string; body: React.ReactNode }[] = [
  { id: "niyam", q: "What is Niyam, in one paragraph?", body: <>Governments in India publish their welfare rules as orders, often PDF files in Marathi or Hindi. Apps, helplines and field workers then have to copy those rules by hand, and they often fall behind. Niyam is an AI helper that reads each new order, works out exactly what changed, updates one open set of rules with tests, and has a second AI check the work. A person approves anything risky. Anyone can then check their eligibility, and every answer shows the sentence of the government order it comes from.</> },
  { id: "scheme", q: "What is a welfare scheme?", body: <>A government programme that gives people money, food, services or support if they meet certain conditions, such as age, income or where they live. Those conditions are called <b>eligibility rules</b>. For example, the Ladki Bahin scheme in Maharashtra pays eligible women Rs 1,500 a month.</> },
  { id: "gr", q: "What is a GR?", body: <>A <b>Government Resolution</b> is an official order from a state government department. GRs create schemes and change their rules: raising an age limit, changing an income ceiling, adding or removing a condition. Maharashtra publishes them as PDF files, mostly in Marathi, on its <ExtLink href="https://gr.maharashtra.gov.in/">GR portal</ExtLink>. Each has an 18-digit code, for example 202407031335114330.</> },
  { id: "rules-as-code", q: "What does \"rules as code\" mean?", body: <>Writing the rules of a scheme as a small computer program instead of only as text. The program applies the rules the same way every time, can be tested with example people, and can be read by anyone. Governments in France, New Zealand, Canada and elsewhere have explored this. Niyam stores rules as readable YAML files, in the format of <ExtLink href="https://openfisca.org/">OpenFisca</ExtLink>, an open-source project, with a start date and a source for every value.</> },
  { id: "agent", q: "What is an AI agent, and how is it different from a chatbot?", body: <>A chatbot answers a question. An <b>agent</b> is given a goal and works towards it on its own: it plans steps, uses tools (reading files, running tests, opening change requests), looks at the results, and decides what to do next, including how to recover when something fails. Niyam&apos;s goal is: keep the rulebook in line with every new government order.</> },
  { id: "trace", q: "What is a trace?", body: <>A step-by-step recording of everything an agent did in one run: every AI model call, every tool, every retry, how long each took and what it cost. Niyam uses <ExtLink href="https://neatlogs.com/">neatlogs</ExtLink> for this. Traces are how we found and fixed a costly loop in version 1.</> },
  { id: "checkpoint", q: "What is a checkpoint?", body: <>When code changes, the change itself is saved in git, but the reasoning behind it usually is not. <ExtLink href="https://entire.io/">Entire</ExtLink> saves the AI agent&apos;s whole working session (what it was asked, what it read, what it tried) and links it to the code change. In Niyam, that means every rule has a record of why it says what it says.</> },
  { id: "verify", q: "How does Niyam check its own work?", body: <>A second agent, which never sees the code change, reads the government order and writes its own test people: &quot;a 65-year-old woman with an income of Rs 2 lakh should be eligible&quot;. Those people are run through the new rules. If the two agents disagree, a coordinator rereads the clause and either fixes the rules or asks a human.</> },
  { id: "human", q: "When does Niyam ask a human?", body: <>Whenever a clause is unclear, the two agents still disagree, confidence is below 0.90, or a change would remove people from a scheme. Only simple changes, such as a new amount or date with every check agreeing, are merged automatically. See the <Link href="/trust/" className="text-accent underline underline-offset-2">trust policy</Link>.</> },
  { id: "lessons", q: "Why does this matter? Lessons from Robodebt and Samagra Vedika", body: <>In Australia, the Robodebt scheme used code that did not match the law and sent unlawful debt notices to hundreds of thousands of people; it led to a Royal Commission. In Telangana, the Samagra Vedika system cancelled more than 1.8 million food cards, and officials often deferred to the machine. In both cases, the people affected could not see why the system decided as it did. Niyam is built the other way round: every rule is open, sourced, tested and explained.</> },
];

const GLOSSARY: [string, string][] = [
  ["Agent", "Software that takes a goal, plans steps, uses tools and checks its own work."],
  ["API", "A way for other software to ask Niyam questions over the internet."],
  ["API key", "A secret code that identifies an app using the API."],
  ["Boundary case", "A test exactly at a limit, such as age 65 when the limit is 65."],
  ["Checkpoint", "The saved reasoning behind a code change (Entire)."],
  ["Citation", "The exact words, page and clause of a government order that a rule comes from."],
  ["Confidence", "Niyam's score from 0 to 1 for how sure it is that a change is correct."],
  ["Eligibility", "Whether a person meets the conditions of a scheme."],
  ["Encode", "Turn a rule written in words into rule code."],
  ["Evaluation", "A test of the whole agent on documents with known correct answers."],
  ["GR", "Government Resolution: an official order from a state department."],
  ["MCP", "Model Context Protocol: a standard way for AI assistants to use tools."],
  ["OCR or transcription", "Turning a scanned page (an image) into text."],
  ["Parameter", "A number or list in a rule that can change over time, such as the maximum age."],
  ["Pull request", "A proposed change to code that can be reviewed before it is accepted."],
  ["Rulebook", "The collection of all encoded rules, with tests and sources."],
  ["Trace", "A step-by-step record of an agent run (neatlogs)."],
  ["Triage", "Quickly deciding whether a document matters."],
  ["Verifier", "The independent agent that checks new rules against the law."],
  ["Webhook", "A message Niyam can send to your system when a rule changes."],
];

export default function Learn() {
  return (
    <>
      <PageHeader guide="learn" eyebrow="Learn" title="Understand Niyam in ten minutes, with no background" intro="Short explainers in plain words. Start anywhere." />
      <Container className="grid gap-10 py-12 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Topics" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="space-y-1 text-sm">
            {TOPICS.map((t) => <li key={t.id}><a href={`#${t.id}`} className="block rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-text">{t.q}</a></li>)}
            <li><a href="#glossary" className="block rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-text">Glossary</a></li>
            <li><a href="#references" className="block rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-text">References</a></li>
          </ul>
        </nav>
        <div className="space-y-6">
          {TOPICS.map((t) => (
            <Card key={t.id}>
              <h2 id={t.id} className="flex scroll-mt-24 items-center gap-2 text-xl font-semibold">{t.q} {TOPIC_INFO[t.id] && <Info id={TOPIC_INFO[t.id]} />}</h2>
              <p className="mt-3 max-w-prose text-muted">{t.body}</p>
            </Card>
          ))}
          <Card>
            <h2 id="glossary" className="scroll-mt-24 text-xl font-semibold">Glossary</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {GLOSSARY.map(([k, v]) => <div key={k}><dt className="font-medium">{k}</dt><dd className="text-sm text-muted">{v}</dd></div>)}
            </dl>
          </Card>
          <Card>
            <h2 id="references" className="scroll-mt-24 text-xl font-semibold">References</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li><ExtLink href="https://arxiv.org/abs/2103.03198">Merigoux, Chataing, Protzenko, Catala: A Programming Language for the Law, 2021</ExtLink>: encoding French benefits found a bug in the official implementation.</li>
              <li><ExtLink href="https://oecd-opsi.org/publications/cracking-the-code/">OECD OPSI, Cracking the Code: Rulemaking for humans and machines, 2020</ExtLink></li>
              <li><ExtLink href="https://arxiv.org/html/2512.04408v1">Executable Governance for AI: Translating Policies into Rules Using LLMs</ExtLink></li>
              <li><ExtLink href="https://www.aljazeera.com/economy/2024/1/24/how-an-algorithm-denied-food-to-thousands-of-poor-in-indias-telangana">Al Jazeera and Pulitzer Center on Samagra Vedika, 2024</ExtLink></li>
              <li><ExtLink href="https://robodebt.royalcommission.gov.au/">Royal Commission into the Robodebt Scheme, 2023</ExtLink></li>
              <li><ExtLink href="https://openfisca.org/">OpenFisca</ExtLink> and <ExtLink href="https://www.policyengine.org/">PolicyEngine</ExtLink></li>
            </ol>
          </Card>
        </div>
      </Container>
    </>
  );
}
