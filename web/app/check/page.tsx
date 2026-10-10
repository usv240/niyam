import type { Metadata } from "next";
import { Checker } from "@/components/checker";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Check eligibility", description: "See which schemes you may qualify for, why, and the official source. In English, Hindi and Marathi." };

export default function CheckPage() {
  return (
    <>
      <PageHeader
        eyebrow="Check eligibility"
        title="Am I eligible? See the answer, the reason and the source."
        intro="Answer a few questions in English, Hindi or Marathi. Every reason links to the clause of the government order it comes from. The check runs in your browser, and we never ask for names, Aadhaar or phone numbers."
      />
      <Container className="py-12"><Checker /></Container>
    </>
  );
}
