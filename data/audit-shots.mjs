import { chromium } from "../web/node_modules/playwright-core/index.mjs";
const out = process.argv[2];
const b = await chromium.launch({ channel: "chrome" });
const shots = [["home-full", "/", 1280, 800, "light", true], ["judges-full", "/judges/", 1280, 800, "light", true], ["demo-top", "/demo/", 1280, 800, "dark", false], ["phone-home", "/", 390, 844, "dark", false], ["phone-demo", "/demo/", 390, 844, "light", false], ["phone-judges", "/judges/", 390, 844, "light", false]];
for (const [n, p, w, h, sc, full] of shots) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: sc, isMobile: w < 800, hasTouch: w < 800 });
  const pg = await ctx.newPage(); await pg.goto("http://localhost:8811" + p, { waitUntil: "networkidle" });
  await pg.screenshot({ path: `${out}/${n}.png`, fullPage: full }); await ctx.close();
}
await b.close();
