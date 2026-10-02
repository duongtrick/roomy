import type { Room } from "./api/catalogue";
import type { AiSearchIntent } from "./api/ai";

function shortMoney(value: number) {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}tr`;
  }
  return `${Math.round(value)}đ`;
}

function shortDistance(value: number) {
  if (value < 1000) return `${Math.round(value)} m`;
  const km = value / 1000;
  return `${(km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)).replace(".", ",")} km`;
}

export type AiRoomMatch = {
  score: number;
  label: string;
  reasons: string[];
  cautions: string[];
};

export function aiRoomMatch(room: Room, intent: AiSearchIntent): AiRoomMatch {
  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = 45;

  if (room.status === "available") {
    score += 12;
    reasons.push("còn trống");
  } else {
    score -= 20;
    cautions.push("chưa thể vào ở ngay");
  }

  if (room.verification === "verified") {
    score += intent.audience === "freshman" ? 18 : 12;
    reasons.push("đã xác thực");
  } else {
    score -= intent.audience === "freshman" ? 18 : 10;
    cautions.push("chưa xác thực");
  }

  if (intent.maxPrice != null) {
    if (room.price <= intent.maxPrice) {
      score += 12;
      reasons.push(`trong ngân sách ${shortMoney(intent.maxPrice)}`);
    } else {
      score -= 18;
      cautions.push(`vượt ngân sách ${shortMoney(room.price - intent.maxPrice)}`);
    }
  }

  if (intent.maxDistance != null) {
    if (room.distanceToSchool != null && room.distanceToSchool <= intent.maxDistance) {
      score += 12;
      reasons.push(`cách trường ${shortDistance(room.distanceToSchool)}`);
    } else {
      score -= 12;
      cautions.push("chưa khớp khoảng cách mong muốn");
    }
  }

  if (room.electricityRate != null && room.waterRate != null) {
    score += 8;
    reasons.push("công khai điện nước");
  } else {
    score -= 8;
    cautions.push("cần hỏi điện nước");
  }

  if (room.reviews.length > 0) {
    score += 6;
    reasons.push(`${room.reviews.length} đánh giá`);
  } else if (intent.audience === "freshman") {
    cautions.push("chưa có đánh giá người thuê");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const label = finalScore >= 82 ? "Rất hợp" : finalScore >= 65 ? "Đáng xem" : "Cần cân nhắc";

  return {
    score: finalScore,
    label,
    reasons: reasons.slice(0, 3),
    cautions: cautions.slice(0, 2),
  };
}
