import { useCallback, useEffect, useRef, useState } from "react";

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type Booking = {
  id: string;
  roomId: string;
  roomTitle: string;
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string;
  status: BookingStatus;
  createdAt: number;
};

const KEY = "roomy:bookings";
const EVT = "roomy:bookings-change";

/** How long the mock landlord takes to "confirm" a request. */
const CONFIRM_DELAY_MS = 6_000;

function isBooking(value: unknown): value is Booking {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  return typeof b.id === "string" && typeof b.roomId === "string" && typeof b.date === "string";
}

function read(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    // Drop anything malformed instead of handing the UI a broken row.
    return Array.isArray(parsed) ? parsed.filter(isBooking) : [];
  } catch {
    return [];
  }
}

function write(list: Booking[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota/private mode — still notify so the current view stays consistent.
  }
  window.dispatchEvent(new Event(EVT));
}

/** `crypto.randomUUID` is unavailable outside secure contexts (e.g. plain-http LAN testing). */
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
] as const;

export function useBookings() {
  const [list, setList] = useState<Booking[]>([]);
  // Pending mock-confirmation timers, so they can be cancelled on unmount.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setList(read());
    const onChange = () => setList(read());
    window.addEventListener("storage", onChange);
    window.addEventListener(EVT, onChange);

    const pending = timers.current;
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVT, onChange);
      pending.forEach(clearTimeout);
      pending.length = 0;
    };
  }, []);

  const add = useCallback((b: Omit<Booking, "id" | "status" | "createdAt">) => {
    const booking: Booking = { ...b, id: newId(), status: "pending", createdAt: Date.now() };
    write([booking, ...read()]);

    const timer = setTimeout(() => {
      const cur = read();
      const idx = cur.findIndex((x) => x.id === booking.id);
      if (idx >= 0 && cur[idx].status === "pending") {
        cur[idx] = { ...cur[idx], status: "confirmed" };
        write(cur);
      }
    }, CONFIRM_DELAY_MS);
    timers.current.push(timer);

    return booking;
  }, []);

  const cancel = useCallback((id: string) => {
    const cur = read();
    const idx = cur.findIndex((x) => x.id === id);
    if (idx < 0) return;
    cur[idx] = { ...cur[idx], status: "cancelled" };
    write(cur);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((x) => x.id !== id));
  }, []);

  return { bookings: list, add, cancel, remove };
}

export function statusLabel(s: BookingStatus) {
  return s === "pending" ? "Đang chờ xác nhận" : s === "confirmed" ? "Đã xác nhận" : "Đã hủy";
}
