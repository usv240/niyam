// Record one clip per scene with Playwright, each as long as its narration.
// Usage: node video/record.mjs <base-url> <durations.json> <out-dir>
// The run is real: the pages are the actual site, and GitHub pages are public.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { chromium } from "../web/node_modules/playwright-core/index.mjs";

const [base, durFile, outDir] = process.argv.slice(2);
const scenes = JSON.parse(readFileSync("video/scenes.json", "utf8"));
const durations = JSON.parse(readFileSync(durFile, "utf8"));
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const offsets = {};

for (const s of scenes) {
  if (s.images) continue; // still images are composed by make_video.py
  const phone = s.viewport === "phone";
  const vp = phone ? { width: 430, height: 932 } : { width: 1536, height: 864 };
  const ctx = await browser.newContext({
    viewport: vp, deviceScaleFactor: phone ? 2 : 1.25, isMobile: phone, hasTouch: phone, colorScheme: s.theme,
    recordVideo: { dir: outDir, size: phone ? { width: 608, height: 1080 } : { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const url = s.url.startsWith("http") ? s.url : base + s.url;
  await page.goto(url, { waitUntil: url.includes("cfo.ai") ? "domcontentloaded" : "networkidle", timeout: 60000 });
  await page.waitForTimeout(600);
  const start = (Date.now() - t0) / 1000;
  const total = durations[s.id] + 0.8;
  const end = Date.now() + total * 1000;
  const left = () => Math.max(0, end - Date.now());
  for (const [kind, arg] of s.actions) {
    try {
      if (kind === "wait") await page.waitForTimeout(Math.min(arg * 1000, left()));
      else if (kind === "scroll") await page.locator(arg).first().evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "start" }));
      else if (kind === "scrollby") await page.mouse.wheel(0, arg);
      else if (kind === "click") await page.locator(arg).first().click();
      else if (kind === "speed") await page.locator("select").first().selectOption(arg);
      else if (kind === "tab") await page.getByRole("tab", { name: arg }).click();
      else if (kind === "tabrole") await page.getByRole("tab", { name: new RegExp(arg) }).click();
      else if (kind === "why") await page.locator("li", { hasText: arg }).first().getByRole("button", { name: /Why does this rule say this/ }).click();
      else if (kind === "waittext") await page.waitForFunction((t) => document.body.innerText.includes(t), arg, { timeout: 30000 });
      else if (kind === "js") await page.evaluate(arg);
      else if (kind === "scrolltext") await page.getByText(arg).first().evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "start" }));
      else if (kind === "submit") { await page.locator("form button[type=submit]").click(); await page.waitForTimeout(600); await page.locator("#results").evaluate((el) => el.scrollIntoView({ behavior: "smooth" })); }
      await page.waitForTimeout(250);
    } catch (e) {
      console.log(`  ${s.id}: action ${kind} ${arg} skipped (${e.message.split("\n")[0]})`);
    }
    if (!left()) break;
  }
  if (left()) await page.waitForTimeout(left());
  const video = page.video();
  await ctx.close();
  const raw = await video.path();
  renameSync(raw, `${outDir}/${s.id}.webm`);
  offsets[s.id] = start;
  console.log(`recorded ${s.id} (${total.toFixed(1)} s, starts at ${start.toFixed(1)} s)`);
}
await browser.close();
writeFileSync(`${outDir}/offsets.json`, JSON.stringify(offsets, null, 1));
