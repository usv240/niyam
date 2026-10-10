// Parity: the browser engine (lib/rules.ts) must give exactly the same answers
// as the Python engine for random people and dates. Usage: node scripts/parity.mts cases.json expected.json
import { readFileSync } from "node:fs";
import { evaluateScheme, type Snapshot } from "../lib/rules.ts";

const [casesFile, expectedFile, snapFile] = process.argv.slice(2);
const snap = JSON.parse(readFileSync(snapFile, "utf8")) as Snapshot;
const cases = JSON.parse(readFileSync(casesFile, "utf8"));
const expected = JSON.parse(readFileSync(expectedFile, "utf8"));
let mismatch = 0;
cases.forEach((c: { person: Record<string, unknown>; date: string; scheme: string }, i: number) => {
  const py = expected[i].result[c.scheme];
  const ts = evaluateScheme(snap, snap.schemes[c.scheme], c.person, c.date);
  const same = py.eligible === ts.eligible && Number(py.monthly_inr) === Number(ts.monthly) && py.in_force === ts.inForce;
  if (!same) { mismatch++; if (mismatch < 6) console.log("MISMATCH", JSON.stringify(c), "py", py.eligible, py.monthly_inr, "ts", ts.eligible, ts.monthly); }
});
console.log(`parity: ${cases.length - mismatch} of ${cases.length} identical`);
process.exit(mismatch ? 1 : 0);
