import type { Metadata } from "next";
import { Byod } from "@/components/byod";
import { Info } from "@/components/info";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Try your own document", description: "Upload any government order and watch Niyam process it live on a sandbox copy of the rulebook." };

export default function TryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Bring your own document"
        title="Upload a government order and watch Niyam work"
        intro={<>Use any GR, circular or notification as a PDF or a link <Info id="gr" />. Niyam runs the same seven steps as in production, on a test copy of the rulebook, and you see every step live.</>}
      />
      <Container className="py-12"><Byod /></Container>
    </>
  );
}
