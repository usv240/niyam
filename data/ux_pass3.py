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


# Learn: an info button next to each topic that has one, and a plain "Niyam in one paragraph" first.
edit("app/learn/page.tsx", [
    ('import { Card, Container, ExtLink, PageHeader } from "@/components/ui";',
     'import { Info } from "@/components/info";\nimport { Card, Container, ExtLink, PageHeader } from "@/components/ui";'),
    ('const TOPICS: { id: string; q: string; body: React.ReactNode }[] = [',
     '''const TOPIC_INFO: Record<string, string> = { scheme: "scheme", gr: "gr", "rules-as-code": "rules-as-code", agent: "agent", trace: "trace", checkpoint: "checkpoint", verify: "step-verify", human: "autonomy" };

const TOPICS: { id: string; q: string; body: React.ReactNode }[] = [
  { id: "niyam", q: "What is Niyam, in one paragraph?", body: <>Governments in India publish their welfare rules as orders, often PDF files in Marathi or Hindi. Apps, helplines and field workers then have to copy those rules by hand, and they often fall behind. Niyam is an AI helper that reads each new order, works out exactly what changed, updates one open set of rules with tests, and has a second AI check the work. A person approves anything risky. Anyone can then check their eligibility, and every answer shows the sentence of the government order it comes from.</> },'''),
    ('''              <h2 id={t.id} className="scroll-mt-24 text-xl font-semibold">{t.q}</h2>''',
     '''              <h2 id={t.id} className="flex scroll-mt-24 items-center gap-2 text-xl font-semibold">{t.q} {TOPIC_INFO[t.id] && <Info id={TOPIC_INFO[t.id]} />}</h2>'''),
])

edit("app/try/page.tsx", [
    ('intro={<>Use any GR, circular or notification as a PDF or a link <Info id="gr" />. Niyam runs the same seven steps as in production, on a test copy of the rulebook, and you see every step live.</>}',
     'intro={<>Use any government order as a PDF or a link: a GR (Government Resolution) <Info id="gr" />, a circular or a notification. Niyam runs the same seven steps it always does, on a test copy of the rules <Info id="sandbox" />, and you see every step live. Nothing official changes.</>}'),
])

edit("components/explorer.tsx", [
    ('''          <p className="mt-2 max-w-2xl text-sm text-muted">{scheme.summary}</p>''',
     '''          <p className="mt-2 max-w-2xl text-sm text-muted">{scheme.summary}</p>
          <p className="mt-2 max-w-2xl text-xs text-muted">The starting rules were written by hand from the scheme&apos;s first government order. Every later change was made by the Niyam agent from a newer order and approved by a person. Press Why? to see which. <Info id="provenance" /></p>'''),
])

edit("app/developers/page.tsx", [
    ('intro={<>Read endpoints work without a key at a low rate limit.',
     'intro={<>This page is for programmers. Not a developer? <a href="/check/" className="font-medium text-accent underline underline-offset-2">Check your eligibility here</a> instead. An API <Info id="api-key" /> lets other software ask Niyam questions. Read endpoints work without a key at a low rate limit.'),
])
print("pass3 done")
