export type TenantTourInput = {
  id: string;
  roomTitle: string;
  date: string;
  time: string;
  note: string | null;
  status: "pending" | "confirmed" | "cancelled";
};

export type TenantTourPlan = {
  title: string;
  tone: "normal" | "careful" | "urgent";
  focusBookingId: string | null;
  focusRoomTitle: string | null;
  summary: string;
  actions: string[];
  questions: string[];
  messageDraft: string | null;
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

export function tenantTourAssistant(
  bookings: TenantTourInput[],
  today: string,
): TenantTourPlan | null {
  const active = bookings
    .filter((booking) => booking.status !== "cancelled")
    .map((booking) => ({ booking, daysLeft: daysBetween(today, booking.date) }))
    .filter((item): item is { booking: TenantTourInput; daysLeft: number } => item.daysLeft != null)
    .sort((a, b) => `${a.booking.date} ${a.booking.time}`.localeCompare(`${b.booking.date} ${b.booking.time}`));

  if (active.length === 0) return null;

  const overduePending = active.find((item) => item.booking.status === "pending" && item.daysLeft < 0);
  const todayTour = active.find((item) => item.booking.status === "confirmed" && item.daysLeft === 0);
  const pending = active.find((item) => item.booking.status === "pending" && item.daysLeft >= 0);
  const confirmed = active.find((item) => item.booking.status === "confirmed" && item.daysLeft >= 0);
  const focus = overduePending ?? todayTour ?? pending ?? confirmed ?? active[0];
  const booking = focus.booking;
  const date = displayDate(booking.date);

  if (overduePending) {
    return {
      title: "Lịch xem đã quá hạn phản hồi",
      tone: "urgent",
      focusBookingId: booking.id,
      focusRoomTitle: booking.roomTitle,
      summary: `${booking.roomTitle} vẫn đang chờ xác nhận dù lịch ${date} đã qua.`,
      actions: [
        "Gửi lại tin nhắn ngắn để hỏi còn phòng không.",
        "Lưu thêm phòng dự phòng, đừng chờ một chủ trọ quá lâu.",
        "Không chuyển cọc khi lịch xem chưa được xác nhận.",
      ],
      questions: [
        "Phòng còn trống không?",
        "Có thể hẹn lại khung giờ mới nào?",
        "Tiền cọc và điều kiện hoàn cọc ghi ở đâu?",
      ],
      messageDraft: `Chào anh/chị, em đã đặt lịch xem phòng ${booking.roomTitle} ngày ${date} lúc ${booking.time} nhưng chưa thấy xác nhận. Phòng còn trống không ạ? Nếu còn, anh/chị cho em xin khung giờ xem phù hợp nhé.`,
    };
  }

  if (todayTour) {
    return {
      title: "Hôm nay đi xem phòng",
      tone: "careful",
      focusBookingId: booking.id,
      focusRoomTitle: booking.roomTitle,
      summary: `${booking.roomTitle} đã xác nhận lịch hôm nay lúc ${booking.time}.`,
      actions: [
        "Chụp lại tin đăng, giá thuê và đơn giá điện nước trước khi đi.",
        "Đi cùng bạn/người thân nếu khu vực hoặc tin đăng còn lạ.",
        "Đến nơi kiểm tra khoá cửa, nhà vệ sinh, sóng điện thoại và lối thoát hiểm.",
      ],
      questions: [
        "Tổng tiền tháng đầu gồm những khoản nào?",
        "Ai là người nhận cọc và có biên nhận không?",
        "Giờ giấc, khách qua đêm, gửi xe, internet tính thế nào?",
      ],
      messageDraft: `Chào anh/chị, em xác nhận hôm nay em đến xem phòng ${booking.roomTitle} lúc ${booking.time}. Nhờ anh/chị gửi giúp em địa chỉ/điểm hẹn cụ thể ạ.`,
    };
  }

  if (pending) {
    return {
      title: "Đang chờ chủ trọ xác nhận",
      tone: "normal",
      focusBookingId: booking.id,
      focusRoomTitle: booking.roomTitle,
      summary: `${booking.roomTitle} đang chờ xác nhận lịch ${date} lúc ${booking.time}.`,
      actions: [
        "Nếu sau vài giờ chưa phản hồi, gọi hoặc gửi tin nhắn nhắc nhẹ.",
        "Giữ thêm 1-2 phòng dự phòng cùng khu vực.",
        "Chưa chuyển cọc trước khi có lịch xem rõ ràng.",
      ],
      questions: [
        "Chủ trọ có thể xác nhận lịch này không?",
        "Phòng còn đúng giá và còn trống không?",
        "Có cần chuẩn bị giấy tờ gì khi đi xem không?",
      ],
      messageDraft: `Chào anh/chị, em muốn xác nhận lịch xem phòng ${booking.roomTitle} ngày ${date} lúc ${booking.time}. Phòng còn trống và xem được khung giờ này không ạ?`,
    };
  }

  return {
    title: "Chuẩn bị lịch xem sắp tới",
    tone: "normal",
    focusBookingId: booking.id,
    focusRoomTitle: booking.roomTitle,
    summary: `${booking.roomTitle} đã xác nhận lịch ${date} lúc ${booking.time}.`,
    actions: [
      "Lưu tuyến đường và dự kiến thời gian di chuyển.",
      "Mang danh sách câu hỏi về phí, cọc, nội quy.",
      "Sau khi xem, ghi lại điểm thích/không thích để so sánh với phòng khác.",
    ],
    questions: [
      "Điện nước tính theo công tơ hay khoán?",
      "Cọc bao nhiêu và khi nào được hoàn?",
      "Hợp đồng tối thiểu mấy tháng?",
    ],
    messageDraft: `Chào anh/chị, em đã nhận lịch xem phòng ${booking.roomTitle} ngày ${date} lúc ${booking.time}. Trước khi đi, anh/chị gửi giúp em địa chỉ/điểm hẹn cụ thể nhé.`,
  };
}
