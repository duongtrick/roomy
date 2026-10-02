export type RoommateFitRoom = {
  title: string;
  description: string;
  amenities: string[];
  price: number;
  size: number;
  verification: "unverified" | "pending" | "verified";
  reviews: { rating: number; comment?: string }[];
};

export type RoommateFit = {
  level: "good" | "careful";
  title: string;
  note: string;
  questions: string[];
} | null;

function textOf(room: RoommateFitRoom) {
  return `${room.title} ${room.description} ${room.amenities.join(" ")}`.toLowerCase();
}

export function roommateFit(room: RoommateFitRoom): RoommateFit {
  const text = textOf(room);
  const shared =
    /\bghép\b|\bở chung\b|\bshare\b|\bshared\b|giường tầng|bạn cùng phòng/.test(text);
  if (!shared) return null;

  const questions = [
    "Hỏi số người ở tối đa và hiện đang có mấy người.",
    "Thống nhất giờ giấc, khách qua đêm, nấu ăn và vệ sinh khu chung.",
    "Hỏi cách chia điện, nước, internet, gửi xe và tiền cọc.",
  ];

  const hasPrivacy = /rèm|tủ riêng|bàn học|khóa riêng|giường tầng/.test(text);
  const hasReview = room.reviews.length > 0;
  const compact = room.size > 0 && room.size < 18;
  const level = room.verification === "verified" && (hasPrivacy || hasReview) && !compact ? "good" : "careful";

  if (compact) questions.push("Xem trực tiếp diện tích lối đi, chỗ để đồ và chỗ phơi riêng.");
  if (room.verification !== "verified") questions.push("Xin giấy tờ cho thuê trước khi đặt cọc.");

  return {
    level,
    title: level === "good" ? "Có thể hợp để ở ghép" : "Ở ghép cần hỏi kỹ",
    note:
      level === "good"
        ? "Tin có dấu hiệu phù hợp ở chung, nhưng vẫn cần thống nhất nội quy trước khi cọc."
        : "Phòng ghép rẻ hơn nhưng dễ phát sinh mâu thuẫn về giờ giấc, chi phí và không gian riêng.",
    questions: questions.slice(0, 5),
  };
}
