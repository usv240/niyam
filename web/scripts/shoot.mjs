// Screenshots of every page at phone and desktop sizes, in light and dark.
// Usage: node scripts/shoot.mjs http://localhost:8811 out-dir [paths...]
import { chromium } from "playwright-core";

const [base = "http://localhost:8811", outDir = "shots", ...paths] = process.argv.slice(2);
const pages = paths.length ? paths : ["/"];
const browser = await chromium.launch({ channel: "chrome" });
const sizes = [{ name: "phone", width: 390, height: 844, mobile: true }, { name: "desktop", width: 1440, height: 900, mobile: false }];
for (const scheme of ["light", "dark"]) {
  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, isMobile: s.mobile, hasTouch: s.mobile, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const p of pages) {
      await page.goto(base + p, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const name = `${outDir}/${p.replace(/\//g, "_") || "_"}-${s.name}-${scheme}.png`;
      await page.screenshot({ path: name, fullPage: true });
      console.log(`${name} horizontal-overflow=${overflow}px`);
    }
    await ctx.close();
  }
}
await browser.close();
