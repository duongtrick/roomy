export type RoomQuestionInput = {
  price: number;
  electricityRate: number | null;
  waterRate: number | null;
  distanceToSchool: number | null;
  school: string;
  address: string;
  amenities: string[];
  verification: "unverified" | "pending" | "verified";
  reviews: { rating?: number; comment: string }[];
};

export type RoomAnswer = {
  answer: string;
  source: string;
};

const MARKS: [RegExp, string][] = [
  [/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a"],
  [/[èéẹẻẽêềếệểễ]/g, "e"],
  [/[ìíịỉĩ]/g, "i"],
  [/[òóọỏõôồốộổỗơờớợởỡ]/g, "o"],
  [/[ùúụủũưừứựửữ]/g, "u"],
  [/[ỳýỵỷỹ]/g, "y"],
  [/đ/g, "d"],
];

function fold(s: string): string {
  let out = s.toLowerCase();
  for (const [re, ch] of MARKS) out = out.replace(re, ch);
  return out;
}

function group(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function money(n: number) {
  if (Math.abs(n) >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}tr`;
  }
  return `${group(n)}đ`;
}

function exactMoney(n: number) {
  return `${group(n)}đ`;
}

function distance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${(km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)).replace(".", ",")} km`;
}

function reviewAverage(reviews: { rating?: number }[]) {
  const total = reviews.reduce((sum, review) => sum + (review.rating ?? 5), 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

export function answerRoomQuestion(room: RoomQuestionInput, question: string): RoomAnswer {
  const q = fold(question);

  if (/\b(dien|nuoc|phi|chi phi|hoa don)\b/.test(q)) {
    if (room.electricityRate != null && room.waterRate != null) {
      return {
        answer: `Phòng công khai điện ${exactMoney(room.electricityRate)}/kWh và nước ${exactMoney(
          room.waterRate,
        )}/m³. Bạn có thể đổi kWh, m³ ở mục Chi phí sử dụng để tự tính.`,
        source: "Đơn giá điện nước",
      };
    }
    return {
      answer: "Chủ trọ chưa nêu đơn giá điện nước. Nên hỏi rõ trước khi đặt cọc.",
      source: "Thiếu dữ liệu",
    };
  }

  if (/\b(gia|bao nhieu|tien phong|thue)\b/.test(q)) {
    const utilities =
      room.electricityRate != null && room.waterRate != null
        ? ` Điện ${exactMoney(room.electricityRate)}/kWh, nước ${exactMoney(
            room.waterRate,
          )}/m³.`
        : "";
    return { answer: `Giá phòng là ${money(room.price)}/tháng.${utilities}`, source: "Giá niêm yết" };
  }

  if (/\b(gan|xa|cach|truong|di bo|ictu|dai hoc)\b/.test(q)) {
    if (room.distanceToSchool != null) {
      return {
        answer: `Phòng cách ${room.school || "trường"} ${distance(room.distanceToSchool)}.`,
        source: "Khoảng cách trong tin đăng",
      };
    }
    return {
      answer: "Chủ trọ chưa nêu khoảng cách tới trường.",
      source: "Thiếu dữ liệu",
    };
  }

  if (/\b(dia chi|o dau|ban do|vi tri|duong)\b/.test(q)) {
    return {
      answer: room.address
        ? `Địa chỉ tin đăng: ${room.address}.`
        : "Chủ trọ chưa nêu địa chỉ rõ ràng.",
      source: "Địa chỉ công khai",
    };
  }

  if (/\b(tien ich|wifi|dieu hoa|nong lanh|gac|xe|gui xe|bep|ban cong)\b/.test(q)) {
    return {
      answer: room.amenities.length
        ? `Tiện ích đã nêu: ${room.amenities.join(", ")}.`
        : "Chủ trọ chưa nêu tiện ích cụ thể.",
      source: "Tiện ích trong tin đăng",
    };
  }

  if (/\b(coc|dat coc|giu cho|an toan)\b/.test(q)) {
    return {
      answer:
        room.verification === "verified"
          ? "Tin đã xác thực. Vẫn nên xem phòng trực tiếp, chuyển khoản đúng người nhận và giữ biên nhận."
          : "Tin chưa xác thực đầy đủ. Không nên chuyển cọc vội; hãy đặt lịch xem phòng và hỏi giấy tờ trước.",
      source: "Tín hiệu an toàn",
    };
  }

  if (/\b(danh gia|review|nguoi thue|tot khong)\b/.test(q)) {
    if (room.reviews.length === 0) {
      return { answer: "Phòng này chưa có đánh giá từ người từng thuê.", source: "Đánh giá" };
    }
    if (room.reviews.length >= 3) {
      const average = reviewAverage(room.reviews);
      const mentionsUtilityCost = room.reviews.some((review) =>
        /\b(dien|điện|nuoc|nước|phi|phí|hoa don|hoá đơn|cao)\b/i.test(fold(review.comment)),
      );
      const caution = mentionsUtilityCost ? " Nên hỏi kỹ cách tính điện nước và phụ phí." : "";
      return {
        answer: `Điểm trung bình ${average}/5 từ ${room.reviews.length} đánh giá của người từng thuê.${caution}`,
        source: "Tóm tắt đánh giá từ người thuê",
      };
    }
    const best = room.reviews[0];
    return {
      answer: `Có ${room.reviews.length} đánh giá. Nhận xét gần đây: “${best.comment}”`,
      source: "Đánh giá từ người thuê",
    };
  }

  return {
    answer:
      "Chủ trọ chưa nêu thông tin này trong tin đăng. Bạn có thể đặt lịch xem phòng và ghi câu hỏi vào phần ghi chú.",
    source: "Chưa có dữ liệu",
  };
}
