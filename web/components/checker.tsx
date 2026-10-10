"use client";

import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { rulebookMain, rulebookProposed } from "@/lib/data";
import { LANGS, t, WHY_ASKED, type Lang } from "@/lib/i18n";
import { evaluateScheme, today, type SchemeResult } from "@/lib/rules";
import { Why } from "./explorer";
import { Badge } from "./ui";

type Form = Record<string, string | boolean>;

const ENUMS: Record<string, string[]> = {
  gender: ["female", "male", "other"],
  marital_status: ["married", "widowed", "divorced", "abandoned", "destitute", "unmarried"],
  family_govt_job: ["none", "regular", "contract", "outsourced", "volunteer", "pensioner"],
};
const BOOLS = ["family_income_tax_payer", "family_four_wheeler", "family_mp_mla", "other_unmarried_beneficiary_in_family"];

function Field({ id, lang, children }: { id: string; lang: Lang; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{t(id, lang)}</label>
      {children}
      {WHY_ASKED[id] && <p className="text-xs text-muted">Why we ask: {WHY_ASKED[id]}</p>}
    </div>
  );
}

const input = "min-h-11 rounded-lg border border-border bg-bg px-3 text-base";

export function Checker() {
  const [lang, setLang] = useState<Lang>("en");
  const [withProposed, setWithProposed] = useState(true);
  const [form, setForm] = useState<Form>({
    age: "34", gender: "female", state: true, marital_status: "married", annual_family_income: "180000",
    other_scheme_monthly_inr: "0", family_govt_job: "none", family_farm_land_acres: "0", has_bank_account: true,
    family_income_tax_payer: false, family_four_wheeler: false, family_mp_mla: false, other_unmarried_beneficiary_in_family: false,
    date: today(),
  });
  const [submitted, setSubmitted] = useState(false);
  const set = (k: string, v: string | boolean) => { setForm((f) => ({ ...f, [k]: v })); };
  const snap = withProposed ? rulebookProposed : rulebookMain;

  const results: SchemeResult[] = useMemo(() => {
    const person: Record<string, unknown> = {
      age: Number(form.age), gender: form.gender, state: form.state ? "MH" : "other", marital_status: form.marital_status,
      annual_family_income: Number(form.annual_family_income || 0), other_scheme_monthly_inr: Number(form.other_scheme_monthly_inr || 0),
      family_govt_job: form.family_govt_job, family_farm_land_acres: Number(form.family_farm_land_acres || 0),
      has_bank_account: Boolean(form.has_bank_account),
    };
    for (const b of BOOLS) person[b] = Boolean(form[b]);
    return Object.values(snap.schemes).map((s) => evaluateScheme(snap, s, person, String(form.date)));
  }, [form, snap]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <form className="space-y-5 rounded-2xl border border-border bg-surface p-5" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }); }} lang={lang}>
        <div role="radiogroup" aria-label="Language" className="inline-flex rounded-lg border border-border bg-bg p-0.5">
          {LANGS.map((l) => (
            <button type="button" role="radio" aria-checked={lang === l.code} key={l.code} onClick={() => setLang(l.code)}
              className={`min-h-10 rounded-md px-4 text-sm font-medium ${lang === l.code ? "bg-accent text-accent-contrast" : "text-muted"}`}>{l.label}</button>
          ))}
        </div>
        <p className="flex items-start gap-2 text-sm text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> {t("privacy", lang)}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="age" lang={lang}><input id="age" className={input} type="number" inputMode="numeric" min={0} max={120} value={String(form.age)} onChange={(e) => set("age", e.target.value)} /></Field>
          <Field id="gender" lang={lang}>
            <select id="gender" className={input} value={String(form.gender)} onChange={(e) => set("gender", e.target.value)}>
              {ENUMS.gender.map((v) => <option key={v} value={v}>{t(v, lang)}</option>)}
            </select>
          </Field>
          <Field id="marital_status" lang={lang}>
            <select id="marital_status" className={input} value={String(form.marital_status)} onChange={(e) => set("marital_status", e.target.value)}>
              {ENUMS.marital_status.map((v) => <option key={v} value={v}>{t(v, lang)}</option>)}
            </select>
          </Field>
          <Field id="annual_family_income" lang={lang}><input id="annual_family_income" className={input} type="number" inputMode="numeric" min={0} step={1000} value={String(form.annual_family_income)} onChange={(e) => set("annual_family_income", e.target.value)} /></Field>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={Boolean(form.state)} onChange={(e) => set("state", e.target.checked)} /> {t("state", lang)}</label>
        <details className="rounded-xl border border-border bg-bg p-4">
          <summary className="cursor-pointer text-sm font-semibold">{t("more", lang)}</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="family_govt_job" lang={lang}>
              <select id="family_govt_job" className={input} value={String(form.family_govt_job)} onChange={(e) => set("family_govt_job", e.target.value)}>
                {ENUMS.family_govt_job.map((v) => <option key={v} value={v}>{t(v, lang)}</option>)}
              </select>
            </Field>
            <Field id="other_scheme_monthly_inr" lang={lang}><input id="other_scheme_monthly_inr" className={input} type="number" min={0} value={String(form.other_scheme_monthly_inr)} onChange={(e) => set("other_scheme_monthly_inr", e.target.value)} /></Field>
            <Field id="family_farm_land_acres" lang={lang}><input id="family_farm_land_acres" className={input} type="number" min={0} step={0.5} value={String(form.family_farm_land_acres)} onChange={(e) => set("family_farm_land_acres", e.target.value)} /></Field>
            <Field id="date" lang={lang}><input id="date" className={input} type="date" value={String(form.date)} onChange={(e) => set("date", e.target.value)} /></Field>
          </div>
          <div className="mt-4 space-y-1">
            {["has_bank_account", ...BOOLS].map((b) => (
              <label key={b} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={Boolean(form[b])} onChange={(e) => set(b, e.target.checked)} /> {t(b, lang)}</label>
            ))}
          </div>
        </details>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={withProposed} onChange={(e) => setWithProposed(e.target.checked)} /> Include the rule change waiting for human review
        </label>
        <button type="submit" className="min-h-12 w-full rounded-lg bg-accent px-5 text-base font-semibold text-accent-contrast shadow-card">{t("check", lang)}</button>
        {lang !== "en" && <p className="text-xs text-muted">{t("review_note", lang)}</p>}
      </form>

      <section id="results" aria-live="polite" className="scroll-mt-24 space-y-4">
        {!submitted && <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">Results appear here. They update as you change answers.</p>}
        {submitted && results.map((r) => (
          <article key={r.scheme.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{lang === "en" ? r.scheme.name : r.scheme.name_mr}</h3>
                <p className="text-sm text-muted">{r.scheme.department}</p>
              </div>
              {!r.inForce ? <Badge tone="neutral">{t("not_in_force", lang)}</Badge> : r.eligible ? <Badge tone="success">{t("eligible", lang)}</Badge> : <Badge tone="danger">{t("not_eligible", lang)}</Badge>}
            </div>
            {r.eligible && <p className="mt-3 text-3xl font-semibold">Rs {r.monthly.toLocaleString("en-IN")} <span className="text-base font-normal text-muted">{t("per_month", lang)}</span></p>}
            {r.reasons.length > 0 && (
              <ul className="mt-4 space-y-2">
                {[...r.reasons].sort((a, b) => Number(a.met) - Number(b.met)).map((x) => (
                  <li key={x.id} className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2 text-sm">
                      {x.met ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label={t("met", lang)} /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label={t("not_met", lang)} />}
                      <span><span className="sr-only">{x.met ? t("met", lang) : t("not_met", lang)}: </span>{x.text}</span>
                    </p>
                    <Why snap={snap} src={x.source} label={t("why", lang)} provKey={`cond:${r.scheme.id}:${x.id}:${x.valid_from}`} />
                  </li>
                ))}
              </ul>
            )}
            {r.scheme.apply_url && <a href={r.scheme.apply_url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">{t("apply", lang)}</a>}
            <p className="mt-3 text-xs text-muted">{t("disclaimer", lang)}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
