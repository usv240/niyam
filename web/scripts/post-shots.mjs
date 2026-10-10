// Screenshots for build-in-public posts and the demo video (viewport-sized, readable).
import { chromium } from "playwright-core";
const out = process.argv[2];
const b = await chromium.launch({ channel: "chrome" });
const shots = [
  ["home-desktop-dark", "/", 1440, 900, "dark"],
  ["home-desktop-light", "/", 1440, 900, "light"],
  ["home-phone-light", "/", 390, 844, "light"],
  ["demo-desktop-light", "/demo/", 1440, 900, "light"],
  ["results-desktop-dark", "/#results", 1440, 900, "dark"],
  ["explore-desktop-light", "/explore/", 1440, 900, "light"],
  ["check-phone-dark", "/check/", 390, 844, "dark"],
  ["judges-desktop-light", "/judges/", 1440, 900, "light"],
  ["trust-desktop-dark", "/trust/", 1440, 900, "dark"],
  ["developers-desktop-dark", "/developers/", 1440, 900, "dark"],
];
for (const [name, path, w, h, scheme] of shots) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, colorScheme: scheme, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto("http://localhost:8811" + path, { waitUntil: "networkidle" });
  if (path.includes("#")) await p.locator(path.split("#")[1] ? "#" + path.split("#")[1] : "body").scrollIntoViewIfNeeded();
  if (name.startsWith("demo")) { await p.getByRole("button", { name: /Replay the run|Play/ }).first().scrollIntoViewIfNeeded(); }
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
  console.log(name);
}
await b.close();
