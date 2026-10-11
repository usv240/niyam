# Submission kit

Everything to post and record, with real numbers from our runs. No emojis, no em dashes. Tag #neatHack on every post. Check screenshots for keys, emails and account IDs before posting.

## Posts (in order)

1. **Start.** "Starting #neatHack. In India, welfare eligibility is decided by code, but the rules live in Marathi PDFs that change all the time. We are building Niyam: an agent that reads new government orders and updates the rule code itself, with proof for every line." Image: the landing page hero.
2. **First real run.** "Niyam read the real 3 July 2024 Ladki Bahin amendment (Marathi PDF), found all 6 eligibility changes, skipped 5 procedural ones, edited the rule code, wrote 20 test citizens and opened a pull request. Built with @neatlogs, Entire and Claude." Image: PR #2.
3. **The hard part.** "The PDF's text layer is broken: the vowel sign ि comes out as ह. So Niyam checks every quote on a consonant skeleton and requires numbers to match exactly. A fake quote with 75 instead of 65 is rejected." Image: the citation test output.
4. **Traces found a bug.** "v1 worked, but the neatlogs trace showed one run costing $3.05: the coordinator ruled three different ways on the same case. Root cause: we never showed it the benefit formula. Fixed in v2." Image: neatlogs trace.
5. **Before and after.** "v1 to v3 on the same 6 cases: correct act-alone-or-ask decisions 67% to 100%, outcome accuracy 97.6% to 100%, cost per document $0.88 to $0.13, time 110 s to 40 s. Small sample, real numbers." Image: `evidence/screens/results-desktop-dark.png`.
5b. **Cheaper models, chosen by measurement.** "Per-stage costs showed our coding agent was 56% of spend. Haiku 5.5 as the coding agent: same 100% quality, $0.32 to $0.05 per amendment. Haiku for reading the law: rejected, it missed a real age-limit change. Measure, do not guess." Image: results chart.
5c. **A second real scheme, and the agent acting alone.** "Niyam onboarded Sanjay Gandhi Niradhar from a 56-page Marathi order. Its real 2023 increase only raises payments, so the trust policy let the agent decide to merge on its own: 16 of 16 independent checks agree, confidence 0.98, 20 cents." Image: explorer with the scheme picker.
6. **Entire thread (teaching).** "How we use Entire checkpoints as legal provenance for welfare rules. 1/ Every rule the agent writes is a commit with the agent's full session attached. 2/ `entire why file:line` tells you which agent, model and session wrote any line. 3/ On the website, every rule has a Why? button: the Marathi clause, and who wrote the line. 4/ Accountability you can audit, the opposite of a black-box eligibility algorithm." Image: the Why popover.
7. **Trust.** "Niyam merges on its own only when a number or date changes and every check agrees. Anything that removes people from a scheme goes to a human. We tested a hidden prompt injection in a PDF: ignored, closed for $0.002." Image: trust page.
8. **Try it.** "Check eligibility in English, Hindi or Marathi, with the source of every reason. It runs in your browser. Or upload any government order and watch the agent work." Image: phone screenshot of the checker.
9. **Submission** (see below).
10. **Thanks and lessons.** "Three lessons from building an agent you can trust with welfare rules: give it the whole rule, not part of it; make the checker blind to the change; and measure, because our first improvement number was wrong and we caught it."

## Demo video

A complete draft is generated from the real site: `python video/make_video.py` (narration with a Windows voice, real recordings of the site and the public PR, captions burned in). Output: `video/out/niyam-demo-draft.mp4`, about 2:42. The narration for every scene is in `video/scenes.json`.

To make the final cut better than the draft:
1. Record your own voice reading each scene's `say` text (same order), or edit `video/scenes.json` and rebuild.
2. Insert a 10-second clip of the neatlogs dashboard (the v1 loop trace next to the v2 trace) at scene 06, and the Entire checkpoint page at scene 04. Those dashboards need your login, so I could not record them.
3. Upload to YouTube (unlisted is fine) and put the link in `web/lib/site.ts` (`video`) and the README.

## Submission tweet (quote-tweet the official neatlogs post, Mon 12 Oct, 19:00 to 23:55 IST)

```
Team USV | Ujwal Vanjare | Niyam

An AI agent that reads new government orders and keeps welfare eligibility rules, written as code, in sync with the law. Every line links to the clause it came from.

Demo: <video link>
Live: https://usv240.github.io/niyam/
Repo: https://github.com/usv240/niyam

#neatHack @neatlogs
```

## Checklist before submitting

- [ ] Website deployed and tested in incognito on a phone and a laptop, light and dark
- [ ] Demo video uploaded; link added to `web/lib/site.ts` (`video`) and README
- [x] cfo.ai plan built: https://cfo.ai/s/GaibuMRvDxWxdSHs
- [x] cfo.ai plan exported to `business/business-plan.pdf`
- [ ] neatlogs screenshots in `evidence/`
- [x] Entire repositories imported at entire.io so checkpoint links open (checked signed out)
- [ ] `hackathon.md` final entry and "Submission status"
- [ ] All links open without logging in
