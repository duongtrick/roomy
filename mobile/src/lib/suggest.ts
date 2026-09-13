import type { Room } from "./api/catalogue";
import { formatDistance } from "./format";

/**
 * Gợi ý phòng — xếp hạng bằng luật, không phải mô hình học máy.
 *
 * Mỗi tiêu chí cộng điểm theo công thức viết thẳng ở đây, và mỗi phòng được
 * gợi ý đều kèm lý do rút ra từ chính tiêu chí đã cộng điểm cho nó. Chọn cách
 * này thay vì một mô hình vì dữ liệu hành vi hiện chỉ có danh sách yêu thích:
 * không đủ để huấn luyện, mà lại thừa để hiện một hộp đen không giải thích
 * được. Khi có đủ log tìm kiếm thì thay phần chấm điểm ở dưới, phần còn lại
 * của màn hình không phải sửa.
 */

export type Suggestion = {
  room: Room;
  score: number;
  /** Vì sao phòng này được gợi ý — hiện thẳng trên thẻ. */
  reasons: string[];
};

/** Trung vị giá của cả danh sách, làm mốc cho tiêu chí "giá tốt". */
function medianPrice(rooms: Room[]): number {
  if (rooms.length === 0) return 0;
  const sorted = rooms.map((r) => r.price).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function score(room: Room, median: number, favouriteAreas: Set<string>) {
  const reasons: string[] = [];
  let total = 0;

  if (room.verification === "verified") {
    total += 25;
    reasons.push("Đã xác thực");
  } else if (room.verification === "pending") {
    total += 8;
  }

  if (room.status === "available") total += 20;

  // Càng gần trường càng nhiều điểm, hết điểm ở mốc 3 km. Phòng chưa khai
  // khoảng cách không bị trừ — chỉ là không được cộng.
  if (room.distanceToSchool != null) {
    const d = Math.max(0, Math.min(room.distanceToSchool, 3000));
    const points = Math.round(((3000 - d) / 3000) * 25);
    total += points;
    if (room.distanceToSchool <= 1000) {
      reasons.push(`Cách trường ${formatDistance(room.distanceToSchool)}`);
    }
  }

  if (median > 0 && room.price < median) {
    total += Math.round(Math.min((median - room.price) / median, 0.4) * 40);
    reasons.push("Giá dưới trung bình");
  }

  if (room.landlord.rating > 0) {
    total += Math.round(room.landlord.rating * 4);
    if (room.landlord.rating >= 4.5) reasons.push(`${room.landlord.rating}★ đánh giá`);
  }

  total += Math.min(room.amenities.length, 6) * 2;

  if (favouriteAreas.has(room.area)) {
    total += 15;
    reasons.push("Cùng khu vực bạn đã lưu");
  }

  return { room, score: total, reasons: reasons.slice(0, 3) };
}

/**
 * Ba phòng đáng xem nhất trong danh sách đang có.
 *
 * `favouriteIds` là các phòng người dùng đã lưu: khu vực của chúng được cộng
 * điểm, còn bản thân chúng bị loại vì gợi ý lại thứ người ta đã lưu là vô ích.
 */
export function suggestRooms(rooms: Room[], favouriteIds: string[] = [], limit = 3): Suggestion[] {
  if (rooms.length === 0) return [];

  const favourites = new Set(favouriteIds);
  const favouriteAreas = new Set(
    rooms.filter((r) => favourites.has(r.id)).map((r) => r.area).filter(Boolean),
  );
  const median = medianPrice(rooms);

  return rooms
    .filter((r) => !favourites.has(r.id))
    .map((r) => score(r, median, favouriteAreas))
    .sort((a, b) => b.score - a.score || a.room.price - b.room.price)
    .slice(0, limit);
}
