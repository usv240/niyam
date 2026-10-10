export const SITE = {
  name: "Niyam",
  tagline: "When the law changes, the code changes with it.",
  description:
    "An AI agent that reads new government orders and keeps welfare eligibility rules, written as code, in sync with the law. Every rule links to the clause it came from.",
  repo: "https://github.com/usv240/niyam",
  rulebookRepo: "https://github.com/usv240/niyam-rulebook",
  rulebookSlug: "usv240/niyam-rulebook",
  firstPr: "https://github.com/usv240/niyam-rulebook/pull/2",
  video: "",
  businessPlan: "https://github.com/usv240/niyam/tree/main/business",
  buildLog: "https://github.com/usv240/niyam/blob/main/hackathon.md",
  apiBase: process.env.NEXT_PUBLIC_API_BASE || "",
};

export const NAV = [
  { href: "/how-it-works/", label: "How it works" },
  { href: "/demo/", label: "Demo" },
  { href: "/explore/", label: "Explore rules" },
  { href: "/check/", label: "Check eligibility" },
  { href: "/developers/", label: "Developers" },
  { href: "/learn/", label: "Learn" },
];

export const checkpointUrl = (sha: string) => `https://entire.io/gh/${SITE.rulebookSlug}/commit/${sha}`;
