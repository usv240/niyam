// Fails if any public copy contains an emoji or an em or en dash.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const EMOJI = /\p{Extended_Pictographic}/u;
const DASHES = new RegExp("[\u2013\u2014]");
const roots = ["app", "components", "lib", "data", "../README.md", "../hackathon.md"];
let bad = 0;
function walk(p) {
  const st = statSync(p);
  if (st.isDirectory()) return readdirSync(p).forEach((f) => walk(join(p, f)));
  if (!/\.(tsx?|json|md|css)$/.test(p)) return;
  readFileSync(p, "utf8").split("\n").forEach((line, i) => {
    if (EMOJI.test(line) || DASHES.test(line)) { bad++; console.log(`${p}:${i + 1}: ${line.trim().slice(0, 120)}`); }
  });
}
roots.forEach(walk);
console.log(bad ? `content-lint: ${bad} problem(s)` : "content-lint: ok");
process.exit(bad ? 1 : 0);
