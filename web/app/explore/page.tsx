import type { Metadata } from "next";
import { Explorer } from "@/components/explorer";
import { Info } from "@/components/info";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Explore the rules", description: "Every rule of the scheme in plain words, with the government order clause behind it, on any date." };

export default function ExplorePage() {
  return (
    <>
      <PageHeader
        eyebrow="Explore the rules"
        title="Every rule, in plain words, with its source"
        intro={<>Pick a date to see the rules exactly as they were then <Info id="time-travel" />. Press <b>Why?</b> on any rule to see the clause of the government order it comes from, in the original Marathi and in English <Info id="provenance" />.</>}
      />
      <Container className="py-12"><Explorer /></Container>
    </>
  );
}
