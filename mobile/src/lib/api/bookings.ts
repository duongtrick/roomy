import { supabase } from "../supabase";
import type { BookingStatus } from "../database.types";
import { assertConfigured, requireUserId, unwrap, unwrapAs } from "./errors";

export type { BookingStatus };

/**
 * Viewing requests.
 *
 * On the device these used to flip themselves to "confirmed" after six
 * seconds. Now the row stays `pending` until the landlord actually acts on it
 * from the dashboard — the status means something.
 */
export type Booking = {
  id: string;
  listingId: string;
  roomTitle: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  note: string | null;
  status: BookingStatus;
  createdAt: string;
};

const SELECT = `
  id, listing_id, name, phone, view_date, view_time, note, status, created_at,
  listing:listings!bookings_listing_id_fkey ( public_title, title )
` as const;

type BookingJoin = {
  id: string;
  listing_id: string;
  name: string;
  phone: string;
  view_date: string;
  view_time: string;
  note: string | null;
  status: BookingStatus;
  created_at: string;
  listing: { public_title: string | null; title: string } | null;
};

function toBooking(row: BookingJoin): Booking {
  return {
    id: row.id,
    listingId: row.listing_id,
    roomTitle: row.listing?.public_title ?? row.listing?.title ?? "Phòng đã gỡ",
    name: row.name,
    phone: row.phone,
    date: row.view_date,
    time: row.view_time,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Every booking the caller may see.
 *
 * RLS decides the scope: a tenant gets their own requests, a landlord also
 * gets the ones filed against their rooms. That is why there is no filter
 * here and no separate "landlord" variant.
 */
export async function getBookings(): Promise<Booking[]> {
  assertConfigured();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return [];

  const rows = unwrapAs<BookingJoin[]>(
    await supabase.from("bookings").select(SELECT).order("created_at", { ascending: false }),
  );
  return rows.map(toBooking);
}

export type BookingDraft = {
  listingId: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  note: string | null;
};

export async function createBooking(draft: BookingDraft): Promise<Booking> {
  const userId = await requireUserId();
  const row = unwrapAs<BookingJoin>(
    await supabase
      .from("bookings")
      .insert({
        listing_id: draft.listingId,
        user_id: userId,
        name: draft.name,
        phone: draft.phone,
        view_date: draft.date,
        view_time: draft.time,
        note: draft.note,
      })
      .select(SELECT)
      .single(),
  );
  return toBooking(row);
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("bookings").update({ status }).eq("id", id).select("id"));
}

export async function deleteBooking(id: string): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("bookings").delete().eq("id", id).select("id"));
}

export function statusLabel(s: BookingStatus) {
  return s === "pending" ? "Đang chờ xác nhận" : s === "confirmed" ? "Đã xác nhận" : "Đã hủy";
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
