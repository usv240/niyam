import type { Metadata } from "next";
import { DemoPlayer } from "@/components/demo-player";
import { Info } from "@/components/info";
import { ButtonLink, Callout, Card, Container, ExtLink, PageHeader } from "@/components/ui";
import { showcase, usd } from "@/lib/data";

export const metadata: Metadata = { title: "Demo", description: "Replay a real Niyam run on a Marathi government order, step by step." };

export default function DemoPage() {
  const minutes = showcase.finished_at && showcase.started_at ? Math.max(1, Math.round((showcase.finished_at - showcase.started_at) / 60)) : null;
  return (
    <>
      <PageHeader
        eyebrow="Demo"
        title="Watch Niyam process a real government order"
        intro={<>This is the recorded run of the real <ExtLink href={showcase.document.source_url || "#"}>3 July 2024 amendment</ExtLink> to the Ladki Bahin scheme. Every event below happened. Press Play to replay it step by step, or open the tabs to see the document, the code change, the verification and the decision.</>}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-muted">Changes found</p><p className="text-2xl font-semibold">{showcase.changes.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Verifier agrees <Info id="verifier-agreement" /></p><p className="text-2xl font-semibold">{showcase.verdict?.cases_agree} of {showcase.verdict?.cases_valid}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Cost</p><p className="text-2xl font-semibold">{usd(showcase.cost_usd)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Time</p><p className="text-2xl font-semibold">{minutes ? `${minutes} min` : "n/a"}</p></Card>
        </div>
      </PageHeader>
      <Container className="py-12">
        <DemoPlayer job={showcase} />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Callout tone="info" title="See the evidence yourself">
            {showcase.pr_url && <>Change request: <ExtLink href={showcase.pr_url}>{showcase.pr_url.replace("https://github.com/", "")}</ExtLink>. </>}
            {showcase.checkpoint_id && <>Entire checkpoint <code className="font-mono">{showcase.checkpoint_id}</code>{showcase.checkpoint_url && <> (<ExtLink href={showcase.checkpoint_url}>open</ExtLink>)</>}. </>}
            {showcase.trace_id && <>neatlogs trace id <code className="font-mono break-all">{showcase.trace_id}</code>.</>}
          </Callout>
          <Callout tone="neutral" title="Try it on your own document">
            Upload any government order and watch the same pipeline run live on a sandbox copy of the rulebook.
            <div className="mt-3"><ButtonLink href="/try/" variant="secondary">Bring your own document</ButtonLink></div>
          </Callout>
        </div>
      </Container>
    </>
  );
}
