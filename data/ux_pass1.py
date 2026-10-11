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


edit("components/checker.tsx", [
    ('{lang !== "en" && <p className="text-xs text-muted">{t("review_note", lang)}</p>}',
     '{lang !== "en" && <p className="text-xs text-muted"><Bi k="review_note" lang={lang} /></p>}'),
    ('<span className="text-base font-normal text-muted">{t("per_month", lang)}</span>',
     '<span className="text-base font-normal text-muted">{t("per_month", lang)}{lang !== "en" ? ` (${t("per_month", "en")})` : ""}</span>'),
])

(W / "lib" / "plain.ts").write_text('''// Plain-English names for the agent's technical labels.
export const CHANGE_TYPE: Record<string, string> = {
  parameter_update: "A number or list changed",
  condition_added: "New condition added",
  condition_removed: "Condition removed",
  condition_changed: "Condition reworded",
  definition_changed: "Definition changed",
  benefit_changed: "Amount paid changed",
  scheme_created: "New scheme created",
  scheme_closed: "Scheme closed",
  effective_date_changed: "Start date changed",
};

export const AFFECTS: Record<string, string> = {
  widens: "more people eligible",
  narrows: "fewer people eligible",
  mixed: "some gain, some lose",
  neutral: "no one gains or loses eligibility",
};

export const plainChange = (type: string) => CHANGE_TYPE[type] ?? type.replaceAll("_", " ");
export const plainAffects = (a: string) => {
  const s = AFFECTS[a] ?? a;
  return s.charAt(0).toUpperCase() + s.slice(1);
};
''', encoding="utf-8", newline="\n")

START_HERE = '''      {/* Start here: three paths for three kinds of visitor */}
      <section aria-labelledby="start-here" className="border-b border-border">
        <Container className="py-10">
          <h2 id="start-here" className="text-xl font-semibold">New here? Start with what you need</h2>
          <p className="mt-1 text-sm text-muted">Pick one. Every page has an About this page box, and i buttons that explain each term. Use EN, हिं or मरा at the top to read help in English, Hindi or Marathi.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {START_PATHS.map((x) => (
              <Link key={x.href} href={x.href} className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-accent">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-contrast">{x.n}</span>
                <span className="mt-3 font-semibold">{x.title}</span>
                <span lang="hi" className="deva text-sm text-muted">{x.hi}</span>
                <span className="mt-2 flex-1 text-sm text-muted">{x.body}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">{x.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Proof in numbers */}'''

START_PATHS = '''const START_PATHS = [
  { href: "/check/", n: "1", title: "I want to know if I can get money", hi: "क्या मुझे योजना का लाभ मिल सकता है?", body: "Answer a few questions in English, Hindi or Marathi. See which schemes you may qualify for, and why. About 2 minutes.", cta: "Check eligibility" },
  { href: "/how-it-works/", n: "2", title: "I want to understand how Niyam works", hi: "नियम कैसे काम करता है?", body: "Seven simple steps, from a new government order to correct rules, with a real example at each step.", cta: "See how it works" },
  { href: "/judges/", n: "3", title: "I am a judge or reviewer", hi: "जज और समीक्षकों के लिए", body: "A 3-minute path through the evidence: a real run, the real change request, and the measured results.", cta: "Go to the judges page" },
];

export default function Home() {'''

edit("app/page.tsx", [
    ('import { evals, pct, showcase, usd } from "@/lib/data";',
     'import { evals, pct, showcase, usd } from "@/lib/data";\nimport { plainAffects, plainChange } from "@/lib/plain";'),
    ('export default function Home() {', START_PATHS),
    ('<p className="mt-1 text-xs text-muted">{c.change_type.replaceAll("_", " ")}, {c.affects} eligibility</p>',
     '<p className="mt-1 text-xs text-muted">{plainChange(c.change_type)}: {plainAffects(c.affects).toLowerCase()}</p>'),
    ('''            <blockquote className="deva mt-4 border-l-4 border-accent pl-4 text-lg">{age.citation.quote_original}</blockquote>
            <p className="mt-2 pl-5 text-sm text-muted">{age.citation.quote_english}</p>''',
     '''            <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Original government order (Marathi) <Info id="original-translation" /></p>
            <blockquote lang="mr" className="deva mt-1 border-l-4 border-accent pl-4 text-lg">{age.citation.quote_original}</blockquote>
            <p className="mt-2 pl-5 text-sm text-muted"><span className="font-semibold text-text">English translation: </span>{age.citation.quote_english}</p>'''),
    ('<Stat value={usd(v3?.summary.cost_usd)} label="model cost per government order, down from $0.88" source="Measured on 6 cases" href="/judges/#evidence" />',
     '<Stat value={<>{usd(v3?.summary.cost_usd)} <Info id="cost-per-order" /></>} label="average AI cost per government order, down from $0.88" source="Measured on 6 test documents" href="/judges/#evidence" />'),
    ('<Stat value="25 of 25" label="hand-written tests passed after encoding a whole scheme from its founding order" source="From-scratch run" href="/judges/#agent" />',
     '<Stat value={<>25 of 25 <Info id="test-citizen" /></>} label="hand-written test citizens correct after the agent rebuilt a whole scheme from its founding order" source="From-scratch run" href="/judges/#agent" />'),
    ('''              Niyam reads every new government order <Info id="gr" /> and updates the welfare eligibility rules, written as code <Info id="rules-as-code" />, by itself.
              Every line links back to the clause it came from.''',
     '''              Niyam reads every new government order (called a GR) <Info id="gr" /> and updates the welfare eligibility rules, written as code <Info id="rules-as-code" />, by itself.
              Every rule links back to the exact sentence of the order it came from.'''),
    ("      {/* Proof in numbers */}", START_HERE),
])

edit("components/hero-visual.tsx", [
    ('<FileText className="h-4 w-4" aria-hidden /> Government order, page 2, clause 4(3)',
     '<FileText className="h-4 w-4" aria-hidden /> Government order (Marathi original), page 2, clause 4(3)'),
    ('<p className="mt-1 text-sm text-muted">Minimum age 21, until the maximum age of 65 is completed.</p>',
     '<p className="mt-1 text-sm text-muted"><span className="font-semibold text-text">English: </span>Minimum age 21, until the maximum age of 65 is completed.</p>'),
])

edit("components/demo-player.tsx", [
    ('import { Info } from "./info";', 'import { plainAffects, plainChange } from "@/lib/plain";\nimport { Info } from "./info";'),
    ('<Badge tone="neutral" icon={false}>{c.change_type.replaceAll("_", " ")}</Badge>',
     '<Badge tone="neutral" icon={false}>{plainChange(c.change_type)}</Badge>'),
    ('''                    <blockquote className="deva mt-2 border-l-4 border-accent pl-3 text-[15px]">{c.citation.quote_original}</blockquote>
                    <p className="mt-1 pl-4 text-xs text-muted">{c.citation.quote_english} (page {c.citation.page}, clause {c.citation.clause})</p>''',
     '''                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Original (Marathi) <Info id="original-translation" /></p>
                    <blockquote lang="mr" className="deva mt-1 border-l-4 border-accent pl-3 text-[15px]">{c.citation.quote_original}</blockquote>
                    <p className="mt-1 pl-4 text-xs text-muted"><span className="font-semibold text-text">English: </span>{c.citation.quote_english} (page {c.citation.page}, clause {c.citation.clause})</p>'''),
    ('{c.affects === "narrows" ? "Fewer people eligible" : c.affects === "widens" ? "More people eligible" : c.affects}',
     '{plainAffects(c.affects)}'),
])

edit("components/explorer.tsx", [
    ('''          {src.quote && <blockquote className="deva mt-3 border-l-4 border-accent pl-3 text-[15px]">{src.quote}</blockquote>}
          {src.quote_en && <p className="mt-1 pl-4 text-xs text-muted">{src.quote_en}</p>}''',
     '''          {src.quote && <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Original (Marathi)</p>}
          {src.quote && <blockquote lang="mr" className="deva mt-1 border-l-4 border-accent pl-3 text-[15px]">{src.quote}</blockquote>}
          {src.quote_en && <p className="mt-1 pl-4 text-xs text-muted"><span className="font-semibold text-text">English: </span>{src.quote_en}</p>}'''),
    ('<p className="deva text-muted">{scheme.name_mr}</p>',
     '<p lang="mr" className="deva text-muted">{scheme.name_mr} <span className="font-sans text-xs">(name in Marathi)</span></p>'),
])
print("pass1 done")
