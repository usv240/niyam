# Niyam business plan inputs (for cfo.ai)

The final business plan is built in cfo.ai and exported to this folder as `business-plan.pdf`. This file holds the inputs, so every number in the plan can be traced to a measurement or a labelled assumption.

## 1. What we sell

An always-current, sourced eligibility rulebook for Indian welfare schemes, delivered as:
- a free open rulebook and public website (a digital public good, builds trust and adoption),
- a paid API, webhooks and MCP server for organisations that answer "am I eligible?" at scale,
- private deployments for state departments.

## 2. Measured unit costs (from our own runs)

| Item | Value | Source |
|---|---|---|
| Cost per government order processed (v3, current) | $0.13 mean over 6 runs; $0.11 to $0.42 for relevant orders, under $0.001 for irrelevant ones | `evals/results/v3.json`, `extra/v3c.json`, neatlogs traces |
| Showcase run on the real amendment | $0.69 | job `job_20261010_bd059543`, PR #2 |
| Time per order | 54 s mean | `evals/results/v2.json` |
| Eligibility API call | No model call; under 50 ms of CPU | rules engine runs locally |
| Hosting (one t3.small, storage, IP) | about $20 per month | AWS pricing, us-east-1 |

Why the API is cheap to serve: models are only used when a new order arrives. Answering eligibility questions uses the compiled rulebook, so cost does not grow with API traffic.

## 3. Volume assumptions (labelled, to refine)

| Assumption | Value | Basis |
|---|---|---|
| GRs published per state per month, all departments | about 600 | The Maharashtra list showed hundreds of orders per month across about 55 departments |
| Share relevant to covered schemes | 5% | Most orders are budgets, transfers, committees |
| Relevant orders per state per month | about 30 | 600 x 5% |
| Model cost per state per month | about $10 | 30 x $0.30 plus about 570 irrelevant at $0.001 |
| States covered: year 1, year 2, year 3 | 3, 10, 28 plus central schemes | Plan |

## 4. Pricing (draft, to test in cfo.ai)

| Tier | Customer | Price | Includes |
|---|---|---|---|
| Open | Citizens, researchers, NGOs | Free | Website, rulebook, 1,000 API calls per day |
| Navigator | Benefits navigators, NGOs and helplines at scale | INR 9,999 per month | 100,000 calls, webhooks, MCP, freshness SLA under 24 hours |
| Platform | Fintechs, NBFCs, microfinance, CSR platforms | INR 49,999 per month | Unlimited calls, custom schemes, private rulebooks, support |
| Government | State departments | Annual contract, from INR 25 lakh | Private deployment on their GR feed, audit exports, training |

## 5. Who pays, and why

- **Benefits navigators** (for example Haqdarshak, which tracks 7,500+ schemes in 13 languages and updates rules by hand): pay to stop maintaining rules manually and to show the source of every answer.
- **Fintechs and NBFCs**: scheme-linked lending and insurance need correct eligibility; wrong answers are compliance risk.
- **CSR programmes**: companies funding welfare access want measurable, auditable reach.
- **Chatbot builders**: hundreds of "scheme finder" bots exist; each needs current rules. One MCP line makes Niyam their source of truth.
- **State departments**: an audit trail from GR to code, and early warning of conflicting orders.

## 6. Paste this into cfo.ai (Ari)

> Build a 36-month financial model for Niyam, an API company that keeps Indian welfare eligibility rules, written as code, in sync with government orders. Revenue tiers: Navigator INR 9,999 per month, Platform INR 49,999 per month, Government contracts from INR 25 lakh per year. Customer ramp (base case): Navigator 5, 25, 80 paying customers at the end of years 1, 2 and 3; Platform 1, 6, 20; Government 0, 2, 6. Downside case: half of base. Upside case: 1.5x base. Cost of goods: model cost of USD 10 per covered state per month (3, 10, 28 states by year end), hosting USD 20 per month rising to USD 600 per month in year 3, payment fees 2%. Team: 2 founders from month 1 at INR 1.2 lakh per month each, 1 engineer from month 6 at INR 1.5 lakh per month, 1 policy analyst from month 9 at INR 80,000 per month, 1 sales lead from month 12 at INR 1.5 lakh per month. Other operating costs INR 50,000 per month. Starting cash INR 25 lakh (grant or pre-seed). Show monthly revenue, gross margin, EBITDA, ending cash, runway, and the month cash flow turns positive, for downside, base and upside.

Export the result as `business-plan.pdf` into this folder and link it in the README and on the website.
