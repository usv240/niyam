import { chromium } from "../web/node_modules/playwright-core/index.mjs";
const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
for (const base of ["https://usv240.github.io/niyam", "https://44-197-246-188.sslip.io"]) {
  await p.goto(base + "/explore/", { waitUntil: "networkidle" });
  await p.getByRole("tab", { name: /Sanjay Gandhi/ }).click();
  await p.waitForTimeout(500);
  const h = await p.locator("h3").first().innerText();
  const pending = await p.getByText("waiting for human review").count();
  await p.goto(base + "/status/", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  const live = !(await p.getByText("Live status unavailable").count());
  console.log(base, "|", h, "| pending toggle:", pending, "| live API:", live);
}
await b.close();
