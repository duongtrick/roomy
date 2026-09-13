import { Linking } from "react-native";

/**
 * Liên kết sang ứng dụng Google Maps.
 *
 * Điểm mấu chốt: *Maps SDK* mới cần API key, còn *URL scheme* thì không. Các
 * link dưới đây là dạng "Maps URLs" Google công bố công khai, dùng được vô hạn
 * mà không cần key, không cần tài khoản Google Cloud.
 *
 * `dir/?api=1` mở thẳng chế độ chỉ đường: có app Google Maps thì vào app, không
 * có thì rơi về trình duyệt — nên không cần kiểm tra `canOpenURL` trước.
 */

/** Link chỉ đường tới một toạ độ. */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Link xem một toạ độ trên bản đồ (không chỉ đường). */
export function placeUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Toạ độ hợp lệ mới mở được. Trả về `false` nếu thiếu toạ độ để phía gọi hiện
 * thông báo thay vì mở một link hỏng.
 */
export function hasCoords(lat: number | null, lng: number | null): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Mở Google Maps ở chế độ chỉ đường. Ném lỗi nếu máy không mở được link. */
export async function openDirections(lat: number, lng: number): Promise<void> {
  await Linking.openURL(directionsUrl(lat, lng));
}
