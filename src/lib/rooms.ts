import room1 from "@/assets/room-1.jpg";
import room2 from "@/assets/room-2.jpg";
import room3 from "@/assets/room-3.jpg";
export { formatVND, formatVNDExact } from "./format";

export type Room = {
  id: string;
  title: string;
  area: string; // khu vực
  district: string;
  address: string;
  price: number; // VND/tháng
  size: number; // m²
  amenities: string[];
  description: string;
  image: string;
  gallery: string[];
  landlord: { name: string; phone: string; rating: number };
  reviews: { author: string; rating: number; comment: string; date: string }[];
  lat: number;
  lng: number;
};

export const ROOMS: Room[] = [
  {
    id: "studio-quang-trung",
    title: "Phòng Studio Ban Công Xanh — Quang Trung",
    area: "Phường Quang Trung",
    district: "Gần ĐH Sư Phạm",
    address: "Ngõ 24 Lương Ngọc Quyến, P. Quang Trung, TP. Thái Nguyên",
    price: 3200000,
    size: 30,
    amenities: ["Điều hòa", "Ban công", "Bếp riêng", "Wifi", "Khép kín"],
    description:
      "Nội thất gỗ tự nhiên, không gian yên tĩnh, cách cổng trường 200m. Phù hợp cho sinh viên hoặc người đi làm. Cửa sổ lớn đón nắng sớm, có khu vực bếp riêng và ban công nhỏ trồng cây.",
    image: room1,
    gallery: [room1, room2, room3],
    landlord: { name: "Cô Hằng", phone: "0912 345 678", rating: 4.9 },
    reviews: [
      {
        author: "Minh Anh",
        rating: 5,
        comment: "Phòng sạch sẽ, chủ nhà thân thiện. Rất hài lòng.",
        date: "03/2026",
      },
      {
        author: "Tuấn Kiệt",
        rating: 5,
        comment: "Vị trí thuận tiện, gần trường, an ninh tốt.",
        date: "01/2026",
      },
    ],
    lat: 21.5942,
    lng: 105.8482,
  },
  {
    id: "can-ho-cmt8",
    title: "Căn hộ dịch vụ Full nội thất — Đường CMT8",
    area: "Phường Trưng Vương",
    district: "Khu Gang Thép",
    address: "Số 142 Cách Mạng Tháng 8, P. Trưng Vương, TP. Thái Nguyên",
    price: 2800000,
    size: 25,
    amenities: ["An ninh 24/7", "Thang máy", "Khóa vân tay", "Wifi", "Điều hòa"],
    description:
      "An ninh 24/7, có thang máy, khóa vân tay. Khu dân cư trí thức, gần chợ Thái và siêu thị lớn. Đầy đủ nội thất, dọn vào ở ngay.",
    image: room2,
    gallery: [room2, room3, room1],
    landlord: { name: "Anh Trung", phone: "0987 654 321", rating: 4.8 },
    reviews: [
      {
        author: "Hà Linh",
        rating: 5,
        comment: "Quản lý chuyên nghiệp, phòng đẹp như hình.",
        date: "04/2026",
      },
    ],
    lat: 21.5868,
    lng: 105.8252,
  },
  {
    id: "studio-mountain-view",
    title: "Studio View Núi — Tân Thịnh",
    area: "Phường Tân Thịnh",
    district: "Gần ĐH Thái Nguyên",
    address: "Ngõ 6 Z115, P. Tân Thịnh, TP. Thái Nguyên",
    price: 3800000,
    size: 35,
    amenities: ["Ban công", "View núi", "Bếp riêng", "Máy giặt", "Wifi"],
    description:
      "Tầng cao, view núi xanh mướt vùng chè. Trần gỗ ấm cúng, bếp mở, bàn ăn cho 2 người. Lý tưởng cho cặp đôi trẻ.",
    image: room3,
    gallery: [room3, room1, room2],
    landlord: { name: "Chú Hùng", phone: "0901 222 333", rating: 5.0 },
    reviews: [
      {
        author: "Phương Thảo",
        rating: 5,
        comment: "View tuyệt vời, sáng nào cũng thấy núi.",
        date: "02/2026",
      },
      {
        author: "Đức Anh",
        rating: 4,
        comment: "Phòng đẹp, hơi xa trung tâm một chút.",
        date: "12/2025",
      },
    ],
    lat: 21.6012,
    lng: 105.8351,
  },
  {
    id: "phong-gia-re-sv",
    title: "Phòng trọ sinh viên giá tốt — Quyết Thắng",
    area: "Phường Quyết Thắng",
    district: "Gần ĐH Nông Lâm",
    address: "Ngõ 12 Tân Thịnh, P. Quyết Thắng, TP. Thái Nguyên",
    price: 1500000,
    size: 18,
    amenities: ["Wifi", "Quạt trần", "Khép kín", "Gửi xe miễn phí"],
    description:
      "Phòng giá rẻ phù hợp sinh viên, có gác xép. Khu trọ yên tĩnh, chủ nhà nhiệt tình.",
    image: room1,
    gallery: [room1, room2],
    landlord: { name: "Bác Tâm", phone: "0978 111 222", rating: 4.6 },
    reviews: [
      { author: "Quang Huy", rating: 4, comment: "Giá hợp lý cho sinh viên.", date: "05/2026" },
    ],
    lat: 21.5755,
    lng: 105.8418,
  },
];

export const AREAS = [
  "Toàn thành phố",
  "Phường Quang Trung",
  "Phường Trưng Vương",
  "Phường Tân Thịnh",
  "Phường Quyết Thắng",
] as const;

export const PRICE_BANDS = [
  { label: "Tất cả mức giá", min: 0, max: Infinity },
  { label: "Dưới 2 triệu", min: 0, max: 2_000_000 },
  { label: "2 - 4 triệu", min: 2_000_000, max: 4_000_000 },
  { label: "Trên 4 triệu", min: 4_000_000, max: Infinity },
];

export function getRoom(id: string) {
  return ROOMS.find((r) => r.id === id);
}
