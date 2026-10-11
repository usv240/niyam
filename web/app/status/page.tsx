import type { Metadata } from "next";
import { Info } from "@/components/info";
import { StatusLive } from "@/components/status-live";
import { Card, Container, PageHeader } from "@/components/ui";
import { meta, showcase } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Status", description: "Is the Niyam agent running? Source health, last run and build information." };

export default function StatusPage() {
  return (
    <>
      <PageHeader guide="status" eyebrow="Status" title="Is the agent running?" intro={<>The watcher checks official sources every 15 minutes <Info id="step-watch" />. If a source asks for a CAPTCHA it is marked blocked, never bypassed.</>} />
      <Container className="grid gap-6 py-12 lg:grid-cols-2">
        <Card><h2 className="mb-4 text-lg font-semibold">Live</h2><StatusLive /></Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">This build</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Built</dt><dd>{meta.generated_at.replace("T", " ").slice(0, 16)} (India time)</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Rulebook version <Info id="commit" /></dt><dd className="font-mono"><a className="text-accent underline underline-offset-2" href={`${SITE.rulebookRepo}/commit/${meta.rulebook_main_sha}`} target="_blank" rel="noreferrer">{meta.rulebook_main_sha.slice(0, 7)}</a></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Agent version <Info id="commit" /></dt><dd className="font-mono"><a className="text-accent underline underline-offset-2" href={`${SITE.repo}/commit/${meta.niyam_head}`} target="_blank" rel="noreferrer">{meta.niyam_head.slice(0, 7)}</a></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Example run shown on the site</dt><dd><a className="text-accent underline underline-offset-2" href="/demo/">Replay it</a></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Change requests opened by the agent <Info id="pull-request" /></dt><dd><a className="text-accent underline underline-offset-2" href={`${SITE.rulebookRepo}/pulls?q=is%3Apr`} target="_blank" rel="noreferrer">See all on GitHub</a></dd></div>
          </dl>
        </Card>
      </Container>
    </>
  );
}
