// Browser port of the rulebook engine (niyam_rulebook/engine.py and safe_eval.py).
// The same whitelisted expressions run here, so the eligibility checker works
// with no server at all, from the rulebook snapshot exported at build time.

export type Source = {
  doc?: string; page?: number; clause?: string; quote?: string; quote_en?: string;
};
export type Condition = {
  id: string; text: string; when: string; kind?: string; source: Source;
  valid_from: string; valid_until: string | null;
};
export type ParamValue = { start: string; value: unknown; reference: Source };
export type Parameter = { description: string; unit: string | null; values: ParamValue[] };
export type Scheme = {
  id: string; name: string; name_mr?: string; name_hi?: string; department: string; summary: string;
  launched: string; apply_url?: string; benefit?: { monthly_inr?: string; source?: Source };
  conditions: Condition[]; parameters: Record<string, Parameter>;
};
export type DocInfo = { code?: string; date?: string; title_en?: string; title_mr?: string; url?: string; department?: string };
export type FieldSpec = { type: string; values?: string[]; default: unknown; label?: string };
export type Snapshot = {
  generated_at: string; sources: Record<string, DocInfo>; person_schema: Record<string, FieldSpec>;
  schemes: Record<string, Scheme>;
};

// ------------------------------------------------------------------ parser
type Tok = { t: "num" | "str" | "name" | "op" | "eof"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([A-Za-z_][A-Za-z0-9_]*)|(==|!=|<=|>=|[<>()\[\],.+\-*/]))/y;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while (re.lastIndex < src.length) {
    const start = re.lastIndex;
    m = re.exec(src);
    if (!m || m.index !== start) {
      if (src.slice(start).trim() === "") break;
      throw new Error(`Cannot read rule expression near "${src.slice(start, start + 12)}"`);
    }
    if (m[1]) out.push({ t: "num", v: m[1] });
    else if (m[2]) out.push({ t: "str", v: m[2].slice(1, -1) });
    else if (m[3]) out.push({ t: "name", v: m[3] });
    else if (m[4]) out.push({ t: "op", v: m[4] });
  }
  out.push({ t: "eof", v: "" });
  return out;
}

type Env = { person: Record<string, unknown>; params: Record<string, unknown> };
const FUNCS: Record<string, (...a: number[]) => number> = {
  min: Math.min, max: Math.max, abs: Math.abs,
};

class Parser {
  private i = 0;
  constructor(private toks: Tok[], private env: Env) {}
  private peek(v?: string) { const k = this.toks[this.i]; return v === undefined ? k : k.v === v && (k.t === "op" || k.t === "name") ; }
  private next() { return this.toks[this.i++]; }
  private expect(v: string) { const k = this.next(); if (k.v !== v) throw new Error(`Expected ${v}`); }

  parse(): unknown { const v = this.or(); if (this.toks[this.i].t !== "eof") throw new Error("Unexpected text in rule"); return v; }
  private or(): unknown { let l = this.and(); while (this.peek("or")) { this.next(); const r = this.and(); l = Boolean(l) || Boolean(r); } return l; }
  private and(): unknown { let l = this.not(); while (this.peek("and")) { this.next(); const r = this.not(); l = Boolean(l) && Boolean(r); } return l; }
  private not(): unknown { if (this.peek("not") && !(this.toks[this.i + 1]?.v === "in")) { this.next(); return !this.not(); } return this.cmp(); }
  private cmp(): unknown {
    let left = this.add();
    let result = true;
    let any = false;
    for (;;) {
      let op: string | null = null;
      const k = this.toks[this.i];
      if (k.t === "op" && ["==", "!=", "<", "<=", ">", ">="].includes(k.v)) { op = k.v; this.next(); }
      else if (k.v === "in" && k.t === "name") { op = "in"; this.next(); }
      else if (k.v === "not" && this.toks[this.i + 1]?.v === "in") { op = "not in"; this.i += 2; }
      if (!op) break;
      any = true;
      const right = this.add();
      result = result && compare(op, left, right);
      left = right;
    }
    return any ? result : left;
  }
  private add(): unknown {
    let l = this.mul();
    while (this.peek("+") || this.peek("-")) { const op = this.next().v; const r = this.mul(); l = op === "+" ? (l as number) + (r as number) : (l as number) - (r as number); }
    return l;
  }
  private mul(): unknown {
    let l = this.unary();
    while (this.peek("*") || this.peek("/")) { const op = this.next().v; const r = this.unary(); l = op === "*" ? (l as number) * (r as number) : (l as number) / (r as number); }
    return l;
  }
  private unary(): unknown { if (this.peek("-")) { this.next(); return -(this.unary() as number); } return this.atom(); }
  private atom(): unknown {
    const k = this.next();
    if (k.t === "num") return Number(k.v);
    if (k.t === "str") return k.v;
    if (k.t === "op" && k.v === "(") { const v = this.or(); this.expect(")"); return v; }
    if (k.t === "op" && k.v === "[") {
      const items: unknown[] = [];
      if (!this.peek("]")) { do { items.push(this.or()); } while (this.peek(",") && this.next()); }
      this.expect("]");
      return items;
    }
    if (k.t === "name") {
      if (k.v === "True") return true;
      if (k.v === "False") return false;
      if (k.v === "None") return null;
      if (k.v in FUNCS || k.v === "len") {
        this.expect("(");
        const args: unknown[] = [];
        if (!this.peek(")")) { do { args.push(this.or()); } while (this.peek(",") && this.next()); }
        this.expect(")");
        if (k.v === "len") return (args[0] as unknown[]).length;
        return FUNCS[k.v](...(args as number[]));
      }
      if (k.v === "person" || k.v === "params") {
        this.expect(".");
        const name = this.next().v;
        const bag = this.env[k.v];
        if (!(name in bag)) throw new Error(`Unknown ${k.v === "person" ? "person field" : "parameter"} ${name}`);
        return bag[name];
      }
    }
    throw new Error(`Unexpected "${k.v}" in rule`);
  }
}

function compare(op: string, a: unknown, b: unknown): boolean {
  switch (op) {
    case "==": return a === b;
    case "!=": return a !== b;
    case "<": return (a as number) < (b as number);
    case "<=": return (a as number) <= (b as number);
    case ">": return (a as number) > (b as number);
    case ">=": return (a as number) >= (b as number);
    case "in": return (b as unknown[]).includes(a);
    case "not in": return !(b as unknown[]).includes(a);
  }
  return false;
}

export function evaluate(expr: string, person: Record<string, unknown>, params: Record<string, unknown>): unknown {
  return new Parser(tokenize(expr), { person, params }).parse();
}

// ------------------------------------------------------------------ engine
export function paramValueAt(p: Parameter, on: string): ParamValue | null {
  let cur: ParamValue | null = null;
  for (const v of p.values) if (v.start <= on) cur = v;
  return cur;
}

export function paramsAt(s: Scheme, on: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, p] of Object.entries(s.parameters)) { const v = paramValueAt(p, on); if (v) out[k] = v.value; }
  return out;
}

export function activeConditions(s: Scheme, on: string): Condition[] {
  return s.conditions.filter((c) => c.valid_from <= on && (!c.valid_until || on <= c.valid_until));
}

function fmt(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "number" && v >= 1000) return v.toLocaleString("en-IN");
  return String(v);
}

export function renderText(text: string, params: Record<string, unknown>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? fmt(params[k]) : m));
}

export function normalisePerson(schema: Record<string, FieldSpec>, person: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, spec] of Object.entries(schema)) out[k] = person[k] ?? spec.default;
  return out;
}

export type Reason = { id: string; text: string; met: boolean; source: Source; kind?: string };
export type SchemeResult = { scheme: Scheme; eligible: boolean; inForce: boolean; monthly: number; reasons: Reason[] };

export function evaluateScheme(snap: Snapshot, s: Scheme, person: Record<string, unknown>, on: string): SchemeResult {
  const p = normalisePerson(snap.person_schema, person);
  if (on < s.launched) return { scheme: s, eligible: false, inForce: false, monthly: 0, reasons: [] };
  const params = paramsAt(s, on);
  const reasons: Reason[] = activeConditions(s, on).map((c) => ({
    id: c.id, kind: c.kind, text: renderText(c.text, params), met: Boolean(evaluate(c.when, p, params)), source: c.source,
  }));
  const eligible = reasons.every((r) => r.met);
  let monthly = 0;
  if (eligible && s.benefit?.monthly_inr) monthly = Number(evaluate(s.benefit.monthly_inr, p, params));
  return { scheme: s, eligible, inForce: true, monthly, reasons };
}

// All dates on which any rule of a scheme changed, for the time travel slider.
export function changeDates(s: Scheme): string[] {
  const d = new Set<string>();
  for (const p of Object.values(s.parameters)) for (const v of p.values) d.add(v.start);
  for (const c of s.conditions) { d.add(c.valid_from); if (c.valid_until) d.add(nextDay(c.valid_until)); }
  return [...d].sort();
}

export function nextDay(iso: string): string {
  const t = new Date(iso + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
