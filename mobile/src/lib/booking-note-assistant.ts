import type { VerificationLevel } from "./database.types";

export type BookingNoteRoom = {
  title: string;
  verification: VerificationLevel;
  electricityRate: number | null;
  waterRate: number | null;
  distanceToSchool: number | null;
  reviews: { rating: number }[];
};

export function buildBookingNote(room: BookingNoteRoom): string {
  const title = room.title.length > 36 ? `${room.title.slice(0, 33)}...` : room.title;
  const asks = ["xác nhận còn trống"];

  if (room.electricityRate == null || room.waterRate == null) {
    asks.push("báo điện, nước, internet, gửi xe, vệ sinh");
  }
  if (room.verification !== "verified") {
    asks.push("cho xem giấy tờ cho thuê");
  }
  if (room.distanceToSchool == null) {
    asks.push("gửi vị trí chính xác");
  }
  if (room.reviews.length === 0) {
    asks.push("chia sẻ an ninh, giờ giấc");
  }

  asks.push("nói rõ tiền cọc, thời hạn giữ và điều kiện hoàn cọc");

  const note = `Em muốn xem phòng "${title}". Nhờ anh/chị ${asks.join("; ")} trước buổi xem ạ.`;
  return note.length <= 280 ? note : `${note.slice(0, 277)}...`;
}
