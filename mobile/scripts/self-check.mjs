import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRoomyQuery } from "../src/lib/roomy-query.ts";

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

assert.deepEqual(parseRoomyQuery("phòng dưới 2 triệu gần ICTU còn trống"), {
  keyword: "ictu",
  maxPrice: 2_000_000,
  maxDistance: null,
  availableOnly: true,
  verifiedOnly: false,
});
assert.deepEqual(parseRoomyQuery("trọ xác thực dưới 1,5tr gần 500m"), {
  keyword: "",
  maxPrice: 1_500_000,
  maxDistance: 500,
  availableOnly: false,
  verifiedOnly: true,
});
assert.deepEqual(parseRoomyQuery("Roomy ơi tìm phòng 2tr gần ICTU 1km an toàn chưa ai thuê"), {
  keyword: "ictu",
  maxPrice: 2_000_000,
  maxDistance: 1000,
  availableOnly: true,
  verifiedOnly: true,
});

console.log("self-check passed");
