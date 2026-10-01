export type LeaseRenewalInput = {
  id: string;
  roomTitle: string;
  tenantName: string;
  endDate: string | null;
  monthlyRent: number;
  status: "active" | "ended";
};

export type LeaseRenewalTask = {
  leaseId: string;
  tone: "urgent" | "soon";
  title: string;
  note: string;
  draft: string;
  daysLeft: number;
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

function money(value: number) {
  return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function renewalAssistant(
  leases: LeaseRenewalInput[],
  today: string,
  windowDays = 30,
): LeaseRenewalTask[] {
  return leases
    .flatMap((lease): LeaseRenewalTask[] => {
      if (lease.status !== "active" || !lease.endDate) return [];
      const daysLeft = daysBetween(today, lease.endDate);
      if (daysLeft == null || daysLeft > windowDays) return [];

      const ended = daysLeft < 0;
      const endLabel = displayDate(lease.endDate);
      const title = ended
        ? `${lease.roomTitle} đã quá hạn hợp đồng`
        : `${lease.roomTitle} sắp hết hạn hợp đồng`;
      const note = ended
        ? `Quá hạn ${Math.abs(daysLeft)} ngày với ${lease.tenantName}.`
        : `Còn ${daysLeft} ngày với ${lease.tenantName}.`;
      const draft = ended
        ? `Chào ${lease.tenantName}, hợp đồng phòng ${lease.roomTitle} đã hết hạn ngày ${endLabel}. Bạn xác nhận giúp mình là gia hạn tiếp hay trả phòng nhé. Tiền thuê hiện tại ${money(lease.monthlyRent)}/tháng.`
        : `Chào ${lease.tenantName}, hợp đồng phòng ${lease.roomTitle} sẽ hết hạn ngày ${endLabel}. Bạn muốn gia hạn tiếp không? Tiền thuê hiện tại ${money(lease.monthlyRent)}/tháng.`;

      return [{ leaseId: lease.id, tone: ended ? "urgent" : "soon", title, note, draft, daysLeft }];
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
