export type FavoriteCompareRoom = {
  id: string;
  title: string;
  price: number;
  distanceToSchool: number | null;
  status?: "available" | "occupied" | "maintenance";
  verification: "unverified" | "pending" | "verified";
  electricityRate: number | null;
  waterRate: number | null;
  reviews: { rating: number }[];
};

export type FavoriteProfile = "freshman" | "budget" | "safe";

export type FavoriteCompareResult = {
  title: string;
  summary: string;
  recommendation: {
    roomId: string;
    title: string;
    score: number;
    reasons: string[];
  };
  picks: string[];
  cautions: string[];
};

export const FAVORITE_PROFILE_LABEL: Record<FavoriteProfile, string> = {
  freshman: "Tân sinh viên",
  budget: "Tiết kiệm",
  safe: "An toàn",
};

function money(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}tr`;
  }
  return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

function distance(value: number) {
  if (value < 1000) return `${Math.round(value)} m`;
  const km = value / 1000;
  return `${(km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)).replace(".", ",")} km`;
}

function averageRating(room: FavoriteCompareRoom) {
  if (room.reviews.length === 0) return 0;
  return Math.round((room.reviews.reduce((sum, review) => sum + review.rating, 0) / room.reviews.length) * 10) / 10;
}

function trustLabel(room: FavoriteCompareRoom) {
  if (room.verification === "verified") return " (đã xác thực)";
  const rating = averageRating(room);
  if (rating > 0) return ` (${rating}/5 từ ${room.reviews.length} đánh giá)`;
  return "";
}

function scoreRoom(room: FavoriteCompareRoom, profile: FavoriteProfile, cheapest: number) {
  let score = 40;
  const reasons: string[] = [];

  if (room.status === "available" || room.status == null) {
    score += 12;
    reasons.push("còn nhận lịch xem");
  }
  if (room.verification === "verified") {
    score += profile === "safe" || profile === "freshman" ? 22 : 14;
    reasons.push("đã xác thực");
  }
  if (room.price === cheapest) {
    score += profile === "budget" ? 24 : 12;
    reasons.push("rẻ nhất trong danh sách");
  } else if (room.price <= cheapest + 300_000) {
    score += profile === "budget" ? 12 : 8;
    reasons.push("giá vẫn sát lựa chọn rẻ nhất");
  }
  if (room.distanceToSchool != null && room.distanceToSchool <= 700) {
    score += profile === "freshman" ? 18 : 10;
    reasons.push("gần trường");
  }
  if (room.electricityRate != null && room.waterRate != null) {
    score += 8;
    reasons.push("công khai điện nước");
  }
  if (averageRating(room) >= 4.5) {
    score += profile === "safe" ? 14 : 8;
    reasons.push("đánh giá tốt");
  }
  if (room.verification !== "verified" && profile === "safe") score -= 12;
  if (room.status && room.status !== "available") score -= 20;

  return { room, score: Math.max(0, Math.min(100, score)), reasons: reasons.slice(0, 3) };
}

export function compareFavorites(
  rooms: FavoriteCompareRoom[],
  profile: FavoriteProfile = "freshman",
): FavoriteCompareResult | null {
  if (rooms.length < 2) return null;

  const cheapest = [...rooms].sort((a, b) => a.price - b.price)[0];
  const nearest = rooms
    .filter((room) => room.distanceToSchool != null)
    .sort((a, b) => (a.distanceToSchool ?? Infinity) - (b.distanceToSchool ?? Infinity))[0];
  const trusted = [...rooms].sort((a, b) => {
    const verifiedScore = Number(b.verification === "verified") - Number(a.verification === "verified");
    if (verifiedScore !== 0) return verifiedScore;
    return averageRating(b) - averageRating(a);
  })[0];
  const recommended = rooms
    .map((room) => scoreRoom(room, profile, cheapest.price))
    .sort((a, b) => b.score - a.score)[0];

  const picks = [
    `Rẻ nhất: ${cheapest.title} (${money(cheapest.price)}/tháng).`,
    nearest ? `Gần trường nhất: ${nearest.title} (${distance(nearest.distanceToSchool ?? 0)}).` : "",
    `Đáng tin hơn: ${trusted.title}${trustLabel(trusted)}.`,
  ].filter(Boolean);

  const cautions: string[] = [];
  if (rooms.some((room) => room.electricityRate == null || room.waterRate == null)) {
    cautions.push("Có phòng chưa công khai điện nước; hỏi rõ trước khi đặt cọc.");
  }
  if (rooms.some((room) => room.verification !== "verified")) {
    cautions.push("Có phòng chưa xác thực; ưu tiên xem trực tiếp và giữ biên nhận nếu đặt cọc.");
  }
  if (!nearest) cautions.push("Chưa đủ dữ liệu khoảng cách để so sánh vị trí.");

  return {
    title: `So sánh ${rooms.length} phòng đã lưu`,
    summary: `Roomy đang ưu tiên hồ sơ ${FAVORITE_PROFILE_LABEL[profile].toLowerCase()}.`,
    recommendation: {
      roomId: recommended.room.id,
      title: recommended.room.title,
      score: recommended.score,
      reasons: recommended.reasons,
    },
    picks,
    cautions: cautions.slice(0, 3),
  };
}
