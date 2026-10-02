export type FavoriteCompareRoom = {
  id: string;
  title: string;
  price: number;
  distanceToSchool: number | null;
  verification: "unverified" | "pending" | "verified";
  electricityRate: number | null;
  waterRate: number | null;
  reviews: { rating: number }[];
};

export type FavoriteCompareResult = {
  title: string;
  summary: string;
  picks: string[];
  cautions: string[];
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

export function compareFavorites(rooms: FavoriteCompareRoom[]): FavoriteCompareResult | null {
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
    summary: "Roomy gợi ý theo giá, khoảng cách, xác thực và đánh giá hiện có.",
    picks,
    cautions: cautions.slice(0, 3),
  };
}
