import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { depositGuidance } from "../src/lib/listing-safety.ts";
import { assessListingRisk } from "../src/lib/listing-risk.ts";
import { buildInvoiceReminder, buildInvoiceReminderDraft } from "../src/lib/invoice-reminder.ts";
import { analyzeInvoice } from "../src/lib/invoice-analysis.ts";
import { answerRoomQuestion } from "../src/lib/room-qa.ts";
import { parseRoomyQuery } from "../src/lib/roomy-query.ts";
import { assessListingDraft } from "../src/lib/listing-draft-assistant.ts";
import { summarizeReviews } from "../src/lib/review-summary.ts";
import { renewalAssistant } from "../src/lib/lease-renewal-assistant.ts";
import { bookingAssistant } from "../src/lib/booking-assistant.ts";
import { affordabilityAdvice } from "../src/lib/affordability-assistant.ts";
import { compareFavorites } from "../src/lib/favorite-compare.ts";
import { tenantDecisionAssistant } from "../src/lib/tenant-decision-assistant.ts";
import { viewingChecklist } from "../src/lib/viewing-checklist.ts";
import { aiRoomMatch } from "../src/lib/ai-room-match.ts";
import { buildBookingNote } from "../src/lib/booking-note-assistant.ts";
import { roommateFit } from "../src/lib/roommate-fit.ts";
import { triageMaintenance } from "../src/lib/maintenance-triage.ts";

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
  reviews: [{ rating: 5, comment: "Phòng yên tĩnh." }],
};
assert.match(answerRoomQuestion(sampleRoom, "điện nước bao nhiêu").answer, /3\.500đ\/kWh/);
assert.equal(answerRoomQuestion(sampleRoom, "điện nước bao nhiêu").source, "Đơn giá điện nước");
assert.match(answerRoomQuestion(sampleRoom, "gần trường không").answer, /350 m/);
assert.match(answerRoomQuestion(sampleRoom, "có nuôi mèo không").answer, /chưa nêu/i);
assert.equal(
  summarizeReviews([
    { rating: 5, comment: "Phòng sạch, yên tĩnh, gần trường." },
    { rating: 4, comment: "Chủ nhà thân thiện, gửi xe tiện." },
    { rating: 3, comment: "Nước hơi cao, nên hỏi kỹ hoá đơn." },
  ])?.cautions[0],
  "Nên hỏi kỹ cách tính điện nước và phụ phí.",
);
assert.match(
  answerRoomQuestion(
    {
      ...sampleRoom,
      reviews: [
        { rating: 5, comment: "Phòng sạch, yên tĩnh, gần trường." },
        { rating: 4, comment: "Chủ nhà thân thiện, gửi xe tiện." },
        { rating: 4, comment: "Wifi ổn, gửi xe tiện." },
      ],
    },
    "review tốt không",
  ).answer,
  /4\.3\/5 từ 3 đánh giá/,
);
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
  buildInvoiceReminderDraft({
    tenantName: "Minh Anh",
    roomTitle: "P.101",
    period: "2026-10",
    totalAmount: 3_450_000,
    dueDate: "2026-10-10",
    overdue: true,
  }).tone,
  "urgent",
);
assert.equal(
  analyzeInvoice(
    {
      rentAmount: 2_000_000,
      electricityKwh: 120,
      electricityAmount: 420_000,
      waterM3: 8,
      waterAmount: 200_000,
      otherAmount: 0,
      totalAmount: 2_620_000,
      dueDate: "2026-09-10",
      status: "unpaid",
    },
    new Date("2026-10-01T00:00:00"),
  ).tone,
  "urgent",
);
assert.equal(
  analyzeInvoice({
    rentAmount: 2_000_000,
    electricityKwh: 80,
    electricityAmount: 280_000,
    waterM3: 5,
    waterAmount: 125_000,
    otherAmount: 350_000,
    totalAmount: 2_755_000,
    dueDate: null,
    status: "paid",
  }).insights.some((item) => /Phí khác/.test(item)),
  true,
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

assert.deepEqual(
  renewalAssistant(
    [
      {
        id: "late",
        roomTitle: "P.101",
        tenantName: "Minh",
        endDate: "2026-09-20",
        monthlyRent: 2_000_000,
        status: "active",
      },
      {
        id: "soon",
        roomTitle: "P.102",
        tenantName: "Lan",
        endDate: "2026-10-15",
        monthlyRent: 2_500_000,
        status: "active",
      },
      {
        id: "far",
        roomTitle: "P.103",
        tenantName: "An",
        endDate: "2026-12-15",
        monthlyRent: 3_000_000,
        status: "active",
      },
    ],
    "2026-10-01",
  ).map((task) => [task.leaseId, task.tone]),
  [
    ["late", "urgent"],
    ["soon", "soon"],
  ],
);

assert.deepEqual(
  bookingAssistant(
    [
      {
        id: "old",
        roomTitle: "P.101",
        name: "Minh",
        date: "2026-09-30",
        time: "09:00",
        note: "Muốn xem sớm",
        status: "pending",
      },
      {
        id: "today",
        roomTitle: "P.102",
        name: "Lan",
        date: "2026-10-01",
        time: "15:00",
        note: null,
        status: "pending",
      },
      {
        id: "done",
        roomTitle: "P.103",
        name: "An",
        date: "2026-10-01",
        time: "16:00",
        note: null,
        status: "confirmed",
      },
    ],
    "2026-10-01",
  ).map((task) => [task.id, task.priority]),
  [
    ["old", "urgent"],
    ["today", "today"],
  ],
);

assert.equal(affordabilityAdvice(2_000_000, "3000000")?.level, "safe");
assert.equal(affordabilityAdvice(2_900_000, "3000000")?.level, "careful");
assert.equal(affordabilityAdvice(3_500_000, "3000000")?.level, "over");
assert.equal(affordabilityAdvice(2_000_000, ""), null);

assert.deepEqual(
  compareFavorites([
    {
      id: "a",
      title: "Phòng A",
      price: 2_500_000,
      distanceToSchool: 900,
      verification: "verified",
      electricityRate: 3500,
      waterRate: 25000,
      reviews: [{ rating: 5 }],
    },
    {
      id: "b",
      title: "Phòng B",
      price: 1_800_000,
      distanceToSchool: 400,
      verification: "unverified",
      electricityRate: null,
      waterRate: null,
      reviews: [],
    },
  ])?.picks,
  [
    "Rẻ nhất: Phòng B (1.8tr/tháng).",
    "Gần trường nhất: Phòng B (400 m).",
    "Đáng tin hơn: Phòng A (đã xác thực).",
  ],
);
assert.equal(
  compareFavorites(
    [
      {
        id: "cheap",
        title: "Phòng rẻ chưa xác thực",
        price: 1_500_000,
        distanceToSchool: 300,
        status: "available",
        verification: "unverified",
        electricityRate: null,
        waterRate: null,
        reviews: [],
      },
      {
        id: "safe",
        title: "Phòng an toàn",
        price: 1_800_000,
        distanceToSchool: 650,
        status: "available",
        verification: "verified",
        electricityRate: 3500,
        waterRate: 25000,
        reviews: [{ rating: 5 }],
      },
    ],
    "freshman",
  )?.recommendation.roomId,
  "safe",
);

assert.equal(
  compareFavorites([
    {
      id: "a",
      title: "Phòng ít review",
      price: 2_000_000,
      distanceToSchool: null,
      verification: "unverified",
      electricityRate: 3500,
      waterRate: 25000,
      reviews: [{ rating: 4 }],
    },
    {
      id: "b",
      title: "Phòng nhiều review",
      price: 2_200_000,
      distanceToSchool: null,
      verification: "unverified",
      electricityRate: 3500,
      waterRate: 25000,
      reviews: [{ rating: 5 }, { rating: 5 }],
    },
  ])?.picks.find((item) => item.startsWith("Đáng tin hơn:")),
  "Đáng tin hơn: Phòng nhiều review (5/5 từ 2 đánh giá).",
);
assert.equal(
  tenantDecisionAssistant(
    [
      {
        id: "cheap",
        title: "Phòng rẻ thiếu điện nước",
        price: 1_500_000,
        status: "available",
        distanceToSchool: 300,
        verification: "unverified",
        electricityRate: null,
        waterRate: null,
        reviews: [],
      },
      {
        id: "safe",
        title: "Phòng rõ chi phí",
        price: 1_800_000,
        status: "available",
        distanceToSchool: 600,
        verification: "verified",
        electricityRate: 3500,
        waterRate: 25000,
        reviews: [{ rating: 5 }],
      },
    ],
    "freshman",
    "2500000",
  )?.nextRoomId,
  "safe",
);
assert.match(
  tenantDecisionAssistant(
    [
      {
        id: "over",
        title: "Phòng vượt ngân sách",
        price: 3_000_000,
        status: "available",
        distanceToSchool: 500,
        verification: "verified",
        electricityRate: 3500,
        waterRate: 25000,
        reviews: [],
      },
    ],
    "budget",
    "2000000",
  )?.budgetNote ?? "",
  /vượt ngân sách/,
);

assert.equal(
  viewingChecklist({
    verification: "verified",
    reviewCount: 2,
    hasUtilityRates: true,
    hasMapLocation: true,
    distanceToSchool: 400,
    status: "available",
  }).priority,
  "normal",
);
assert.deepEqual(
  viewingChecklist({
    verification: "unverified",
    reviewCount: 0,
    hasUtilityRates: false,
    hasMapLocation: false,
    distanceToSchool: null,
    status: "maintenance",
  }).items.slice(2),
  [
    "Hỏi rõ ngày phòng có thể vào ở và tình trạng sửa chữa hiện tại.",
    "Xin giấy tờ chứng minh quyền cho thuê hoặc giấy xác nhận của chủ nhà.",
    "Hỏi đơn giá điện, nước, internet, gửi xe và phí vệ sinh trước khi đặt cọc.",
  ],
);
assert.equal(
  viewingChecklist(
    {
      verification: "verified",
      reviewCount: 2,
      hasUtilityRates: true,
      hasMapLocation: true,
      distanceToSchool: 300,
      status: "available",
    },
    "budget",
  ).questions.some((item) => /Mùa cao điểm/.test(item)),
  true,
);
assert.equal(
  viewingChecklist(
    {
      verification: "verified",
      reviewCount: 2,
      hasUtilityRates: true,
      hasMapLocation: true,
      distanceToSchool: 300,
      status: "available",
    },
    "solo",
  ).redFlags.some((item) => /khóa cửa yếu/.test(item)),
  true,
);

assert.deepEqual(parseRoomyQuery("em là tân sinh viên ít kinh nghiệm cần phòng gần ICTU"), {
  keyword: "ictu",
  maxPrice: 2_000_000,
  maxDistance: 1200,
  availableOnly: true,
  verifiedOnly: true,
});
assert.deepEqual(parseRoomyQuery("Tân sinh viên cần phòng gần trường, dưới 2 triệu, đã xác thực"), {
  keyword: "",
  maxPrice: 2_000_000,
  maxDistance: 1200,
  availableOnly: true,
  verifiedOnly: true,
});

assert.deepEqual(
  aiRoomMatch(
    {
      status: "available",
      verification: "verified",
      price: 1_900_000,
      distanceToSchool: 350,
      electricityRate: 3500,
      waterRate: 25000,
      reviews: [{ rating: 5 }],
    },
    {
      keyword: "ictu",
      maxPrice: 2_000_000,
      maxDistance: 1200,
      availableOnly: true,
      verifiedOnly: true,
      audience: "freshman",
      priorities: [],
      note: "",
      source: "local",
    },
  ).label,
  "Rất hợp",
);

const bookingNote = buildBookingNote({
  title: "Phòng thử nghiệm tiêu đề rất dài để kiểm tra giới hạn ghi chú",
  verification: "unverified",
  electricityRate: null,
  waterRate: null,
  distanceToSchool: null,
  reviews: [],
});
assert.match(bookingNote, /điện, nước/);
assert.match(bookingNote, /giấy tờ/);
assert.ok(bookingNote.length <= 280);

assert.equal(
  roommateFit({
    title: "Phòng ghép 2 người",
    description: "Có giường tầng, bàn học và sân phơi chung.",
    amenities: ["Wifi"],
    price: 1_100_000,
    size: 16,
    verification: "unverified",
    reviews: [],
  })?.level,
  "careful",
);
assert.equal(
  roommateFit({
    title: "Phòng khép kín riêng",
    description: "Một người ở thoải mái.",
    amenities: ["Wifi"],
    price: 2_000_000,
    size: 22,
    verification: "verified",
    reviews: [],
  }),
  null,
);

assert.equal(triageMaintenance("ổ điện gần bàn học bị chập và có mùi khét")?.priority, "urgent");
assert.equal(triageMaintenance("wifi phòng em rất yếu từ tối qua")?.category, "Tiện ích");
assert.equal(triageMaintenance("lỗi")?.priority, undefined);

console.log("self-check passed");
