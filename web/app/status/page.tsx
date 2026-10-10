import type { Metadata } from "next";
import { Info } from "@/components/info";
import { StatusLive } from "@/components/status-live";
import { Card, Container, PageHeader } from "@/components/ui";
import { meta, showcase } from "@/lib/data";

export const metadata: Metadata = { title: "Status", description: "Is the Niyam agent running? Source health, last run and build information." };

export default function StatusPage() {
  return (
    <>
      <PageHeader eyebrow="Status" title="Is the agent running?" intro={<>The watcher checks official sources every 15 minutes <Info id="step-watch" />. If a source asks for a CAPTCHA it is marked blocked, never bypassed.</>} />
      <Container className="grid gap-6 py-12 lg:grid-cols-2">
        <Card><h2 className="mb-4 text-lg font-semibold">Live</h2><StatusLive /></Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">This build</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Built</dt><dd>{meta.generated_at}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Rulebook version</dt><dd className="font-mono">{meta.rulebook_main_sha.slice(0, 7)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Agent version</dt><dd className="font-mono">{meta.niyam_head.slice(0, 7)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Showcase run</dt><dd className="font-mono">{showcase.id}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Agent pull requests</dt><dd>{meta.published.length}</dd></div>
          </dl>
        </Card>
      </Container>
    </>
  );
}
