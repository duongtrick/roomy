export type BookingAssistantInput = {
  id: string;
  roomTitle: string;
  name: string;
  date: string;
  time: string;
  note: string | null;
  status: "pending" | "confirmed" | "cancelled";
};

export type BookingAssistantTask = {
  id: string;
  priority: "urgent" | "today" | "soon";
  title: string;
  note: string;
  draft: string;
  sortKey: string;
};

function dateOnly(value: string) {
  const time = Date.parse(`${value}T00:00:00`);
  return Number.isNaN(time) ? null : time;
}

function daysBetween(from: string, to: string) {
  const start = dateOnly(from);
  const end = dateOnly(to);
  if (start == null || end == null) return null;
  return Math.ceil((end - start) / 86_400_000);
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function bookingAssistant(
  bookings: BookingAssistantInput[],
  today: string,
): BookingAssistantTask[] {
  return bookings
    .flatMap((booking): BookingAssistantTask[] => {
      if (booking.status !== "pending") return [];
      const daysLeft = daysBetween(today, booking.date);
      if (daysLeft == null) return [];

      const priority = daysLeft < 0 ? "urgent" : daysLeft === 0 ? "today" : "soon";
      const date = displayDate(booking.date);
      const guestNote = booking.note?.trim() ? ` Ghi chú khách: ${booking.note.trim()}` : "";
      const title =
        priority === "urgent"
          ? `${booking.roomTitle} có lịch xem đã qua`
          : priority === "today"
            ? `${booking.roomTitle} có lịch xem hôm nay`
            : `${booking.roomTitle} chờ xác nhận lịch xem`;
      const note =
        priority === "urgent"
          ? `${booking.name} đặt ${date} lúc ${booking.time}, cần phản hồi lại.`
          : priority === "today"
            ? `${booking.name} muốn xem lúc ${booking.time} hôm nay.`
            : `${booking.name} đặt ${date} lúc ${booking.time}.`;
      const draft = `Chào ${booking.name}, mình xác nhận lịch xem phòng ${booking.roomTitle} vào ${date} lúc ${booking.time}. Nếu bạn cần đổi giờ, nhắn lại giúp mình nhé.${guestNote}`;

      return [
        {
          id: booking.id,
          priority,
          title,
          note,
          draft,
          sortKey: `${booking.date} ${booking.time}`,
        },
      ];
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
