import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">Page not found</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">This page does not exist, but every rule does have a source.</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">The link may be old. Here are the places most people are looking for.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/">Home</ButtonLink>
        <ButtonLink href="/demo/" variant="secondary">Watch it work</ButtonLink>
        <ButtonLink href="/check/" variant="secondary">Check eligibility</ButtonLink>
        <ButtonLink href="/judges/" variant="secondary">For judges</ButtonLink>
      </div>
    </Container>
  );
}
