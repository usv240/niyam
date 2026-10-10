// Viewport screenshots at given scroll anchors. node scripts/peek.mjs url out.png width height scheme [selector]
import { chromium } from "playwright-core";
const [url, out, w = "390", h = "844", scheme = "light", sel] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 800, hasTouch: +w < 800, colorScheme: scheme });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "networkidle" });
if (sel) await p.locator(sel).first().scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await p.screenshot({ path: out });
await b.close();
