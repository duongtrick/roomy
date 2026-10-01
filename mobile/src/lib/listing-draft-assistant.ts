type VerificationLevel = "unverified" | "pending" | "verified";

export type ListingDraftAssistantInput = {
  title: string;
  price: string;
  size: string;
  electricityRate: string;
  waterRate: string;
  publicTitle: string;
  publicDescription: string;
  address: string;
  area: string;
  district: string;
  amenities: string;
  lat: string;
  lng: string;
  school: string;
  distance: string;
  isPublished: boolean;
  verification: VerificationLevel;
};

export type ListingDraftAssistantResult = {
  score: number;
  label: "Cần bổ sung" | "Khá ổn" | "Sẵn sàng hơn";
  missing: string[];
  tips: string[];
};

const splitAmenities = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const validPositiveNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

const validCoords = (lat: string, lng: string) => {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  return (
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180
  );
};

export function assessListingDraft(input: ListingDraftAssistantInput): ListingDraftAssistantResult {
  const missing: string[] = [];
  const tips: string[] = [];
  const amenities = splitAmenities(input.amenities);
  let score = 0;

  if (input.publicTitle.trim().length >= 12 || input.title.trim().length >= 8) score += 12;
  else missing.push("Tên công khai nên rõ loại phòng và điểm nổi bật.");

  if (validPositiveNumber(input.price)) score += 12;
  else missing.push("Giá thuê cần là số hợp lệ.");

  if (validPositiveNumber(input.size)) score += 8;
  else tips.push("Thêm diện tích để người thuê lọc phòng nhanh hơn.");

  if (input.publicDescription.trim().length >= 80) score += 16;
  else missing.push("Mô tả công khai còn ngắn; nên nêu tiện nghi, lối đi, giờ giấc, gửi xe.");

  if (input.address.trim()) score += 10;
  else missing.push("Thiếu địa chỉ công khai.");

  if (validCoords(input.lat, input.lng)) score += 10;
  else missing.push("Thiếu toạ độ bản đồ hợp lệ.");

  if (input.area.trim() || input.district.trim()) score += 8;
  else tips.push("Thêm khu vực hoặc mốc gần đó để tin dễ được tìm thấy.");

  if (amenities.length >= 3) score += 10;
  else tips.push("Nên có ít nhất 3 tiện ích thật như Wifi, điều hoà, ban công, gửi xe.");

  if (validPositiveNumber(input.electricityRate) && validPositiveNumber(input.waterRate)) score += 8;
  else missing.push("Thiếu đơn giá điện nước.");

  if (input.school.trim() && validPositiveNumber(input.distance)) score += 8;
  else tips.push("Thêm trường gần nhất và khoảng cách để Roomy gợi ý đúng nhu cầu sinh viên.");

  if (input.verification === "verified") score += 8;
  else if (input.verification === "pending") tips.push("Tin đang chờ xác thực; huy hiệu giúp tăng độ tin cậy.");
  else tips.push("Gửi yêu cầu xác thực khi thông tin đã đầy đủ.");

  if (input.isPublished && missing.length > 0) {
    tips.unshift("Tin đang bật công khai nhưng còn thiếu thông tin dễ làm người thuê bỏ qua.");
  }

  const capped = Math.min(100, score);
  const label =
    capped >= 80 ? "Sẵn sàng hơn" : capped >= 55 ? "Khá ổn" : "Cần bổ sung";

  return { score: capped, label, missing, tips };
}
