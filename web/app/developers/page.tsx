import type { Metadata } from "next";
import { Info } from "@/components/info";
import { CopyButton, KeyCard } from "@/components/key-card";
import { Badge, Callout, Card, Container, ExtLink, PageHeader, Section } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Developers", description: "Niyam API: eligibility with sources, rules on any date, agent jobs with live events, API keys and an MCP server." };

const BASE = SITE.apiBase || "https://YOUR-NIYAM-API";

const ENDPOINTS: { m: string; p: string; auth: string; d: string }[] = [
  { m: "POST", p: "/api/v1/eligibility", auth: "none or key", d: "Eligibility for every covered scheme, with the amount, each reason, and the source clause behind each reason." },
  { m: "GET", p: "/api/v1/schemes", auth: "none or key", d: "Covered schemes with their last change date." },
  { m: "GET", p: "/api/v1/schemes/{id}/rules?at=YYYY-MM-DD", auth: "none or key", d: "The rules of a scheme on any date, each with its source and, for agent changes, the pull request and Entire checkpoint." },
  { m: "GET", p: "/api/v1/schemes/{id}/history", auth: "none or key", d: "Every change over time, oldest first." },
  { m: "GET", p: "/api/v1/changes", auth: "none or key", d: "Recent rule changes in plain language." },
  { m: "POST", p: "/api/v1/documents", auth: "key (run scope) or 3 per day", d: "Bring your own document: upload a PDF (file) or a link (url). Starts an agent job on a sandbox branch." },
  { m: "GET", p: "/api/v1/jobs/{id}", auth: "none or key", d: "A job: state, changes, verification, decision, cost, trace id, pull request, checkpoint, events." },
  { m: "GET", p: "/api/v1/jobs/{id}/events", auth: "none", d: "Server-sent events: each step of a running job as it happens." },
  { m: "POST", p: "/api/v1/keys", auth: "none", d: "Create a free key (shown once, hashed on our side)." },
  { m: "GET", p: "/api/v1/usage", auth: "key", d: "Your calls, jobs and cost per day." },
  { m: "GET", p: "/api/v1/status", auth: "none", d: "Source health, running jobs, tracing status." },
  { m: "GET", p: "/api/v1/evals", auth: "none", d: "All evaluation results, per version and per case." },
];

const curl = `curl -X POST ${BASE}/api/v1/eligibility \\
  -H "Authorization: Bearer $NIYAM_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"age": 34, "gender": "female", "annual_family_income": 240000, "date": "2024-08-01"}'`;

const python = `import httpx

r = httpx.post(
    "${BASE}/api/v1/eligibility",
    headers={"Authorization": f"Bearer {NIYAM_KEY}"},
    json={"age": 34, "gender": "female", "annual_family_income": 240000},
)
for scheme in r.json()["results"]:
    print(scheme["name"], scheme["eligible"], scheme["monthly_benefit_inr"])
    for reason in scheme["reasons"]:
        src = reason["source"]
        print("  ", reason["met"], reason["rule"], "<-", src["document"]["code"], "p.", src["page"])`;

const js = `const r = await fetch("${BASE}/api/v1/eligibility", {
  method: "POST",
  headers: { Authorization: \`Bearer \${NIYAM_KEY}\`, "Content-Type": "application/json" },
  body: JSON.stringify({ age: 34, gender: "female", annual_family_income: 240000 }),
});
const { results, disclaimer } = await r.json();`;

const response = `{
  "as_of": "2024-08-01",
  "rulebook_version": "9ddb04d",
  "results": [{
    "scheme_id": "mh.ladki_bahin",
    "name": "Mukhyamantri Majhi Ladki Bahin Yojana",
    "eligible": true,
    "monthly_benefit_inr": 1500,
    "reasons": [{
      "rule": "Aged 21 to 65 (completed years)", "met": true,
      "source": { "page": 2, "clause": "4(3)", "quote": "...", "quote_en": "...",
                  "document": { "code": "202407031335114330", "url": "https://gr.maharashtra.gov.in/..." },
                  "provenance": { "pr_url": "...", "checkpoint_url": "https://entire.io/gh/..." } }
    }]
  }],
  "disclaimer": "Information only. Final eligibility is decided by the government department."
}`;

const mcp = `claude mcp add niyam --env NIYAM_API_BASE=${BASE} -- \\
  uvx --from "git+https://github.com/usv240/niyam#subdirectory=agent" niyam-mcp`;

const local = `git clone https://github.com/usv240/niyam && cd niyam/agent
uv venv && uv pip install -e . && uvicorn niyam.api:app --port 8000`;

function Code({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted"><span>{lang}</span><CopyButton text={code} /></div>
      <pre tabIndex={0} aria-label="Code example" className="overflow-x-auto p-4 font-mono text-[13px] leading-6">{code}</pre>
    </div>
  );
}

export default function Developers() {
  return (
    <>
      <PageHeader eyebrow="Developers" title="Eligibility with sources, in one API call" intro={<>Read endpoints work without a key at a low rate limit. Create a free key for higher limits and to run agent jobs on your own documents. Every answer carries the clause behind it.</>}>
        <ol className="grid gap-3 sm:grid-cols-3">
          {["Create a key below (shown once)", "Call POST /api/v1/eligibility", "Show your users the reason and the source"].map((s, i) => (
            <li key={s} className="rounded-xl border border-border bg-surface p-4 text-sm"><span className="text-xs font-semibold text-accent">Step {i + 1}</span><p className="mt-1 font-medium">{s}</p></li>
          ))}
        </ol>
      </PageHeader>
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_1.2fr]">
        <KeyCard />
        <div className="space-y-4">
          <Code code={curl} lang="curl" />
          <Code code={python} lang="Python" />
          <Code code={js} lang="JavaScript" />
        </div>
      </Container>

      <Section id="reference" eyebrow="Reference" title="Endpoints" intro={<>Send keys as <code className="font-mono">Authorization: Bearer niyam_live_...</code>. Responses include <code className="font-mono">X-RateLimit-Limit</code> and <code className="font-mono">X-RateLimit-Remaining</code>.</>}>
        <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Path</th><th className="px-4 py-3">Auth</th><th className="px-4 py-3">What it does</th></tr></thead>
            <tbody>
              {ENDPOINTS.map((e) => (
                <tr key={e.p} className="border-t border-border align-top">
                  <td className="px-4 py-3"><Badge tone={e.m === "GET" ? "info" : "success"} icon={false}>{e.m}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs">{e.p}</td>
                  <td className="px-4 py-3 text-xs text-muted">{e.auth}</td>
                  <td className="px-4 py-3 text-muted">{e.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div><h3 className="mb-3 font-semibold">Example response</h3><Code code={response} lang="JSON" /></div>
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold">Errors</h3>
              <p className="mt-2 text-sm text-muted">Errors are JSON: <code className="font-mono">{"{\"error\": {\"code\", \"message\", \"docs_url\"}}"}</code>. Codes include <code className="font-mono">invalid_key</code>, <code className="font-mono">rate_limited</code> (with Retry-After), <code className="font-mono">daily_limit</code>, <code className="font-mono">personal_data_rejected</code> (a value looked like an Aadhaar or phone number), <code className="font-mono">not_pdf</code>, <code className="font-mono">too_large</code>.</p>
            </Card>
            <Card>
              <h3 className="font-semibold">Limits</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                <li>No key: 30 requests per minute, 3 documents per day.</li>
                <li>Free key: 120 requests per minute, 20 documents per day.</li>
                <li>Navigator plan: 600 requests per minute, 200 documents per day (see the business plan).</li>
              </ul>
            </Card>
            <Callout tone="info" title="Privacy by design">The API never needs names, Aadhaar numbers or phone numbers, and rejects values that look like them. Eligibility requests are not stored, only counted.</Callout>
          </div>
        </div>
      </Section>

      <Section id="mcp" eyebrow="For AI assistants" title="Add Niyam to Claude, Cursor or any MCP client" intro={<>Six tools: check_eligibility, explain_rules, rule_history, list_schemes, recent_changes and submit_document. Your assistant then answers with current rules and their sources, instead of guessing. <Info id="mcp" /></>} className="border-t border-border bg-surface/50">
        <Code code={mcp} lang="shell" />
      </Section>

      <Section id="run-it-yourself" eyebrow="Open source" title="Run your own copy" intro={<>Everything is open: the agent, the API, the website and the rulebook. <ExtLink href={SITE.repo}>usv240/niyam</ExtLink> and <ExtLink href={SITE.rulebookRepo}>usv240/niyam-rulebook</ExtLink>.</>}>
        <Code code={local} lang="shell" />
      </Section>
    </>
  );
}
