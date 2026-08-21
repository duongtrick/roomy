import { useCallback, useEffect, useState } from "react";

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

function read(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list: Booking[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
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

  useEffect(() => {
    setList(read());
    const onChange = () => setList(read());
    window.addEventListener("storage", onChange);
    window.addEventListener(EVT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVT, onChange);
    };
  }, []);

  const add = useCallback((b: Omit<Booking, "id" | "status" | "createdAt">) => {
    const booking: Booking = {
      ...b,
      id: crypto.randomUUID(),
      status: "pending",
      createdAt: Date.now(),
    };
    write([booking, ...read()]);
    // Simulate landlord confirmation after a short delay
    setTimeout(() => {
      const cur = read();
      const idx = cur.findIndex((x) => x.id === booking.id);
      if (idx >= 0 && cur[idx].status === "pending") {
        cur[idx] = { ...cur[idx], status: "confirmed" };
        write(cur);
      }
    }, 6000);
    return booking;
  }, []);

  const cancel = useCallback((id: string) => {
    const cur = read();
    const idx = cur.findIndex((x) => x.id === id);
    if (idx >= 0) {
      cur[idx] = { ...cur[idx], status: "cancelled" };
      write(cur);
    }
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((x) => x.id !== id));
  }, []);

  return { bookings: list, add, cancel, remove };
}

export function statusLabel(s: BookingStatus) {
  return s === "pending" ? "Đang chờ xác nhận" : s === "confirmed" ? "Đã xác nhận" : "Đã hủy";
}
