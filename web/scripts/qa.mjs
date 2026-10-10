// Every route, phone and desktop, light and dark: horizontal overflow and axe
// accessibility violations (serious and critical). Exit 1 if anything fails.
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:8811";
const routes = ["/", "/how-it-works/", "/demo/", "/explore/", "/check/", "/try/", "/developers/", "/judges/", "/learn/", "/trust/", "/status/"];
const browser = await chromium.launch({ channel: "chrome" });
let problems = 0;
for (const scheme of ["light", "dark"]) {
  for (const [name, w, h] of [["phone", 390, 844], ["desktop", 1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, colorScheme: scheme });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const r of routes) {
      await page.goto(base + r, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const bad = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
      if (overflow > 0 || bad.length || errors.length) {
        problems++;
        console.log(`${scheme} ${name} ${r}: overflow=${overflow}px errors=${errors.length}`);
        for (const v of bad) console.log(`   ${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target?.join(" ")} ${v.nodes[0]?.failureSummary?.split("\n")[1] ?? ""}`);
        errors.splice(0).forEach((e) => console.log(`   pageerror: ${e}`));
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(problems ? `qa: ${problems} page view(s) with problems` : "qa: all pages ok");
process.exit(problems ? 1 : 0);
