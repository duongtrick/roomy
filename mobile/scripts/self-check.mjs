import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/hooks/use-auth.tsx", import.meta.url), "utf8");
const match = source.match(/const ROLE_RANK:[^\n]+/);
assert(match, "ROLE_RANK block not found");

const rank = Object.fromEntries(
  [...match[0].matchAll(/(\w+):\s*(\d+)/g)].map(([, role, value]) => [role, Number(value)]),
);

function pickRole(rows) {
  return (rows ?? []).reduce(
    (best, row) => (rank[row.role] > rank[best] ? row.role : best),
    "tenant",
  );
}

assert.equal(pickRole(null), "tenant");
assert.equal(pickRole([{ role: "tenant" }]), "tenant");
assert.equal(pickRole([{ role: "landlord" }, { role: "tenant" }]), "landlord");
assert.equal(pickRole([{ role: "tenant" }, { role: "admin" }]), "admin");
assert.equal(pickRole([{ role: "landlord" }, { role: "admin" }]), "admin");

console.log("self-check passed");
