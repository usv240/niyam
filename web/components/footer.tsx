import Link from "next/link";
import { SITE } from "@/lib/site";
import { Logo } from "./header";
import { Container } from "./ui";

const COLS = [
  { title: "Product", links: [["How it works", "/how-it-works/"], ["Demo", "/demo/"], ["Explore rules", "/explore/"], ["Check eligibility", "/check/"], ["Try your own document", "/try/"]] },
  { title: "Developers", links: [["API and keys", "/developers/"], ["MCP server", "/developers/#mcp"], ["System status", "/status/"], ["Source code", SITE.repo]] },
  { title: "Project", links: [["For judges", "/judges/"], ["Rulebook repository", SITE.rulebookRepo], ["Business plan", SITE.businessPlan], ["Build log", SITE.buildLog]] },
  { title: "Understand", links: [["Learn", "/learn/"], ["Glossary", "/learn/#glossary"], ["Trust and limits", "/trust/"], ["References", "/learn/#references"]] },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">{SITE.tagline}</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="mb-3 text-sm font-semibold">{c.title}</p>
            <ul className="space-y-2 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("http") ? (
                    <a href={href} target="_blank" rel="noreferrer" className="text-muted hover:text-text">{label}</a>
                  ) : (
                    <Link href={href} className="text-muted hover:text-text">{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="flex flex-col gap-2 border-t border-border py-6 text-xs text-muted sm:flex-row sm:justify-between">
        <p>Built at neatHack 2026 by team USV. Not an official government service.</p>
        <p>Information only. Final eligibility is always decided by the government department.</p>
      </Container>
    </footer>
  );
}
