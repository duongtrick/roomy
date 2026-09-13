import { colors } from "@/theme";
import type { ListingStatus } from "./database.types";

/**
 * Presentation for the room status column.
 *
 * The row shapes themselves now come from `database.types`; this file is only
 * the labels and chip colours that the database has no opinion about.
 */
export type RoomStatus = ListingStatus;

export const STATUS_ORDER: RoomStatus[] = ["available", "occupied", "maintenance"];

/**
 * `listings.status` is constrained in SQL, but a row can still arrive from an
 * older client or a hand-written insert, so anything unrecognised is narrowed
 * before it indexes the label and colour maps.
 */
export function toRoomStatus(status: string): RoomStatus {
  return (STATUS_ORDER as string[]).includes(status) ? (status as RoomStatus) : "available";
}

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  available: "Còn trống",
  occupied: "Đã thuê",
  maintenance: "Bảo trì",
};

/**
 * Chip palette per status.
 *
 * The two common states stay inside the brand ramp and are separated by
 * weight, not hue — a tinted chip for a room that is free, a solid one for a
 * room that is taken. `colors.blue` is deliberately not reused here: the
 * "chưa ghi chỉ số" / "chờ tạo HĐ" flags sit right beside these chips and
 * would be indistinguishable. Maintenance keeps amber because it is a warning.
 */
export const ROOM_STATUS_COLOR: Record<RoomStatus, { bg: string; fg: string; border: string }> = {
  available: { bg: colors.primarySoft, fg: colors.primary, border: colors.blue.border },
  occupied: { bg: colors.primaryDeep, fg: colors.primaryForeground, border: colors.primaryDeep },
  maintenance: colors.amber,
};

export type {
  InvoiceRow as Invoice,
  LeaseRow as Lease,
  ListingRow as Listing,
  MeterReadingRow as MeterReading,
  TenantRow as Tenant,
} from "./database.types";

export { currentPeriod, today } from "./format";
