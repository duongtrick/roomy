/**
 * Tra cứu địa chỉ bằng Nominatim (OpenStreetMap) — miễn phí, không cần API key.
 *
 * Điều kiện sử dụng của Nominatim bắt buộc hai thứ, cả hai đều đã tuân thủ ở
 * đây: gửi `User-Agent` nhận dạng được ứng dụng, và không quá 1 request/giây.
 * Giới hạn tần suất do phía gọi bảo đảm bằng debounce — xem `LocationPicker`.
 *
 * Độ phủ địa chỉ Việt Nam của OSM tốt ở mức đường/phường/thành phố, nhưng thưa
 * hơn Google ở số nhà và ngõ ngách. Vì vậy sau khi chọn gợi ý, chủ trọ vẫn nên
 * chạm lên bản đồ để chỉnh ghim cho đúng.
 */

const ENDPOINT = "https://nominatim.openstreetmap.org";

const HEADERS = {
  "User-Agent": "Roomy/1.0 (vn.roomy.app)",
  "Accept-Language": "vi",
};

export type Place = {
  id: string;
  /** Dòng đầu, ngắn gọn — thường là tên đường hoặc địa điểm. */
  name: string;
  /** Địa chỉ đầy đủ do Nominatim trả về. */
  label: string;
  lat: number;
  lng: number;
};

type NominatimItem = {
  place_id?: number | string;
  osm_id?: number | string;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
};

function toPlace(item: NominatimItem, index: number): Place | null {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const label = item.display_name?.trim() ?? "";
  if (!label) return null;

  return {
    id: String(item.place_id ?? item.osm_id ?? `${lat},${lng}#${index}`),
    name: item.name?.trim() || label.split(",")[0].trim(),
    label,
    lat,
    lng,
  };
}

/**
 * Tìm địa chỉ theo từ khoá, giới hạn trong Việt Nam.
 *
 * Truyền `signal` để huỷ request cũ khi người dùng gõ tiếp — nếu không các
 * phản hồi về trễ có thể ghi đè kết quả mới hơn.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url =
    `${ENDPOINT}/search?format=jsonv2&q=${encodeURIComponent(q)}` +
    `&countrycodes=vn&limit=6&addressdetails=0`;

  const res = await fetch(url, { headers: HEADERS, signal });
  if (!res.ok) throw new Error(`Nominatim trả về ${res.status}`);

  const items: unknown = await res.json();
  if (!Array.isArray(items)) return [];

  return items
    .map((item, i) => toPlace(item as NominatimItem, i))
    .filter((p): p is Place => p !== null);
}

/** Tra ngược toạ độ ra địa chỉ — dùng khi chủ trọ chạm lên bản đồ để ghim. */
export async function reverseLookup(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<Place | null> {
  const url = `${ENDPOINT}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`;

  const res = await fetch(url, { headers: HEADERS, signal });
  if (!res.ok) throw new Error(`Nominatim trả về ${res.status}`);

  const item: unknown = await res.json();
  if (!item || typeof item !== "object") return null;

  return toPlace(item as NominatimItem, 0);
}
