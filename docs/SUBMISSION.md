# Submission kit

Everything to post and record, with real numbers from our runs. No emojis, no em dashes. Tag #neatHack on every post. Check screenshots for keys, emails and account IDs before posting.

## Posts (in order)

1. **Start.** "Starting #neatHack. In India, welfare eligibility is decided by code, but the rules live in Marathi PDFs that change all the time. We are building Niyam: an agent that reads new government orders and updates the rule code itself, with proof for every line." Image: the landing page hero.
2. **First real run.** "Niyam read the real 3 July 2024 Ladki Bahin amendment (Marathi PDF), found all 6 eligibility changes, skipped 5 procedural ones, edited the rule code, wrote 20 test citizens and opened a pull request. Built with @neatlogs, Entire and Claude." Image: PR #2.
3. **The hard part.** "The PDF's text layer is broken: the vowel sign ि comes out as ह. So Niyam checks every quote on a consonant skeleton and requires numbers to match exactly. A fake quote with 75 instead of 65 is rejected." Image: the citation test output.
4. **Traces found a bug.** "v1 worked, but the neatlogs trace showed one run costing $3.05: the coordinator ruled three different ways on the same case. Root cause: we never showed it the benefit formula. Fixed in v2." Image: neatlogs trace.
5. **Before and after.** "v1 to v2 on 6 cases: correct act-alone-or-ask decisions 67% to 100%, outcome accuracy 97.6% to 100%, cost per document $0.88 to $0.29, time 110 s to 54 s. Small sample, real numbers." Image: results chart.
6. **Entire thread (teaching).** "How we use Entire checkpoints as legal provenance for welfare rules. 1/ Every rule the agent writes is a commit with the agent's full session attached. 2/ `entire why file:line` tells you which agent, model and session wrote any line. 3/ On the website, every rule has a Why? button: the Marathi clause, and who wrote the line. 4/ Accountability you can audit, the opposite of a black-box eligibility algorithm." Image: the Why popover.
7. **Trust.** "Niyam merges on its own only when a number or date changes and every check agrees. Anything that removes people from a scheme goes to a human. We tested a hidden prompt injection in a PDF: ignored, closed for $0.002." Image: trust page.
8. **Try it.** "Check eligibility in English, Hindi or Marathi, with the source of every reason. It runs in your browser. Or upload any government order and watch the agent work." Image: phone screenshot of the checker.
9. **Submission** (see below).
10. **Thanks and lessons.** "Three lessons from building an agent you can trust with welfare rules: give it the whole rule, not part of it; make the checker blind to the change; and measure, because our first improvement number was wrong and we caught it."

## Demo video script (target 2:45, captions on)

| Time | Scene | Voiceover |
|---|---|---|
| 0:00 | Telangana headline, then a Marathi GR | "When welfare code drifts away from the law, the people who depend on it pay. In Telangana, an eligibility algorithm cancelled more than 1.8 million food cards, and nobody could check why." |
| 0:15 | Landing page | "Niyam is an agent that reads every new government order and updates the eligibility rules, written as code, by itself. Every line links back to the clause it came from." |
| 0:30 | Demo page, press Play; neatlogs trace alongside | "This is the real Ladki Bahin amendment, in Marathi. Niyam decides it matters, quotes the exact clauses, and checks every quote against the PDF. Claude Code updates the rulebook and writes twenty test citizens. Then a separate verifier, on a different model and blind to the change, writes its own test citizens from the law. Sixteen of sixteen agree." |
| 1:15 | Explore page, open Why? | "Click any rule and ask why. Here is the Marathi clause, and from Entire, which agent and model wrote this exact line, in which session." |
| 1:35 | Scanned case trace | "Real documents are messy. This one is a scan with no text. Niyam notices, transcribes it, and still gets every change right." |
| 1:50 | Results chart and v1 trace | "We measured it. Version 1 worked, but its trace showed a three-dollar loop. The cause: the verifier never saw the benefit formula. Version 2 fixed it: correct decisions from 67 to 100 percent, cost per document from 88 cents to 29." |
| 2:15 | Trust page and PR | "Niyam acts alone only on simple, verified changes. This one removes some people from the scheme, so it waits for a human." |
| 2:30 | Checker in Marathi, developers page | "Anyone can check eligibility in Marathi, Hindi or English, or plug Niyam into their app or AI assistant." |
| 2:42 | Logo | "Niyam. When the law changes, the code changes with it." |

Recording: 1920 by 1080, browser zoom 125%, one segment in dark mode and one in light, captions burned in.

## Submission tweet (quote-tweet the official neatlogs post, Mon 12 Oct, 19:00 to 23:55 IST)

```
Team USV | Ujwal Vanjare | Niyam

An AI agent that reads new government orders and keeps welfare eligibility rules, written as code, in sync with the law. Every line links to the clause it came from.

Demo: <video link>
Live: <site link>
Repo: https://github.com/usv240/niyam

#neatHack @neatlogs
```

## Checklist before submitting

- [ ] Website deployed and tested in incognito on a phone and a laptop, light and dark
- [ ] Demo video uploaded; link added to `web/lib/site.ts` (`video`) and README
- [ ] cfo.ai plan exported to `business/business-plan.pdf`
- [ ] neatlogs screenshots in `evidence/`
- [ ] Entire repositories imported at entire.io so checkpoint links open
- [ ] `hackathon.md` final entry and "Submission status"
- [ ] All links open without logging in
