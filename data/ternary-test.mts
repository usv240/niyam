import { evaluate } from "../web/lib/rules.ts";
const f = "params.b2 if (person.m == 'widowed' and person.c >= 2) else (params.b1 if (person.m == 'widowed' and person.c == 1) else params.b)";
const params = { b: 1000, b1: 1100, b2: 1200 };
console.log(evaluate(f, { m: "widowed", c: 2 }, params), evaluate(f, { m: "widowed", c: 1 }, params), evaluate(f, { m: "married", c: 3 }, params));
