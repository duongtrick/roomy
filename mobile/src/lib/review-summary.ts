export type ReviewSummaryInput = {
  rating: number;
  comment: string;
};

export type ReviewSummary = {
  count: number;
  average: number;
  headline: string;
  positives: string[];
  cautions: string[];
};

const POSITIVE_PATTERNS: [RegExp, string][] = [
  [/\b(sach|sạch|thoang|thoáng|yen tinh|yên tĩnh|an ninh|an toàn)\b/i, "Không gian và an ninh được nhắc tốt."],
  [/\b(gần|gan|di bo|đi bộ|truong|trường|cho|chợ|tien|tiện)\b/i, "Vị trí thuận tiện cho sinh hoạt hoặc đi học."],
  [/\b(chu nha|chủ nhà|than thien|thân thiện|nhiet tinh|nhiệt tình|de tinh|dễ tính)\b/i, "Chủ trọ được nhận xét dễ trao đổi."],
  [/\b(wifi|dieu hoa|điều hoà|ban cong|ban công|gui xe|gửi xe|nong lanh|nóng lạnh)\b/i, "Tiện ích trong phòng được nhắc tích cực."],
];

const CAUTION_PATTERNS: [RegExp, string][] = [
  [/\b(on|ồn|am|ầm|ồn ào|ồn ao)\b/i, "Có người nhắc tới tiếng ồn."],
  [/\b(nong|nóng|bi|bí|ẩm|am|thấm|tham|mốc|moc)\b/i, "Nên kiểm tra độ thoáng, ẩm và nhiệt khi xem phòng."],
  [/\b(xa|hẻm|hem|sâu|sau|khó tìm|kho tim)\b/i, "Nên kiểm tra đường vào và thời gian di chuyển thật."],
  [/\b(dien|điện|nuoc|nước|phi|phí|hoa don|hoá đơn|cao)\b/i, "Nên hỏi kỹ cách tính điện nước và phụ phí."],
];

function uniquePush(items: string[], value: string) {
  if (!items.includes(value)) items.push(value);
}

export function summarizeReviews(reviews: ReviewSummaryInput[]): ReviewSummary | null {
  if (reviews.length < 3) return null;

  const average =
    Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10;
  const positives: string[] = [];
  const cautions: string[] = [];

  for (const review of reviews) {
    for (const [pattern, label] of POSITIVE_PATTERNS) {
      if (pattern.test(review.comment)) uniquePush(positives, label);
    }
    for (const [pattern, label] of CAUTION_PATTERNS) {
      if (pattern.test(review.comment)) uniquePush(cautions, label);
    }
    if (review.rating >= 4) uniquePush(positives, "Điểm đánh giá tổng thể tốt.");
    if (review.rating <= 3) uniquePush(cautions, "Có đánh giá trung bình hoặc thấp; nên đọc kỹ nhận xét.");
  }

  const headline =
    average >= 4.5
      ? "Người từng thuê đánh giá rất tích cực."
      : average >= 4
        ? "Đánh giá nhìn chung tích cực."
        : average >= 3
          ? "Đánh giá ở mức cần cân nhắc."
          : "Nên xem kỹ phản hồi trước khi đặt lịch.";

  return {
    count: reviews.length,
    average,
    headline,
    positives: positives.slice(0, 3),
    cautions: cautions.slice(0, 3),
  };
}
