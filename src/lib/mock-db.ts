import type { Listing, Tenant, Lease, MeterReading, Invoice, RoomStatus } from "./dashboard-types";
import { ROOMS } from "./rooms";

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "landlord" | "tenant";
};

const STORAGE_KEYS = {
  USERS: "roomy:db:users",
  CURRENT_USER: "roomy:auth_user",
  LISTINGS: "roomy:db:listings",
  TENANTS: "roomy:db:tenants",
  LEASES: "roomy:db:leases",
  METERS: "roomy:db:meters",
  INVOICES: "roomy:db:invoices",
};

// Initial Seed Data
const INITIAL_USERS: User[] = [
  {
    id: "user-landlord-1",
    email: "demo@roomy.vn",
    full_name: "Nguyễn Văn Chủ Trọ",
    phone: "0912 345 678",
    role: "landlord",
  },
  {
    id: "user-tenant-1",
    email: "tenant@roomy.vn",
    full_name: "Trần Thị Thuê",
    phone: "0987 654 321",
    role: "tenant",
  },
];

const INITIAL_LISTINGS: Listing[] = [
  {
    id: "studio-quang-trung",
    title: "P.101 — Studio Ban Công Xanh",
    price: 3200000,
    size: 30,
    address: "Ngõ 24 Lương Ngọc Quyến, P. Quang Trung, TP. Thái Nguyên",
    area: "Phường Quang Trung",
    image_url: null,
    status: "occupied",
    description: "Nội thất gỗ tự nhiên, không gian yên tĩnh, ban công thoáng mát.",
    electricity_rate: 3500,
    water_rate: 25000,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "can-ho-cmt8",
    title: "P.102 — Căn hộ Dịch Vụ CMT8",
    price: 2800000,
    size: 25,
    address: "Số 142 Cách Mạng Tháng 8, P. Trưng Vương, TP. Thái Nguyên",
    area: "Phường Trưng Vương",
    image_url: null,
    status: "occupied",
    description: "An ninh 24/7, thang máy, khóa vân tay.",
    electricity_rate: 3500,
    water_rate: 25000,
    created_at: "2026-01-05T00:00:00Z",
  },
  {
    id: "studio-mountain-view",
    title: "P.201 — Studio View Núi Tân Thịnh",
    price: 3800000,
    size: 35,
    address: "Ngõ 6 Z115, P. Tân Thịnh, TP. Thái Nguyên",
    area: "Phường Tân Thịnh",
    image_url: null,
    status: "occupied",
    description: "Tầng cao, view núi xanh mát, bếp riêng tiện nghi.",
    electricity_rate: 3800,
    water_rate: 27000,
    created_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "phong-gia-re-sv",
    title: "P.202 — Phòng Trọ Sinh Viên",
    price: 1500000,
    size: 18,
    address: "Ngõ 12 Tân Thịnh, P. Quyết Thắng, TP. Thái Nguyên",
    area: "Phường Quyết Thắng",
    image_url: null,
    status: "available",
    description: "Phòng giá rẻ có gác xép, gần ĐH Nông Lâm.",
    electricity_rate: 3500,
    water_rate: 25000,
    created_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "phong-301-tan-thinh",
    title: "P.301 — Phòng Cao Cấp Tầng 3",
    price: 4200000,
    size: 40,
    address: "Ngõ 6 Z115, P. Tân Thịnh, TP. Thái Nguyên",
    area: "Phường Tân Thịnh",
    image_url: null,
    status: "available",
    description: "Đầy đủ nội thất cao cấp, máy giặt, điều hoà inverter.",
    electricity_rate: 3500,
    water_rate: 25000,
    created_at: "2026-02-15T00:00:00Z",
  },
  {
    id: "phong-302-bao-tri",
    title: "P.302 — Đang Nâng Cấp Nội Thất",
    price: 2000000,
    size: 20,
    address: "Ngõ 24 Lương Ngọc Quyến, P. Quang Trung",
    area: "Phường Quang Trung",
    image_url: null,
    status: "maintenance",
    description: "Đang sơn lại và lắp đặt thiết bị mới.",
    electricity_rate: 3500,
    water_rate: 25000,
    created_at: "2026-03-01T00:00:00Z",
  },
];

const INITIAL_TENANTS: Tenant[] = [
  {
    id: "tenant-1",
    full_name: "Lê Minh Anh",
    phone: "0912 111 222",
    email: "minhanh@email.com",
    id_number: "001234567890",
    move_in_date: "2025-09-01",
    notes: "Sinh viên năm 3 ĐH Sư Phạm Thái Nguyên",
  },
  {
    id: "tenant-2",
    full_name: "Phạm Tuấn Kiệt",
    phone: "0987 333 444",
    email: "kiettuan@email.com",
    id_number: "001234567891",
    move_in_date: "2025-10-15",
    notes: "Nhân viên văn phòng Gang Thép",
  },
  {
    id: "tenant-3",
    full_name: "Nguyễn Hà Linh",
    phone: "0901 555 666",
    email: "halinhnguyen@email.com",
    id_number: "001234567892",
    move_in_date: "2026-01-01",
    notes: "Làm việc tại BV Trung Ương Thái Nguyên",
  },
  {
    id: "tenant-4",
    full_name: "Trần Đức Anh",
    phone: "0978 777 888",
    email: "ducanh@email.com",
    id_number: "001234567893",
    move_in_date: "2026-03-10",
    notes: null,
  },
];

const INITIAL_LEASES: Lease[] = [
  {
    id: "lease-1",
    listing_id: "studio-quang-trung",
    tenant_id: "tenant-1",
    start_date: "2025-09-01",
    end_date: "2026-09-01",
    monthly_rent: 3200000,
    deposit: 3200000,
    status: "active",
    notes: "Đóng tiền ngày 5 hàng tháng",
  },
  {
    id: "lease-2",
    listing_id: "can-ho-cmt8",
    tenant_id: "tenant-2",
    start_date: "2025-10-15",
    end_date: "2026-10-15",
    monthly_rent: 2800000,
    deposit: 2800000,
    status: "active",
    notes: null,
  },
  {
    id: "lease-3",
    listing_id: "studio-mountain-view",
    tenant_id: "tenant-3",
    start_date: "2026-01-01",
    end_date: "2027-01-01",
    monthly_rent: 3800000,
    deposit: 5000000,
    status: "active",
    notes: null,
  },
];

const INITIAL_METERS: MeterReading[] = [
  { id: "m-1", listing_id: "studio-quang-trung", period: "2026-06", electricity_start: 1000, electricity_end: 1120, water_start: 50, water_end: 58 },
  { id: "m-2", listing_id: "studio-quang-trung", period: "2026-07", electricity_start: 1120, electricity_end: 1250, water_start: 58, water_end: 67 },
  { id: "m-3", listing_id: "studio-quang-trung", period: "2026-08", electricity_start: 1250, electricity_end: 1395, water_start: 67, water_end: 75 },

  { id: "m-4", listing_id: "can-ho-cmt8", period: "2026-06", electricity_start: 2000, electricity_end: 2090, water_start: 100, water_end: 106 },
  { id: "m-5", listing_id: "can-ho-cmt8", period: "2026-07", electricity_start: 2090, electricity_end: 2200, water_start: 106, water_end: 114 },
  { id: "m-6", listing_id: "can-ho-cmt8", period: "2026-08", electricity_start: 2200, electricity_end: 2320, water_start: 114, water_end: 121 },

  { id: "m-7", listing_id: "studio-mountain-view", period: "2026-06", electricity_start: 500, electricity_end: 650, water_start: 30, water_end: 40 },
  { id: "m-8", listing_id: "studio-mountain-view", period: "2026-07", electricity_start: 650, electricity_end: 810, water_start: 40, water_end: 51 },
  { id: "m-9", listing_id: "studio-mountain-view", period: "2026-08", electricity_start: 810, electricity_end: 970, water_start: 51, water_end: 62 },
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: "inv-1",
    lease_id: "lease-1",
    listing_id: "studio-quang-trung",
    tenant_id: "tenant-1",
    period: "2026-06",
    rent_amount: 3200000,
    electricity_kwh: 120,
    electricity_amount: 420000,
    water_m3: 8,
    water_amount: 200000,
    other_amount: 0,
    total_amount: 3820000,
    status: "paid",
    due_date: "2026-07-10",
    paid_at: "2026-07-05T10:00:00Z",
    notes: "Đã chuyển khoản Vietcombank",
  },
  {
    id: "inv-2",
    lease_id: "lease-1",
    listing_id: "studio-quang-trung",
    tenant_id: "tenant-1",
    period: "2026-07",
    rent_amount: 3200000,
    electricity_kwh: 130,
    electricity_amount: 455000,
    water_m3: 9,
    water_amount: 225000,
    other_amount: 0,
    total_amount: 3880000,
    status: "paid",
    due_date: "2026-08-10",
    paid_at: "2026-08-03T10:00:00Z",
    notes: null,
  },
  {
    id: "inv-3",
    lease_id: "lease-2",
    listing_id: "can-ho-cmt8",
    tenant_id: "tenant-2",
    period: "2026-06",
    rent_amount: 2800000,
    electricity_kwh: 90,
    electricity_amount: 315000,
    water_m3: 6,
    water_amount: 150000,
    other_amount: 0,
    total_amount: 3265000,
    status: "paid",
    due_date: "2026-07-10",
    paid_at: "2026-07-08T10:00:00Z",
    notes: null,
  },
  {
    id: "inv-4",
    lease_id: "lease-2",
    listing_id: "can-ho-cmt8",
    tenant_id: "tenant-2",
    period: "2026-07",
    rent_amount: 2800000,
    electricity_kwh: 110,
    electricity_amount: 385000,
    water_m3: 8,
    water_amount: 200000,
    other_amount: 0,
    total_amount: 3385000,
    status: "unpaid",
    due_date: "2026-08-10",
    paid_at: null,
    notes: "Đã nhắn tin nhắc hạn",
  },
  {
    id: "inv-5",
    lease_id: "lease-3",
    listing_id: "studio-mountain-view",
    tenant_id: "tenant-3",
    period: "2026-06",
    rent_amount: 3800000,
    electricity_kwh: 150,
    electricity_amount: 570000,
    water_m3: 10,
    water_amount: 270000,
    other_amount: 50000,
    total_amount: 4690000,
    status: "paid",
    due_date: "2026-07-10",
    paid_at: "2026-07-02T10:00:00Z",
    notes: null,
  },
  {
    id: "inv-6",
    lease_id: "lease-3",
    listing_id: "studio-mountain-view",
    tenant_id: "tenant-3",
    period: "2026-07",
    rent_amount: 3800000,
    electricity_kwh: 160,
    electricity_amount: 608000,
    water_m3: 11,
    water_amount: 297000,
    other_amount: 0,
    total_amount: 4705000,
    status: "unpaid",
    due_date: "2026-08-10",
    paid_at: null,
    notes: null,
  },
];

function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

function genId(): string {
  return "id-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
}

export const db = {
  // ---- Auth & Users ----
  getUsers: () => getStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS),
  
  login: (email: string, password: string): { user?: User; error?: string } => {
    const users = db.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { error: "Email không tồn tại trong hệ thống." };
    }
    if (password.length < 6) {
      return { error: "Mật khẩu phải có ít nhất 6 ký tự." };
    }
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
    return { user };
  },

  signup: (data: { email: string; password: string; full_name: string; phone: string; role: "landlord" | "tenant" }): { user?: User; error?: string } => {
    const users = db.getUsers();
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { error: "Email này đã được sử dụng." };
    }
    const newUser: User = {
      id: genId(),
      email: data.email,
      full_name: data.full_name,
      phone: data.phone || null,
      role: data.role,
    };
    users.push(newUser);
    setStorage(STORAGE_KEYS.USERS, users);
    setStorage(STORAGE_KEYS.CURRENT_USER, newUser);
    return { user: newUser };
  },

  getCurrentUser: (): User | null => {
    if (typeof window === "undefined") return null;
    try {
      const u = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (u) return JSON.parse(u);
    } catch {}
    return null;
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  // ---- Listings ----
  getListings: (): Listing[] => getStorage<Listing[]>(STORAGE_KEYS.LISTINGS, INITIAL_LISTINGS),
  
  saveListing: (data: Partial<Listing> & { title: string; price: number }): Listing => {
    const list = db.getListings();
    if (data.id) {
      const idx = list.findIndex((l) => l.id === data.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data } as Listing;
        setStorage(STORAGE_KEYS.LISTINGS, list);
        return list[idx];
      }
    }
    const newListing: Listing = {
      id: genId(),
      title: data.title,
      price: data.price,
      size: data.size ?? null,
      address: data.address ?? null,
      area: data.area ?? null,
      image_url: data.image_url ?? null,
      status: data.status ?? "available",
      description: data.description ?? null,
      electricity_rate: data.electricity_rate ?? 3500,
      water_rate: data.water_rate ?? 25000,
      created_at: new Date().toISOString(),
    };
    list.unshift(newListing);
    setStorage(STORAGE_KEYS.LISTINGS, list);
    return newListing;
  },

  deleteListing: (id: string) => {
    const list = db.getListings().filter((l) => l.id !== id);
    setStorage(STORAGE_KEYS.LISTINGS, list);
  },

  updateListingStatus: (id: string, status: RoomStatus) => {
    const list = db.getListings();
    const item = list.find((l) => l.id === id);
    if (item) {
      item.status = status;
      setStorage(STORAGE_KEYS.LISTINGS, list);
    }
  },

  // ---- Tenants ----
  getTenants: (): Tenant[] => getStorage<Tenant[]>(STORAGE_KEYS.TENANTS, INITIAL_TENANTS),
  
  saveTenant: (data: Partial<Tenant> & { full_name: string }): Tenant => {
    const list = db.getTenants();
    if (data.id) {
      const idx = list.findIndex((t) => t.id === data.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data } as Tenant;
        setStorage(STORAGE_KEYS.TENANTS, list);
        return list[idx];
      }
    }
    const newTenant: Tenant = {
      id: genId(),
      full_name: data.full_name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      id_number: data.id_number ?? null,
      move_in_date: data.move_in_date ?? null,
      notes: data.notes ?? null,
    };
    list.unshift(newTenant);
    setStorage(STORAGE_KEYS.TENANTS, list);
    return newTenant;
  },

  deleteTenant: (id: string) => {
    const list = db.getTenants().filter((t) => t.id !== id);
    setStorage(STORAGE_KEYS.TENANTS, list);
  },

  // ---- Leases ----
  getLeases: (): Lease[] => getStorage<Lease[]>(STORAGE_KEYS.LEASES, INITIAL_LEASES),
  
  saveLease: (data: Partial<Lease> & { listing_id: string; tenant_id: string; start_date: string; monthly_rent: number }): Lease => {
    const list = db.getLeases();
    if (data.id) {
      const idx = list.findIndex((l) => l.id === data.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data } as Lease;
        setStorage(STORAGE_KEYS.LEASES, list);
        return list[idx];
      }
    }
    const newLease: Lease = {
      id: genId(),
      listing_id: data.listing_id,
      tenant_id: data.tenant_id,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      monthly_rent: data.monthly_rent,
      deposit: data.deposit ?? 0,
      status: data.status ?? "active",
      notes: data.notes ?? null,
    };
    list.unshift(newLease);
    setStorage(STORAGE_KEYS.LEASES, list);
    return newLease;
  },

  updateLeaseStatus: (id: string, status: string) => {
    const list = db.getLeases();
    const item = list.find((l) => l.id === id);
    if (item) {
      item.status = status;
      setStorage(STORAGE_KEYS.LEASES, list);
    }
  },

  deleteLease: (id: string) => {
    const list = db.getLeases().filter((l) => l.id !== id);
    setStorage(STORAGE_KEYS.LEASES, list);
  },

  // ---- Meter Readings ----
  getMeters: (): MeterReading[] => getStorage<MeterReading[]>(STORAGE_KEYS.METERS, INITIAL_METERS),

  saveMeter: (data: Omit<MeterReading, "id">): MeterReading => {
    const list = db.getMeters();
    const idx = list.findIndex((m) => m.listing_id === data.listing_id && m.period === data.period);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
      setStorage(STORAGE_KEYS.METERS, list);
      return list[idx];
    }
    const newMeter: MeterReading = {
      id: genId(),
      ...data,
    };
    list.unshift(newMeter);
    setStorage(STORAGE_KEYS.METERS, list);
    return newMeter;
  },

  // ---- Invoices ----
  getInvoices: (): Invoice[] => getStorage<Invoice[]>(STORAGE_KEYS.INVOICES, INITIAL_INVOICES),

  saveInvoice: (data: Omit<Invoice, "id"> & { id?: string }): Invoice => {
    const list = db.getInvoices();
    if (data.id) {
      const idx = list.findIndex((i) => i.id === data.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data } as Invoice;
        setStorage(STORAGE_KEYS.INVOICES, list);
        return list[idx];
      }
    }
    const newInvoice: Invoice = {
      id: genId(),
      ...data,
      status: data.status ?? "unpaid",
      due_date: data.due_date ?? null,
      paid_at: data.paid_at ?? null,
      notes: data.notes ?? null,
    };
    list.unshift(newInvoice);
    setStorage(STORAGE_KEYS.INVOICES, list);
    return newInvoice;
  },

  updateInvoiceStatus: (id: string, status: string, paid_at?: string | null) => {
    const list = db.getInvoices();
    const item = list.find((i) => i.id === id);
    if (item) {
      item.status = status;
      item.paid_at = paid_at ?? null;
      setStorage(STORAGE_KEYS.INVOICES, list);
    }
  },

  deleteInvoice: (id: string) => {
    const list = db.getInvoices().filter((i) => i.id !== id);
    setStorage(STORAGE_KEYS.INVOICES, list);
  },
};
