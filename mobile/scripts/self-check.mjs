import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { depositGuidance } from "../src/lib/listing-safety.ts";
import { assessListingRisk } from "../src/lib/listing-risk.ts";
import { buildInvoiceReminder } from "../src/lib/invoice-reminder.ts";
import { answerRoomQuestion } from "../src/lib/room-qa.ts";
import { parseRoomyQuery } from "../src/lib/roomy-query.ts";
import { assessListingDraft } from "../src/lib/listing-draft-assistant.ts";

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

assert.equal(
  depositGuidance({
    verification: "verified",
    reviewCount: 2,
    hasUtilityRates: true,
    hasMapLocation: true,
  }).tone,
  "safe",
);
assert.equal(
  depositGuidance({
    verification: "verified",
    reviewCount: 0,
    hasUtilityRates: false,
    hasMapLocation: true,
  }).tone,
  "careful",
);
assert.equal(
  depositGuidance({
    verification: "unverified",
    reviewCount: 0,
    hasUtilityRates: false,
    hasMapLocation: false,
  }).tone,
  "caution",
);
assert.equal(
  assessListingRisk({
    title: "Phòng giá rẻ giữ chỗ nhanh",
    description: "Cọc trước qua Zalo để giữ phòng",
    price: 1_000_000,
    size: null,
    address: null,
    lat: null,
    lng: null,
    verification: "unverified",
    imageCount: 0,
  }).level,
  "high",
);
assert.equal(
  assessListingRisk({
    title: "Phòng khép kín",
    description: "Đủ tiện ích, xem phòng trực tiếp.",
    price: 2_500_000,
    size: 22,
    address: "Đường Lương Ngọc Quyến",
    lat: 21.59,
    lng: 105.83,
    verification: "verified",
    imageCount: 3,
  }).level,
  "low",
);

const sampleRoom = {
  price: 1_900_000,
  electricityRate: 3500,
  waterRate: 25000,
  distanceToSchool: 350,
  school: "ĐH CNTT&TT (ICTU)",
  address: "Đường Z115",
  amenities: ["Wifi", "Điều hoà"],
  verification: "verified",
  reviews: [{ comment: "Phòng yên tĩnh." }],
};
assert.match(answerRoomQuestion(sampleRoom, "điện nước bao nhiêu").answer, /3\.500đ\/kWh/);
assert.equal(answerRoomQuestion(sampleRoom, "điện nước bao nhiêu").source, "Đơn giá điện nước");
assert.match(answerRoomQuestion(sampleRoom, "gần trường không").answer, /350 m/);
assert.match(answerRoomQuestion(sampleRoom, "có nuôi mèo không").answer, /chưa nêu/i);
assert.match(
  buildInvoiceReminder({
    tenantName: "Minh Anh",
    roomTitle: "P.101",
    period: "2026-10",
    totalAmount: 3_450_000,
    dueDate: "2026-10-10",
    overdue: true,
  }),
  /Minh Anh.*P\.101.*3\.450\.000đ.*10\/10\/2026/,
);

assert.equal(
  assessListingDraft({
    title: "P.101",
    price: "2500000",
    size: "",
    electricityRate: "3500",
    waterRate: "25000",
    publicTitle: "",
    publicDescription: "Phòng sạch.",
    address: "",
    area: "",
    district: "",
    amenities: "Wifi",
    lat: "",
    lng: "",
    school: "",
    distance: "",
    isPublished: true,
    verification: "unverified",
  }).label,
  "Cần bổ sung",
);

assert.equal(
  assessListingDraft({
    title: "Studio ban công gần ICTU",
    price: "2800000",
    size: "24",
    electricityRate: "3500",
    waterRate: "25000",
    publicTitle: "Studio ban công gần ICTU",
    publicDescription:
      "Phòng studio sáng, có ban công, vệ sinh khép kín, Wifi riêng, chỗ để xe và lối đi thuận tiện cho sinh viên.",
    address: "Đường Z115, Thái Nguyên",
    area: "Tân Thịnh",
    district: "Gần ICTU",
    amenities: "Wifi, Điều hoà, Ban công, Gửi xe",
    lat: "21.592",
    lng: "105.832",
    school: "ICTU",
    distance: "450",
    isPublished: true,
    verification: "verified",
  }).label,
  "Sẵn sàng hơn",
);

console.log("self-check passed");
