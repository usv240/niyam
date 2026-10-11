import type { Metadata } from "next";
import { Byod } from "@/components/byod";
import { Info } from "@/components/info";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Try your own document", description: "Upload any government order and watch Niyam process it live on a sandbox copy of the rulebook." };

export default function TryPage() {
  return (
    <>
      <PageHeader guide="try"
        eyebrow="Bring your own document"
        title="Upload a government order and watch Niyam work"
        intro={<>Use any government order as a PDF or a link: a GR (Government Resolution) <Info id="gr" />, a circular or a notification. Niyam runs the same seven steps it always does, on a test copy of the rules <Info id="sandbox" />, and you see every step live. Nothing official changes.</>}
      />
      <Container className="py-12">
        <ol className="mb-8 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {["Read the order and decide if it matters", "Quote each changed sentence and check the quote", "Update a test copy of the rules, with tests", "A second AI checks it against the law"].map((x, i) => (
            <li key={x} className="flex gap-2 rounded-xl border border-border bg-surface p-3"><span className="font-semibold text-accent">{i + 1}</span>{x}</li>
          ))}
        </ol>
        <Byod />
      </Container>
    </>
  );
}
