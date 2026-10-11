import type { Metadata } from "next";
import { Info } from "@/components/info";
import { Badge, Callout, Card, Container, ExtLink, PageHeader } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Trust and limits", description: "When Niyam acts alone, when it asks a human, what it never does, and how your data is handled." };

const POLICY: [string, string, "success" | "warning" | "danger"][] = [
  ["Apply the change by itself", "Only a number or a date changes, nobody loses eligibility, every quote is found in the order, every independent test agrees, and confidence is 0.90 or more.", "success"],
  ["Ask a person to review first", "A condition is added, removed or reworded, a sentence could be read two ways, or confidence is from 0.70 up to (not including) 0.90.", "warning"],
  ["Stop and ask a question", "The two agents still disagree, confidence is below 0.70, or the run reaches its cost limit.", "danger"],
];

export default function Trust() {
  return (
    <>
      <PageHeader guide="trust" eyebrow="Trust and limits" title="An agent you can trust to run without watching, and when it will not act alone" intro="Wrongly removing someone from a welfare scheme causes real harm. Niyam is built to be fast for simple changes and careful for everything else." />
      <Container className="space-y-8 py-12">
        <Card>
          <h2 className="flex items-center gap-2 text-xl font-semibold">When Niyam acts alone <Info id="autonomy" /></h2>
          <p className="mt-2 text-sm text-muted">Two AI agents work on every change: one reads the government order and proposes the rule change; the other, which never sees that proposal, checks it against the law by testing imaginary people. Every rule change is first written as a proposal. Applying it to the official rulebook is called merging <Info id="merge" />. Confidence <Info id="confidence" /> is Niyam&apos;s own score from 0 to 1 for how sure it is that the change matches the law.</p>
          <ul className="mt-4 space-y-3">
            {POLICY.map(([a, b, t]) => (
              <li key={a} className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-4 sm:flex-row sm:items-start">
                <Badge tone={t}>{a}</Badge>
                <p className="text-sm text-muted">{b}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">Hard rules on top: a change that removes people from a scheme always goes to a human. Uploaded documents run on a test copy and are never merged.</p>
          <p className="mt-3 text-sm text-muted"><span className="font-semibold text-text">So far, on real government orders:</span> all 4 change requests went to a person first. 3 were merged after review (<ExtLink href="https://github.com/usv240/niyam-rulebook/pull/2">#2</ExtLink>, <ExtLink href="https://github.com/usv240/niyam-rulebook/pull/3">#3</ExtLink>, <ExtLink href="https://github.com/usv240/niyam-rulebook/pull/4">#4</ExtLink>) and 1 was replaced by a better version. The real 2023 order that only raised payments was cleared to apply by itself in 2 of 3 runs; the third asked a person first, which is the safe direction. A labelled test order that only added people was cleared in 4 of 4 runs.</p>
        </Card>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold">What Niyam never does</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
              <li>Decide anyone&apos;s application. The government department decides.</li>
              <li>Ask for or store names, Aadhaar numbers, phone numbers or addresses.</li>
              <li>Get around a CAPTCHA <Info id="captcha" /> or a login on a government website.</li>
              <li>Obey instructions hidden inside a document <Info id="prompt-injection" />. The coding agent only ever sees a checked list of changes, never the raw document. We tested this with a hidden instruction to raise the income limit: Niyam ignored it and changed nothing (<ExtLink href="https://github.com/usv240/niyam/tree/main/evals/cases/synthetic-injection">the test document</ExtLink>, <ExtLink href="https://github.com/usv240/niyam/blob/main/evals/results/v3.json">the result</ExtLink>).</li>
              <li>Edit or delete history. Old values stay, so the rules on any past date can be checked.</li>
            </ul>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Your data</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
              <li>The eligibility checker on this site runs in your browser. Nothing is sent.</li>
              <li>The API rejects values that look like ID or phone numbers, and stores only request counts.</li>
              <li>Uploaded documents are processed on a test copy <Info id="sandbox" /> and should not contain personal information.</li>
              <li>API keys are stored only in a scrambled form (a hash) that cannot be turned back into the key.</li>
              <li>No cookies, no tracking.</li>
            </ul>
          </Card>
        </div>
        <Callout tone="info" title="Found a wrong rule?">
          Every rule shows its source, so you can check it against the law yourself. To report a mistake, <ExtLink href={`${SITE.rulebookRepo}/issues/new?title=Wrong%20rule%3A%20&body=Scheme%3A%0ARule%3A%0AWhat%20the%20government%20order%20says%20(with%20page)%3A%0A`}>fill in this short form on GitHub</ExtLink> (a free GitHub account is needed): write the scheme, the rule, and what the government order says.
        </Callout>
        <Callout tone="neutral" title="Disclaimer">Niyam is an independent project built at neatHack 2026. It is not an official government service. Information only; the government department makes the final decision.</Callout>
      </Container>
    </>
  );
}
