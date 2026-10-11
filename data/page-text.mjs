import { writeFileSync } from "node:fs";
import { chromium } from "../web/node_modules/playwright-core/index.mjs";
const routes = ["/", "/how-it-works/", "/demo/", "/explore/", "/check/", "/try/", "/developers/", "/judges/", "/learn/", "/trust/", "/status/"];
const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const out = {};
for (const r of routes) {
  await p.goto("http://localhost:8811" + r, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  const info = await p.locator("button[aria-label^='More about']").count();
  out[r] = { text: (await p.locator("main").innerText()).replace(/\n{3,}/g, "\n\n"), info_buttons: info };
}
await b.close();
writeFileSync("data/page-text.json", JSON.stringify(out, null, 1));
for (const [r, v] of Object.entries(out)) console.log(r.padEnd(15), v.text.length, "chars,", v.info_buttons, "info buttons");
