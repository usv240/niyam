import pathlib
import re

W = pathlib.Path(__file__).resolve().parent.parent / "web"


def edit(p, pairs):
    f = W / p
    s = f.read_text(encoding="utf-8")
    for a, b in pairs:
        if a not in s:
            print("MISSING", p, a[:70])
        s = s.replace(a, b, 1)
    f.write_text(s, encoding="utf-8", newline="\n")


# Try: friendly offline notice; hide the form when offline; list the seven steps.
f = W / "components/byod.tsx"
s = f.read_text(encoding="utf-8")
s = re.sub(r"\{online === false && \(\n\s*<Callout tone=\"warning\" title=\"The live agent is not reachable from this page right now\">.*?</Callout>\n\s*\)\}",
           '{online === false && <OfflineNotice what="uploading your own document" />}', s, count=1, flags=re.S)
s = s.replace('<form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-surface p-5">',
              '{online !== false && <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-surface p-5">', 1)
s = s.replace("      </form>\n", "      </form>}\n", 1)
s = s.replace('import { Info } from "./info";', 'import { Info } from "./info";\nimport { OfflineNotice } from "./offline";', 1)
f.write_text(s, encoding="utf-8", newline="\n")

edit("app/try/page.tsx", [
    ('      <Container className="py-12"><Byod /></Container>',
     '''      <Container className="py-12">
        <ol className="mb-8 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {["Read the order and decide if it matters", "Quote each changed sentence and check the quote", "Update a test copy of the rules, with tests", "A second AI checks it against the law"].map((x, i) => (
            <li key={x} className="flex gap-2 rounded-xl border border-border bg-surface p-3"><span className="font-semibold text-accent">{i + 1}</span>{x}</li>
          ))}
        </ol>
        <Byod />
      </Container>'''),
])

# Developers: friendly offline notice for key creation.
f = W / "components/key-card.tsx"
s = f.read_text(encoding="utf-8")
s = re.sub(r"\{online === false && <Callout tone=\"warning\" title=\"The live API is not reachable from this page\">.*?</Callout>\}",
           '{online === false && <OfflineNotice what="creating API keys" />}', s, count=1, flags=re.S)
s = s.replace('import { Info } from "./info";', 'import { Info } from "./info";\nimport { OfflineNotice } from "./offline";', 1)
f.write_text(s, encoding="utf-8", newline="\n")

edit("app/developers/page.tsx", [
    ('d: "The rules of a scheme on any date, each with its source and, for agent changes, the pull request and Entire checkpoint." },',
     'd: "The rules of a scheme on any date, each with its source and, for agent changes, the pull request and the Entire checkpoint (the saved record of which AI agent, model and session wrote the rule)." },'),
])

# Status: friendly offline wording; UTC on the build time.
f = W / "components/status-live.tsx"
s = f.read_text(encoding="utf-8")
s = re.sub(r'if \(failed\) return <Callout tone="warning" title="Live status unavailable">.*?</Callout>;',
           'if (failed) return <Callout tone="warning" title="Live status cannot be shown right now">The live server is not answering, so the watcher\'s latest check cannot be shown here. This does not affect checking your eligibility, exploring the rules, or replaying a real run. The box on the right shows the last saved build.</Callout>;',
           s, count=1, flags=re.S)
f.write_text(s, encoding="utf-8", newline="\n")
edit("app/status/page.tsx", [
    ('<dd>{meta.generated_at}</dd>', '<dd>{meta.generated_at.replace("T", " ").slice(0, 16)} (India time)</dd>'),
])

# Trust: who the two agents are; evidence links.
edit("app/trust/page.tsx", [
    ('''          <p className="mt-2 text-sm text-muted">Every rule change is first written as a proposal.''',
     '''          <p className="mt-2 text-sm text-muted">Two AI agents work on every change: one reads the government order and proposes the rule change; the other, which never sees that proposal, checks it against the law by testing imaginary people. Every rule change is first written as a proposal.'''),
    ('''<p className="mt-4 text-sm text-muted">Hard rules on top: a change that removes people from a scheme always goes to a human. Uploaded documents run on a sandbox branch and are never merged.</p>''',
     '''<p className="mt-4 text-sm text-muted">Hard rules on top: a change that removes people from a scheme always goes to a human. Uploaded documents run on a test copy and are never merged.</p>
          <p className="mt-3 text-sm text-muted"><span className="font-semibold text-text">So far, on real government orders:</span> all 4 change requests went to a person first. 3 were merged after review (<ExtLink href="https://github.com/usv240/niyam-rulebook/pull/2">#2</ExtLink>, <ExtLink href="https://github.com/usv240/niyam-rulebook/pull/3">#3</ExtLink>, <ExtLink href="https://github.com/usv240/niyam-rulebook/pull/4">#4</ExtLink>) and 1 was replaced by a better version. In test runs, an order that only raised payments was cleared to apply by itself in 4 of 5 runs.</p>'''),
    ('We tested this with a hidden instruction to raise the income limit: Niyam ignored it and changed nothing.</li>',
     'We tested this with a hidden instruction to raise the income limit: Niyam ignored it and changed nothing (<ExtLink href="https://github.com/usv240/niyam/tree/main/evals/cases/synthetic-injection">the test document</ExtLink>, <ExtLink href="https://github.com/usv240/niyam/blob/main/evals/results/v3.json">the result</ExtLink>).</li>'),
])
print("pass4 done")
