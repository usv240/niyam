import type { Metadata } from "next";
import { Badge, Callout, Card, Container, ExtLink, PageHeader } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Trust and limits", description: "When Niyam acts alone, when it asks a human, what it never does, and how your data is handled." };

const POLICY: [string, string, "success" | "warning" | "danger"][] = [
  ["Merge automatically", "Only numbers or dates change, nobody loses eligibility, every quote checks out, every independent test agrees, and confidence is at least 0.90.", "success"],
  ["Ask a human to review", "Any structural change (a condition added, removed or reworded), any ambiguity, or confidence between 0.70 and 0.90.", "warning"],
  ["Stop and ask a question", "An unresolved disagreement, confidence below 0.70, or the job's cost budget is reached.", "danger"],
];

export default function Trust() {
  return (
    <>
      <PageHeader eyebrow="Trust and limits" title="An agent you can trust to run without watching, and when it will not act alone" intro="Wrongly removing someone from a welfare scheme causes real harm. Niyam is built to be fast for simple changes and careful for everything else." />
      <Container className="space-y-8 py-12">
        <Card>
          <h2 className="text-xl font-semibold">When Niyam acts alone</h2>
          <ul className="mt-4 space-y-3">
            {POLICY.map(([a, b, t]) => (
              <li key={a} className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-4 sm:flex-row sm:items-start">
                <Badge tone={t}>{a}</Badge>
                <p className="text-sm text-muted">{b}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">Hard rules on top: a change that removes people from a scheme always goes to a human. Uploaded documents run on a sandbox branch and are never merged.</p>
        </Card>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold">What Niyam never does</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
              <li>Decide anyone&apos;s application. The government department decides.</li>
              <li>Ask for or store names, Aadhaar numbers, phone numbers or addresses.</li>
              <li>Get around a CAPTCHA or a login on a government website.</li>
              <li>Let text inside a document instruct the agent. The coding agent only ever sees a checked list of changes, never the raw document, and we test this with a hidden prompt injection.</li>
              <li>Edit or delete history. Old values stay, so the rules on any past date can be checked.</li>
            </ul>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Your data</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
              <li>The eligibility checker on this site runs in your browser. Nothing is sent.</li>
              <li>The API rejects values that look like ID or phone numbers, and stores only request counts.</li>
              <li>Uploaded documents are processed on a sandbox branch and should not contain personal information.</li>
              <li>API keys are stored only as hashes.</li>
              <li>No cookies, no tracking.</li>
            </ul>
          </Card>
        </div>
        <Callout tone="info" title="Found a wrong rule?">
          Open an issue on the <ExtLink href={`${SITE.rulebookRepo}/issues`}>rulebook repository</ExtLink> with the scheme, the rule and the clause you believe is right. Every rule shows its source, so you can check it against the law yourself.
        </Callout>
        <Callout tone="neutral" title="Disclaimer">Niyam is an independent project built at neatHack 2026. It is not an official government service. Information only; the government department makes the final decision.</Callout>
      </Container>
    </>
  );
}
