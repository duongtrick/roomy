export type RoomStatus = "available" | "occupied" | "maintenance";

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  available: "Còn trống",
  occupied: "Đã thuê",
  maintenance: "Bảo trì",
};

export const ROOM_STATUS_COLOR: Record<RoomStatus, string> = {
  available: "bg-emerald-100 text-emerald-700 border-emerald-200",
  occupied: "bg-blue-100 text-blue-700 border-blue-200",
  maintenance: "bg-amber-100 text-amber-700 border-amber-200",
};

export type Listing = {
  id: string;
  title: string;
  price: number;
  size: number | null;
  address: string | null;
  area: string | null;
  image_url: string | null;
  status: string;
  description: string | null;
  electricity_rate: number;
  water_rate: number;
  created_at: string;
};

export type Tenant = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  move_in_date: string | null;
  notes: string | null;
};

export type Lease = {
  id: string;
  listing_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  deposit: number;
  status: string;
  notes: string | null;
};

export type MeterReading = {
  id: string;
  listing_id: string;
  period: string;
  electricity_start: number;
  electricity_end: number;
  water_start: number;
  water_end: number;
};

export type Invoice = {
  id: string;
  lease_id: string | null;
  listing_id: string;
  tenant_id: string | null;
  period: string;
  rent_amount: number;
  electricity_kwh: number;
  electricity_amount: number;
  water_m3: number;
  water_amount: number;
  other_amount: number;
  total_amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
};

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
