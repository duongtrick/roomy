export type RoommateProfileInput = {
  budget: string;
  wakeTime: string;
  sleepTime: string;
  studyStyle: string;
  cleanliness: string;
  guestRule: string;
  dealBreakers: string;
};

export type RoommateProfile = {
  tone: "ready" | "careful";
  title: string;
  summary: string;
  publicBio: string;
  questions: string[];
  boundaries: string[];
};

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function money(value: string) {
  const n = Number(value.replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function roommateProfileAssistant(input: RoommateProfileInput): RoommateProfile | null {
  const budget = money(input.budget);
  const wakeTime = clean(input.wakeTime);
  const sleepTime = clean(input.sleepTime);
  const studyStyle = clean(input.studyStyle);
  const cleanliness = clean(input.cleanliness);
  const guestRule = clean(input.guestRule);
  const dealBreakers = clean(input.dealBreakers);
  const filled = [budget ? String(budget) : "", wakeTime, sleepTime, studyStyle, cleanliness, guestRule].filter(Boolean);

  if (filled.length < 3) return null;

  const budgetText = budget ? `ngân sách khoảng ${Math.round(budget / 100_000) / 10}tr/tháng` : "ngân sách linh hoạt";
  const habits = [
    wakeTime ? `thường dậy ${wakeTime}` : null,
    sleepTime ? `ngủ ${sleepTime}` : null,
    studyStyle ? `học/làm: ${studyStyle}` : null,
    cleanliness ? `giữ phòng: ${cleanliness}` : null,
    guestRule ? `khách đến: ${guestRule}` : null,
  ].filter((item): item is string => Boolean(item));
  const careful = !guestRule || !cleanliness || !sleepTime || Boolean(dealBreakers);

  const questions = [
    "Giờ ngủ, giờ học/làm và báo thức có lệch nhau nhiều không?",
    "Tiền phòng, điện nước, đồ dùng chung chia theo đầu người hay theo mức dùng?",
    "Quy định khách qua đêm, nấu ăn, vệ sinh phòng và mượn đồ cá nhân thế nào?",
  ];
  if (dealBreakers) questions.push(`Có chấp nhận được các điểm không hợp này không: ${dealBreakers}?`);

  const boundaries = [
    "Không chia CCCD, mật khẩu, tài khoản ngân hàng hoặc ảnh giấy tờ trước khi gặp trực tiếp.",
    "Chốt bằng tin nhắn các khoản tiền chung và lịch dọn vệ sinh trước khi chuyển vào.",
    "Ưu tiên gặp ở nơi công cộng hoặc đi cùng bạn khi xem phòng ghép lần đầu.",
  ];

  return {
    tone: careful ? "careful" : "ready",
    title: careful ? "Hồ sơ cần hỏi kỹ thêm" : "Hồ sơ ở ghép khá rõ",
    summary: careful
      ? "Roomy đã soạn hồ sơ, nhưng vẫn còn vài điểm cần chốt trước khi ở chung."
      : "Thông tin đủ rõ để gửi cho bạn ở ghép tiềm năng mà không lộ dữ liệu nhạy cảm.",
    publicBio: `Mình đang tìm bạn ở ghép, ${budgetText}. ${habits.join("; ")}. Ưu tiên trao đổi rõ tiền chung, lịch sinh hoạt và nội quy trước khi vào ở.`,
    questions: questions.slice(0, 4),
    boundaries,
  };
}
