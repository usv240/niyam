import { chromium } from "../web/node_modules/playwright-core/index.mjs";
const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
for (const url of ["https://usv240.github.io/niyam/status/", "https://44-197-246-188.sslip.io/status/"]) {
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  const txt = await p.locator("main").innerText();
  console.log(url, "->", /Live status unavailable/.test(txt) ? "API NOT REACHED" : (txt.match(/maharashtra gr[\s\S]{0,80}/i)?.[0] || txt.match(/Running jobs:[^\n]*/)?.[0] || "loaded").replace(/\s+/g, " "));
}
await b.close();
