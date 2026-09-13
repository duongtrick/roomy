import type { Room } from "./api/catalogue";

/** Filter options for the home feed. Static — not derived from the data. */
export const ANY_AREA = "Toàn thành phố";

export const PRICE_BANDS = [
  { label: "Tất cả mức giá", min: 0, max: Infinity },
  { label: "Dưới 2 triệu", min: 0, max: 2_000_000 },
  { label: "2 - 4 triệu", min: 2_000_000, max: 4_000_000 },
  { label: "Trên 4 triệu", min: 4_000_000, max: Infinity },
];

/**
 * Khoảng cách tới trường, tính bằng mét.
 *
 * Mốc 500 m / 1 km / 2 km là quãng đi bộ, đạp xe và đi xe máy — đúng cách
 * sinh viên nghĩ về đường tới trường. Phòng chưa khai khoảng cách bị loại
 * khỏi mọi mốc hẹp: thà thiếu một tin còn hơn hứa "dưới 500 m" mà không biết.
 */
export const DISTANCE_BANDS = [
  { label: "Mọi khoảng cách", max: Infinity },
  { label: "Dưới 500 m", max: 500 },
  { label: "Dưới 1 km", max: 1000 },
  { label: "Dưới 2 km", max: 2000 },
];

export type SortKey = "newest" | "price-asc" | "price-desc" | "distance";

export const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Mới đăng trước", value: "newest" },
  { label: "Giá thấp → cao", value: "price-asc" },
  { label: "Giá cao → thấp", value: "price-desc" },
  { label: "Gần trường nhất", value: "distance" },
];

/**
 * Bỏ dấu tiếng Việt để "quang trung" tìm được "Quang Trung".
 *
 * Tra bảng thay vì `normalize("NFD")`: Hermes bật `normalize` tuỳ bản dựng,
 * và một hàm tìm kiếm im lặng trả về sai kết quả trên một nền tảng là loại
 * lỗi khó thấy nhất.
 */
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

/**
 * Tìm kiếm theo từ khoá trên toàn bộ phần chữ của tin đăng.
 *
 * Lọc tại máy chứ không phải bằng `ilike` trên server: cả danh sách phòng đã
 * nằm sẵn trong bộ nhớ sau một lần tải, nên gõ thêm một ký tự mà phải chờ một
 * vòng mạng là chậm không cần thiết.
 */
export function matchesQuery(room: Room, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  const haystack = fold(
    [room.title, room.area, room.district, room.address, room.school, ...room.amenities].join(" "),
  );
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

/** Phòng chưa khai khoảng cách xếp sau cùng khi sắp theo "gần trường nhất". */
export function sortRooms(rooms: Room[], key: SortKey): Room[] {
  const out = [...rooms];
  switch (key) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price);
    case "price-desc":
      return out.sort((a, b) => b.price - a.price);
    case "distance":
      return out.sort(
        (a, b) => (a.distanceToSchool ?? Infinity) - (b.distanceToSchool ?? Infinity),
      );
    default:
      return out;
  }
}

/** Map camera framing Thái Nguyên, used before any room is selected. */
export const TN_REGION = {
  latitude: 21.5905,
  longitude: 105.8375,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};
