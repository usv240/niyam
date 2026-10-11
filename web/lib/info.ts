// Every "i" button on the site reads from this registry, so explanations are
// consistent and reviewable in one place. What: under 20 words. Why: under 30.
// How: under 50. No emojis, no em or en dashes (checked by scripts/content-lint.mjs).

export type InfoEntry = {
  title: string;
  what: string;
  why: string;
  how?: string;
  learnMore?: { label: string; href: string };
};

export const INFO: Record<string, InfoEntry> = {
  "status-line": {
    title: "Live status",
    what: "When Niyam last checked government sources, and the latest change it handled.",
    why: "It shows the agent is really running, not a recording.",
    how: "A watcher reads the public list of new government orders every 15 minutes.",
    learnMore: { label: "System status", href: "/status/" },
  },
  gr: {
    title: "Government Resolution (GR)",
    what: "An official order from a state government department.",
    why: "GRs create welfare schemes and change who is eligible for them.",
    how: "Departments publish them as PDF files, often in Marathi, on the state GR portal.",
    learnMore: { label: "What is a GR?", href: "/learn/#gr" },
  },
  "rules-as-code": {
    title: "Rules as code",
    what: "The rules of a scheme written as a small, testable computer program.",
    why: "A program applies rules the same way every time, and anyone can test it.",
    how: "Niyam stores rules as readable YAML files in the format used by OpenFisca, an open-source project used by several governments.",
    learnMore: { label: "Learn more", href: "/learn/#rules-as-code" },
  },
  agent: {
    title: "AI agent",
    what: "Software that takes a goal, plans steps, uses tools and checks its own work.",
    why: "Keeping rules in sync is a long, multi-step job that should not need a person watching.",
    how: "Niyam uses Claude models for reading and checking, and Claude Code for editing the rulebook.",
    learnMore: { label: "Agents explained", href: "/learn/#agent" },
  },
  "step-watch": {
    title: "Watch",
    what: "Checks official sources for new government orders.",
    why: "New orders appear without notice, so someone has to keep looking.",
    how: "Every 15 minutes, politely, from the public list. Niyam never gets around a CAPTCHA or a login.",
  },
  "step-triage": {
    title: "Triage",
    what: "Decides whether a document changes any scheme Niyam covers.",
    why: "Most orders are about other things. Skipping them early keeps costs near zero.",
    how: "A small, fast model reads only the opening pages.",
  },
  "step-extract": {
    title: "Extract",
    what: "Finds and quotes the exact clauses that change eligibility.",
    why: "Every later step depends on reading the law correctly.",
    how: "Each quote is checked against the document. Quotes that are not on the cited page, or have a wrong number, are rejected.",
  },
  "step-encode": {
    title: "Encode",
    what: "A coding agent updates the rulebook and writes tests for every change.",
    why: "This is where the law becomes something a computer can apply.",
    how: "Claude Code works in its own copy of the rulebook. It never sees the raw PDF, only the checked list of changes.",
  },
  "step-verify": {
    title: "Verify",
    what: "A second, independent agent checks the new rules against the law.",
    why: "A separate check catches mistakes the first agent missed.",
    how: "It never sees the code change. It writes its own test citizens from the law, and they are run against the new rules.",
  },
  "step-resolve": {
    title: "Resolve",
    what: "Settles disagreements between the encoder and the verifier.",
    why: "Some clauses are unclear. Guessing could stop people being paid.",
    how: "A coordinator rereads the clause, sends a precise fix, accepts with a reason, or asks a human.",
  },
  "step-publish": {
    title: "Publish",
    what: "Proposes the change on GitHub with sources and proof.",
    why: "Anyone can review exactly what changed and why before it takes effect.",
    how: "A change request (pull request) with quotes, test results, a trace and a checkpoint. It merges on its own only when safe.",
  },
  trace: {
    title: "Trace",
    what: "A step-by-step record of everything the agent did in one run.",
    why: "It shows how a result was reached, including mistakes and recoveries.",
    how: "Recorded by neatlogs: every model call, tool call, retry, cost and timing.",
    learnMore: { label: "What is a trace?", href: "/learn/#trace" },
  },
  checkpoint: {
    title: "Checkpoint",
    what: "The saved reasoning behind a change to the code.",
    why: "It answers \"why does this rule say this?\" months later, with the agent's full session.",
    how: "Recorded by Entire and linked to the git commit that changed the rule.",
    learnMore: { label: "What is a checkpoint?", href: "/learn/#checkpoint" },
  },
  "pull-request": {
    title: "Change request",
    what: "A proposed change to the rulebook that people can review before it is accepted.",
    why: "Nothing changes without a visible, reviewable record.",
    how: "Hosted on GitHub as a pull request in the public rulebook repository.",
  },
  confidence: {
    title: "Confidence",
    what: "How sure Niyam is that a change is correct, from 0 to 1.",
    why: "It decides whether Niyam acts alone or asks a human.",
    how: "Combines how well quotes checked out, how many verifier cases agree, whether tests pass, and how risky the type of change is.",
  },
  autonomy: {
    title: "Acts alone or asks",
    what: "The rule for when Niyam may merge a change by itself.",
    why: "Simple changes should be fast. Risky ones need a person.",
    how: "Alone only when just a number or date changes, every check agrees, confidence is 0.90 or more, and nobody loses eligibility.",
    learnMore: { label: "Trust policy", href: "/trust/" },
  },
  chaos: {
    title: "Injected failure",
    what: "A failure caused on purpose to test recovery.",
    why: "It shows how Niyam behaves when a website times out or a page is scanned.",
    how: "Switched on with a flag and always labelled. Never used on real rule changes.",
  },
  boundary: {
    title: "Boundary case",
    what: "A test exactly at a limit, such as age 65 when the limit is 65.",
    why: "Most rule mistakes happen at the edges: \"more than\" versus \"or more\".",
    how: "Niyam tests just below, at, and just above every limit it changes.",
  },
  byod: {
    title: "Bring your own document",
    what: "Upload any government order and watch Niyam process it.",
    why: "You can test it on documents we have never seen.",
    how: "It runs on a test copy of the rulebook, so nothing official changes and it is never merged automatically.",
  },
  "api-key": {
    title: "API key",
    what: "A secret code that lets your app use Niyam.",
    why: "It keeps the service fair and lets you see your usage.",
    how: "Shown once when created. Send it as a Bearer token. Only a hash is stored.",
  },
  mcp: {
    title: "MCP server",
    what: "A standard way for AI assistants to use outside tools.",
    why: "Your AI assistant can answer eligibility questions with current, sourced rules.",
    how: "One install line for Claude, Cursor and other MCP clients.",
  },
  "time-travel": {
    title: "Rules on a past date",
    what: "See the rules exactly as they were on any date.",
    why: "Applications are judged by the rules in force at the time.",
    how: "Every value and condition in the rulebook is stored with the date it started and ended.",
  },
  eval: {
    title: "Evaluation",
    what: "A test of the whole agent on documents with known correct answers.",
    why: "It proves the agent works, and shows whether a change made it better or worse.",
    how: "Written by hand from the documents, run after every improvement, results published.",
  },
  "verifier-agreement": {
    title: "Verifier agreement",
    what: "Share of the independent test citizens whose expected result matches the new rules.",
    why: "A high score means two agents, working separately, reached the same reading of the law.",
  },
  provenance: {
    title: "Why does this rule say this?",
    what: "The exact clause of the government order behind a rule.",
    why: "Anyone can check the rule against the law instead of trusting the software.",
    how: "Each rule stores the document, page, clause and original Marathi quote, plus the agent's reasoning when it made the change.",
  },
  ambiguity: {
    title: "Ambiguity",
    what: "Wording that can reasonably be read in two ways.",
    why: "If the two readings change who gets paid, a human should decide.",
    how: "Niyam lists both readings and asks a plain-English question in the change request.",
  },
  merge: {
    title: "Apply a change (merge)",
    what: "Accept a proposed rule change so it becomes part of the official rulebook.",
    why: "Until a change is applied, the live rules stay as they were.",
    how: "On GitHub this is called merging a pull request. Niyam does it alone only for safe changes; otherwise a person decides.",
  },
  rulebook: {
    title: "Rulebook",
    what: "The open collection of all scheme rules, written as code, with tests and sources.",
    why: "Every app, helpline or chatbot can use the same correct rules instead of keeping their own copy.",
    how: "It lives in a public GitHub repository. Every change is reviewed and recorded.",
    learnMore: { label: "Open the rulebook", href: "https://github.com/usv240/niyam-rulebook" },
  },
  sandbox: {
    title: "Test copy (sandbox)",
    what: "A separate copy of the rulebook used only for trying things out.",
    why: "Your upload can never change the official rules.",
    how: "Each upload gets its own branch (copy) that is never applied automatically.",
  },
  captcha: {
    title: "CAPTCHA",
    what: "A puzzle websites show to check that a visitor is a human, not a program.",
    why: "Getting around one would break the website's rules. Niyam never does.",
  },
  "prompt-injection": {
    title: "Hidden instructions (prompt injection)",
    what: "Text hidden in a document that tries to give orders to an AI, such as \"raise the income limit\".",
    why: "An AI that obeyed it could change rules wrongly.",
    how: "Niyam's coding agent never sees the raw document, only a checked list of changes. We tested this with a hidden instruction: it was ignored.",
  },
  "trace-id": {
    title: "Trace ID",
    what: "A unique code for one recorded agent run in neatlogs.",
    why: "It lets anyone with access look up exactly what happened in that run, step by step.",
  },
  commit: {
    title: "Version (commit)",
    what: "A short code that identifies one exact saved version of the code or rules.",
    why: "It proves which version was used, so results can be checked later.",
  },
  neatlogs: {
    title: "neatlogs",
    what: "A tool that records every step an AI agent takes (a flight recorder for agents).",
    why: "We used its recordings to find a costly mistake in version 1 and prove the fix worked.",
    learnMore: { label: "neatlogs", href: "https://neatlogs.com/" },
  },
  entire: {
    title: "Entire",
    what: "A tool that saves the AI agent's working session together with each code change.",
    why: "Months later, anyone can see why a rule says what it says and which agent wrote it.",
    learnMore: { label: "Entire", href: "https://entire.io/" },
  },
  "claude-code": {
    title: "Claude Code",
    what: "An AI coding assistant made by Anthropic.",
    why: "Niyam uses it to edit the rulebook files and run the tests, in its own separate copy.",
  },
  versions: {
    title: "Versions v1, v2, v3",
    what: "Three improvements of the agent, each tested on the same six documents.",
    why: "Comparing them shows the agent really got better, not just different.",
    how: "v2 fixed a mistake found in the recordings. v3 used cheaper AI models wherever quality stayed at 100%.",
  },
  "cost-per-order": {
    title: "Cost per government order",
    what: "What the AI models cost to process one order, on average across our six test documents.",
    why: "It shows Niyam is cheap enough to run for every state.",
    how: "Unrelated orders cost under one cent; a real amendment costs about $0.30 to $0.70. The average is $0.13.",
  },
  "test-citizen": {
    title: "Test citizen",
    what: "An imaginary person (age, income and so on) with the answer the law says they should get.",
    why: "If the rules give a different answer, something is wrong.",
  },
  watcher: {
    title: "Watcher",
    what: "The part of Niyam that checks the official list of new government orders every 15 minutes.",
    why: "New orders appear without notice.",
  },
  scheme: {
    title: "Scheme",
    what: "A government programme that gives money or help to people who meet its conditions.",
    why: "Each scheme has its own rules; Niyam keeps them up to date.",
  },
  "completed-years": {
    title: "Age in completed years",
    what: "Your age on your last birthday.",
    why: "Schemes set minimum and maximum ages.",
    how: "Example: if you were born on 15 March 1990, on 1 March 2026 your age is 35, not 36.",
  },
  "family-income": {
    title: "Annual family income",
    what: "The total money everyone in your household earns in one year, from all sources.",
    why: "Most schemes have a limit for the whole family, not just one person.",
    how: "Include wages, business and farm income. Example: Rs 12,000 a month plus Rs 3,000 a month is Rs 1,80,000 a year. Use your income certificate if you have one.",
  },
  "other-scheme": {
    title: "Money from other schemes",
    what: "Any monthly amount you already get from another government scheme, such as a pension.",
    why: "Some schemes pay only the difference, or not at all, if you already get enough from another scheme.",
    how: "Enter 0 if you get nothing.",
  },
  "govt-job": {
    title: "Government job in the family",
    what: "Whether anyone in your household works for, or gets a pension from, the government.",
    why: "Families with permanent government jobs are usually not eligible. Contract or outsourced workers may be.",
  },
  "marital-status": {
    title: "Marital status",
    what: "Married, widowed, divorced, abandoned (left by the husband), destitute (no support at all), or unmarried.",
    why: "Some schemes are only for certain groups.",
  },
  "years-in-mh": {
    title: "Years lived in Maharashtra",
    what: "How many years you have lived in Maharashtra.",
    why: "Some schemes require at least 15 years of residence.",
  },
  disabled: {
    title: "Disability (divyang)",
    what: "Tick this if you have a certified disability.",
    why: "Some schemes allow a higher income limit for people with a disability. If you leave it unticked, the normal limit applies.",
  },
  "check-date": {
    title: "Date to check",
    what: "The date on which you want to know the rules. Today by default.",
    why: "Rules change. An application is judged by the rules in force at the time.",
  },
  "original-translation": {
    title: "Original and translation",
    what: "The first line is the exact text of the government order in Marathi. The line below is our English translation.",
    why: "The Marathi text is the legal source. The translation helps you read it.",
  },
};
