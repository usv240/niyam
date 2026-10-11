import pathlib

W = pathlib.Path(__file__).resolve().parent.parent / "web"


def edit(p, pairs):
    f = W / p
    s = f.read_text(encoding="utf-8")
    for a, b in pairs:
        if a not in s:
            print("MISSING", p, a[:70])
        s = s.replace(a, b, 1)
    f.write_text(s, encoding="utf-8", newline="\n")


# ---------------------------------------------------------------- judges
edit("app/judges/page.tsx", [
    ('''          <h2 className="text-xl font-semibold">Quick links</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {SITE.video && <ButtonLink href={SITE.video} external>Demo video</ButtonLink>}
            <ButtonLink href="/demo/">Replay a real run</ButtonLink>
            <ButtonLink href={SITE.repo} external variant="secondary">Agent repository</ButtonLink>
            <ButtonLink href={SITE.rulebookRepo} external variant="secondary">Rulebook repository</ButtonLink>
            {showcase.pr_url && <ButtonLink href={showcase.pr_url} external variant="secondary">Agent pull request</ButtonLink>}
            <ButtonLink href={SITE.buildLog} external variant="secondary">Build log</ButtonLink>
            <ButtonLink href={SITE.businessPlan} external variant="secondary">Business plan</ButtonLink>
          </div>''',
     '''          <h2 className="text-xl font-semibold">The 3-minute path</h2>
          <p className="mt-1 text-sm text-muted">Open these in order. Each one-line note says what you will see.</p>
          <ol className="mt-4 space-y-3">
            {[
              ...(SITE.video ? [{ href: SITE.video, ext: true, t: "Watch the demo video (under 3 minutes)", d: "The whole story with real runs, narrated." }] : []),
              { href: "/demo/", ext: false, t: "Replay a real run", d: "Every step the agent took on a real Marathi government order, with the document, code change, independent check and decision." },
              { href: showcase.pr_url || SITE.rulebookRepo, ext: true, t: "Open the agent's real change request (PR #2)", d: "The quotes, the verification, the confidence and the reasons, as the agent wrote them. Reviewed and merged." },
              { href: showcase.checkpoint_url || SITE.rulebookRepo, ext: true, t: "Open its Entire checkpoint", d: "The coding agent's full session behind that change: what it read, edited and tested." },
              { href: "#evidence", ext: false, t: "See the measured results", d: "Version 1 to 3 on the same six documents, with a neatlogs trace id for every run." },
            ].map((x, i) => (
              <li key={x.t} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-contrast">{i + 1}</span>
                <div>
                  {x.ext ? <ExtLink href={x.href}>{x.t}</ExtLink> : <a href={x.href} className="font-medium text-accent underline underline-offset-2">{x.t}</a>}
                  <p className="text-sm text-muted">{x.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm font-semibold">More</p>
          <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <li><ExtLink href={SITE.repo}>Agent repository</ExtLink>: the agent, API, website and evaluations.</li>
            <li><ExtLink href={SITE.rulebookRepo}>Rulebook repository</ExtLink> <Info id="rulebook" />: the rules the agent maintains, with its pull requests.</li>
            <li><ExtLink href={SITE.buildLog}>Build log</ExtLink>: what was built when, including mistakes and fixes.</li>
            <li><ExtLink href={SITE.businessPlan}>Business plan</ExtLink>: pricing, costs and runway.</li>
          </ul>'''),
    ("Trace id <code className=\"font-mono break-all\">{showcase.trace_id}</code>.", "Trace id <Info id=\"trace-id\" /> <code className=\"font-mono break-all\">{showcase.trace_id}</code>."),
    ('<h2 className="mb-1 text-2xl font-semibold">neatlogs, Entire and cfo.ai <span className="text-base font-normal text-muted">(25%)</span></h2>',
     '<h2 className="mb-1 text-2xl font-semibold">neatlogs <Info id="neatlogs" />, Entire <Info id="entire" /> and cfo.ai <span className="text-base font-normal text-muted">(25%)</span></h2>'),
])

# ---------------------------------------------------------------- trust
edit("app/trust/page.tsx", [
    ('''  ["Merge automatically", "Only numbers or dates change, nobody loses eligibility, every quote checks out, every independent test agrees, and confidence is at least 0.90.", "success"],
  ["Ask a human to review", "Any structural change (a condition added, removed or reworded), any ambiguity, or confidence between 0.70 and 0.90.", "warning"],
  ["Stop and ask a question", "An unresolved disagreement, confidence below 0.70, or the job's cost budget is reached.", "danger"],''',
     '''  ["Apply the change by itself", "Only a number or a date changes, nobody loses eligibility, every quote is found in the order, every independent test agrees, and confidence is 0.90 or more.", "success"],
  ["Ask a person to review first", "A condition is added, removed or reworded, a sentence could be read two ways, or confidence is from 0.70 up to (not including) 0.90.", "warning"],
  ["Stop and ask a question", "The two agents still disagree, confidence is below 0.70, or the run reaches its cost limit.", "danger"],'''),
    ('<h2 className="text-xl font-semibold">When Niyam acts alone</h2>',
     '''<h2 className="flex items-center gap-2 text-xl font-semibold">When Niyam acts alone <Info id="autonomy" /></h2>
          <p className="mt-2 text-sm text-muted">Every rule change is first written as a proposal. Applying it to the official rulebook is called merging <Info id="merge" />. Confidence <Info id="confidence" /> is Niyam&apos;s own score from 0 to 1 for how sure it is that the change matches the law.</p>'''),
    ('<li>Get around a CAPTCHA or a login on a government website.</li>',
     '<li>Get around a CAPTCHA <Info id="captcha" /> or a login on a government website.</li>'),
    ('<li>Let text inside a document instruct the agent. The coding agent only ever sees a checked list of changes, never the raw document, and we test this with a hidden prompt injection.</li>',
     '<li>Obey instructions hidden inside a document <Info id="prompt-injection" />. The coding agent only ever sees a checked list of changes, never the raw document. We tested this with a hidden instruction to raise the income limit: Niyam ignored it and changed nothing.</li>'),
    ('<li>Uploaded documents are processed on a sandbox branch and should not contain personal information.</li>',
     '<li>Uploaded documents are processed on a test copy <Info id="sandbox" /> and should not contain personal information.</li>'),
    ('<li>API keys are stored only as hashes.</li>', '<li>API keys are stored only in a scrambled form (a hash) that cannot be turned back into the key.</li>'),
    ('''          Open an issue on the <ExtLink href={`${SITE.rulebookRepo}/issues`}>rulebook repository</ExtLink> with the scheme, the rule and the clause you believe is right. Every rule shows its source, so you can check it against the law yourself.''',
     '''          Every rule shows its source, so you can check it against the law yourself. To report a mistake, <ExtLink href={`${SITE.rulebookRepo}/issues/new?title=Wrong%20rule%3A%20&body=Scheme%3A%0ARule%3A%0AWhat%20the%20government%20order%20says%20(with%20page)%3A%0A`}>fill in this short form on GitHub</ExtLink> (a free GitHub account is needed): write the scheme, the rule, and what the government order says.'''),
])

# ---------------------------------------------------------------- status
edit("app/status/page.tsx", [
    ('import { meta, showcase } from "@/lib/data";', 'import { meta, showcase } from "@/lib/data";\nimport { SITE } from "@/lib/site";'),
    ('<div className="flex justify-between gap-4"><dt className="text-muted">Rulebook version</dt><dd className="font-mono">{meta.rulebook_main_sha.slice(0, 7)}</dd></div>',
     '<div className="flex justify-between gap-4"><dt className="text-muted">Rulebook version <Info id="commit" /></dt><dd className="font-mono"><a className="text-accent underline underline-offset-2" href={`${SITE.rulebookRepo}/commit/${meta.rulebook_main_sha}`} target="_blank" rel="noreferrer">{meta.rulebook_main_sha.slice(0, 7)}</a></dd></div>'),
    ('<div className="flex justify-between gap-4"><dt className="text-muted">Agent version</dt><dd className="font-mono">{meta.niyam_head.slice(0, 7)}</dd></div>',
     '<div className="flex justify-between gap-4"><dt className="text-muted">Agent version <Info id="commit" /></dt><dd className="font-mono"><a className="text-accent underline underline-offset-2" href={`${SITE.repo}/commit/${meta.niyam_head}`} target="_blank" rel="noreferrer">{meta.niyam_head.slice(0, 7)}</a></dd></div>'),
    ('<div className="flex justify-between gap-4"><dt className="text-muted">Showcase run</dt><dd className="font-mono">{showcase.id}</dd></div>',
     '<div className="flex justify-between gap-4"><dt className="text-muted">Example run shown on the site</dt><dd><a className="text-accent underline underline-offset-2" href="/demo/">Replay it</a></dd></div>'),
    ('<div className="flex justify-between gap-4"><dt className="text-muted">Agent pull requests</dt><dd>{meta.published.length}</dd></div>',
     '<div className="flex justify-between gap-4"><dt className="text-muted">Change requests opened by the agent <Info id="pull-request" /></dt><dd><a className="text-accent underline underline-offset-2" href={`${SITE.rulebookRepo}/pulls?q=is%3Apr`} target="_blank" rel="noreferrer">See all on GitHub</a></dd></div>'),
])

# ---------------------------------------------------------------- developers: real example
edit("app/developers/page.tsx", [
    ('''      "source": { "page": 2, "clause": "4(3)", "quote": "...", "quote_en": "...",
                  "document": { "code": "202407031335114330", "url": "https://gr.maharashtra.gov.in/..." },
                  "provenance": { "pr_url": "...", "checkpoint_url": "https://entire.io/gh/..." } }''',
     '''      "source": {
        "page": 2, "clause": "4(3)",
        "quote": "किमान वयाची २१ वर्षे पूर्ण व कमाल वयाची ६५ वर्ष पूर्ण होईपर्यंत.",
        "quote_en": "Minimum age 21 years completed and maximum age until 65 years are completed.",
        "document": { "code": "202407031335114330",
                      "url": "https://gr.maharashtra.gov.in/Site/Upload/Government%20Resolutions/Marathi/202407031335114330.pdf" },
        "provenance": { "pr_url": "https://github.com/usv240/niyam-rulebook/pull/2",
                        "checkpoint_id": "01M4JDH944E4HPRCA4WKDJTFN7" } }'''),
])
print("pass2 done")
