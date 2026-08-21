import { useState } from "react";
import { z } from "zod";
import { Calendar, Check, Clock, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useBookings, TIME_SLOTS, statusLabel, type Booking } from "@/lib/bookings";
import { formatDate } from "@/lib/format";

const today = () => new Date().toISOString().slice(0, 10);

const schema = z.object({
  name: z.string().trim().min(2, "Vui lòng nhập họ tên (ít nhất 2 ký tự)").max(80, "Tên quá dài"),
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ"),
  date: z
    .string()
    .min(1, "Vui lòng chọn ngày")
    .refine((d) => d >= today(), "Ngày phải từ hôm nay trở đi"),
  time: z.enum(TIME_SLOTS, { message: "Vui lòng chọn khung giờ" }),
  note: z.string().trim().max(280, "Ghi chú tối đa 280 ký tự").optional(),
});

type Props = {
  roomId: string;
  roomTitle: string;
  onClose: () => void;
};

export function BookingModal({ roomId, roomTitle, onClose }: Props) {
  const { add } = useBookings();
  const [form, setForm] = useState({ name: "", phone: "", date: "", time: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Booking | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errs[issue.path[0] as string] = issue.message;
      }
      setErrors(errs);
      return;
    }
    const booking = add({ roomId, roomTitle, ...result.data });
    setSubmitted(booking);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Đặt lịch xem phòng"
        className="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl px-5 sm:px-8 pb-5 pb-safe sm:pb-8 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl animate-in slide-in-from-bottom duration-200 sm:zoom-in-95 sm:slide-in-from-bottom-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle — signals swipe-to-dismiss on touch. */}
        <div className="sm:hidden sticky top-0 -mx-5 px-5 pt-2.5 pb-2 bg-card flex justify-center z-10">
          <span className="h-1 w-10 rounded-full bg-foreground/15" />
        </div>
        <div className="pt-2 sm:pt-8">
          {submitted ? (
            <Confirmation booking={submitted} onClose={onClose} />
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-xl sm:text-2xl font-serif italic font-bold">
                  Đặt lịch xem phòng
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="size-11 -mr-2 shrink-0 grid place-items-center rounded-full hover:bg-foreground/5 active:scale-95 transition"
                  aria-label="Đóng"
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{roomTitle}</p>

              <div className="space-y-4">
                <Field label="Họ và tên" error={errors.name}>
                  <input
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    maxLength={80}
                    className="input"
                    placeholder="Nguyễn Văn A"
                  />
                </Field>

                <Field label="Số điện thoại" error={errors.phone}>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    maxLength={13}
                    className="input"
                    placeholder="0912 345 678"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ngày xem" error={errors.date}>
                    <input
                      type="date"
                      min={today()}
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                      className="input"
                    />
                  </Field>
                  <Field label="Khung giờ" error={errors.time}>
                    <select
                      value={form.time}
                      onChange={(e) => set("time", e.target.value)}
                      className="input"
                    >
                      <option value="">Chọn giờ</option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Ghi chú (tuỳ chọn)" error={errors.note}>
                  <textarea
                    value={form.note}
                    onChange={(e) => set("note", e.target.value)}
                    maxLength={280}
                    rows={3}
                    className="input resize-none"
                    placeholder="Ví dụ: cần xem bếp và ban công..."
                  />
                  <span className="block text-[10px] text-muted-foreground font-mono mt-1 text-right">
                    {form.note.length}/280
                  </span>
                </Field>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-border py-3 rounded-xl font-bold hover:bg-foreground/5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:brightness-110"
                >
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          )}
        </div>
        <style>{`
          .input {
            width: 100%;
            margin-top: 0.35rem;
            padding: 0.75rem 1rem;
            min-height: 3rem;
            border-radius: 0.75rem;
            border: 1px solid var(--color-border);
            background: var(--color-background);
            font-family: inherit;
            /* 16px keeps iOS Safari from zooming the page on focus. */
            font-size: 1rem;
          }
          @media (pointer: fine) {
            .input { font-size: 0.9rem; min-height: 2.5rem; }
          }
          .input:focus { outline: 2px solid var(--color-primary); outline-offset: -1px; }
        `}</style>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-xs text-destructive mt-1 font-medium">{error}</span>
      ) : null}
    </label>
  );
}

function Confirmation({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="size-14 rounded-full bg-accent text-accent-foreground grid place-items-center mx-auto mb-4">
        <Check className="size-6" />
      </div>
      <h3 className="text-2xl font-serif italic font-bold mb-2">Đã gửi yêu cầu</h3>
      <p className="text-muted-foreground text-sm mb-6">
        Chủ trọ sẽ xác nhận lịch xem trong vòng vài phút. Bạn có thể theo dõi trạng thái ở mục{" "}
        <Link to="/bookings" className="text-primary font-bold">
          Lịch của tôi
        </Link>
        .
      </p>

      <div className="text-left bg-stone-50 rounded-2xl p-5 ring-1 ring-foreground/5 space-y-2 mb-6">
        <Row label="Phòng" value={booking.roomTitle} />
        <Row
          label="Thời gian"
          value={
            <span className="inline-flex items-center gap-2">
              <Calendar className="size-3.5" /> {formatDate(booking.date)}
              <Clock className="size-3.5 ml-2" /> {booking.time}
            </span>
          }
        />
        <Row label="Liên hệ" value={`${booking.name} · ${booking.phone}`} />
        <Row
          label="Trạng thái"
          value={
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              {statusLabel(booking.status)}
            </span>
          }
        />
      </div>

      <div className="flex gap-3">
        <Link
          to="/bookings"
          className="flex-1 bg-foreground text-background h-12 rounded-xl font-bold inline-flex items-center justify-center active:scale-[0.98] transition"
        >
          Xem lịch của tôi
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-border h-12 rounded-xl font-bold hover:bg-foreground/5 active:scale-[0.98] transition"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
