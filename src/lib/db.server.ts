import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../data/roomy.db");

let _db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure the data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'tenant' CHECK(role IN ('landlord', 'tenant')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      size INTEGER,
      address TEXT,
      area TEXT,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      electricity_rate INTEGER NOT NULL DEFAULT 3500,
      water_rate INTEGER NOT NULL DEFAULT 25000,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      id_number TEXT,
      move_in_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leases (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      monthly_rent INTEGER NOT NULL,
      deposit INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meter_readings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      period TEXT NOT NULL,
      electricity_start INTEGER NOT NULL DEFAULT 0,
      electricity_end INTEGER NOT NULL DEFAULT 0,
      water_start INTEGER NOT NULL DEFAULT 0,
      water_end INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (listing_id, period),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      lease_id TEXT,
      listing_id TEXT NOT NULL,
      tenant_id TEXT,
      period TEXT NOT NULL,
      rent_amount INTEGER NOT NULL DEFAULT 0,
      electricity_kwh INTEGER NOT NULL DEFAULT 0,
      electricity_amount INTEGER NOT NULL DEFAULT 0,
      water_m3 INTEGER NOT NULL DEFAULT 0,
      water_amount INTEGER NOT NULL DEFAULT 0,
      other_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unpaid',
      due_date TEXT,
      paid_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
      FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE SET NULL
    );
  `);

  // Seed if empty
  const count = db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number };
  if (count.n === 0) {
    seed(db);
  }
}

// ---- Password hashing ----
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const result = crypto.scryptSync(password, salt, 64).toString("hex");
  return result === hash;
}

// ---- UUID helper ----
function uuid() {
  return crypto.randomUUID();
}

// ---- Seed data ----
function seed(db: Database.Database) {
  const demoUserId = uuid();
  const demoPassword = hashPassword("123456");

  // Demo user (landlord)
  db.prepare(
    `INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(demoUserId, "demo@roomy.vn", demoPassword, "Nguyễn Văn Chủ Trọ", "0912 345 678", "landlord");

  // Demo tenant user
  const tenantUserId = uuid();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(tenantUserId, "tenant@roomy.vn", hashPassword("123456"), "Trần Thị Thuê", "0987 654 321", "tenant");

  // ---- Listings (6 phòng) ----
  const listingIds = Array.from({ length: 6 }, () => uuid());

  const listings = [
    { id: listingIds[0], title: "P.101 — Tầng 1", price: 3200000, size: 30, status: "occupied", address: "Ngõ 24 Lương Ngọc Quyến, P. Quang Trung", area: "Phường Quang Trung", electricityRate: 3500, waterRate: 25000 },
    { id: listingIds[1], title: "P.102 — Tầng 1", price: 2800000, size: 25, status: "occupied", address: "Số 142 Cách Mạng Tháng 8, P. Trưng Vương", area: "Phường Trưng Vương", electricityRate: 3500, waterRate: 25000 },
    { id: listingIds[2], title: "P.201 — Tầng 2", price: 3800000, size: 35, status: "occupied", address: "Ngõ 6 Z115, P. Tân Thịnh", area: "Phường Tân Thịnh", electricityRate: 3800, waterRate: 27000 },
    { id: listingIds[3], title: "P.202 — Tầng 2", price: 1500000, size: 18, status: "available", address: "Ngõ 12 Tân Thịnh, P. Quyết Thắng", area: "Phường Quyết Thắng", electricityRate: 3500, waterRate: 25000 },
    { id: listingIds[4], title: "P.301 — Tầng 3", price: 4200000, size: 40, status: "available", address: "Ngõ 6 Z115, P. Tân Thịnh", area: "Phường Tân Thịnh", electricityRate: 3500, waterRate: 25000 },
    { id: listingIds[5], title: "P.302 — Tầng 3", price: 2000000, size: 20, status: "maintenance", address: "Ngõ 24 Lương Ngọc Quyến, P. Quang Trung", area: "Phường Quang Trung", electricityRate: 3500, waterRate: 25000 },
  ];

  const insertListing = db.prepare(
    `INSERT INTO listings (id, owner_id, title, price, size, status, address, area, electricity_rate, water_rate, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const l of listings) {
    insertListing.run(l.id, demoUserId, l.title, l.price, l.size, l.status, l.address, l.area, l.electricityRate, l.waterRate, null);
  }

  // ---- Tenants (4 người thuê) ----
  const tenantIds = Array.from({ length: 4 }, () => uuid());
  const tenantsData = [
    { id: tenantIds[0], name: "Lê Minh Anh", phone: "0912 111 222", email: "minhanh@email.com", idNumber: "001234567890", moveIn: "2025-09-01" },
    { id: tenantIds[1], name: "Phạm Tuấn Kiệt", phone: "0987 333 444", email: "kiettuan@email.com", idNumber: "001234567891", moveIn: "2025-10-15" },
    { id: tenantIds[2], name: "Nguyễn Hà Linh", phone: "0901 555 666", email: "halinhnguyen@email.com", idNumber: "001234567892", moveIn: "2026-01-01" },
    { id: tenantIds[3], name: "Trần Đức Anh", phone: "0978 777 888", email: "ducanh@email.com", idNumber: "001234567893", moveIn: "2026-03-10" },
  ];

  const insertTenant = db.prepare(
    `INSERT INTO tenants (id, owner_id, full_name, phone, email, id_number, move_in_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const t of tenantsData) {
    insertTenant.run(t.id, demoUserId, t.name, t.phone, t.email, t.idNumber, t.moveIn);
  }

  // ---- Leases (3 hợp đồng active cho 3 phòng occupied) ----
  const leaseIds = Array.from({ length: 3 }, () => uuid());
  const leasesData = [
    { id: leaseIds[0], listingId: listingIds[0], tenantId: tenantIds[0], start: "2025-09-01", rent: 3200000, deposit: 3200000 },
    { id: leaseIds[1], listingId: listingIds[1], tenantId: tenantIds[1], start: "2025-10-15", rent: 2800000, deposit: 2800000 },
    { id: leaseIds[2], listingId: listingIds[2], tenantId: tenantIds[2], start: "2026-01-01", rent: 3800000, deposit: 5000000 },
  ];

  const insertLease = db.prepare(
    `INSERT INTO leases (id, owner_id, listing_id, tenant_id, start_date, monthly_rent, deposit, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
  );
  for (const l of leasesData) {
    insertLease.run(l.id, demoUserId, l.listingId, l.tenantId, l.start, l.rent, l.deposit);
  }

  // ---- Meter readings (3 kỳ × 3 phòng occupied) ----
  const periods = ["2026-06", "2026-07", "2026-08"];
  const meterData = [
    // P.101
    { listingId: listingIds[0], periods: [
      { p: "2026-06", eS: 1000, eE: 1120, wS: 50, wE: 58 },
      { p: "2026-07", eS: 1120, eE: 1250, wS: 58, wE: 67 },
      { p: "2026-08", eS: 1250, eE: 1395, wS: 67, wE: 75 },
    ]},
    // P.102
    { listingId: listingIds[1], periods: [
      { p: "2026-06", eS: 2000, eE: 2090, wS: 100, wE: 106 },
      { p: "2026-07", eS: 2090, eE: 2200, wS: 106, wE: 114 },
      { p: "2026-08", eS: 2200, eE: 2320, wS: 114, wE: 121 },
    ]},
    // P.201
    { listingId: listingIds[2], periods: [
      { p: "2026-06", eS: 500, eE: 650, wS: 30, wE: 40 },
      { p: "2026-07", eS: 650, eE: 810, wS: 40, wE: 51 },
      { p: "2026-08", eS: 810, eE: 970, wS: 51, wE: 62 },
    ]},
  ];

  const insertMeter = db.prepare(
    `INSERT INTO meter_readings (id, owner_id, listing_id, period, electricity_start, electricity_end, water_start, water_end)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const room of meterData) {
    for (const m of room.periods) {
      insertMeter.run(uuid(), demoUserId, room.listingId, m.p, m.eS, m.eE, m.wS, m.wE);
    }
  }

  // ---- Invoices (2 kỳ × 3 phòng, mix paid/unpaid) ----
  const insertInvoice = db.prepare(
    `INSERT INTO invoices (id, owner_id, lease_id, listing_id, tenant_id, period, rent_amount, electricity_kwh, electricity_amount, water_m3, water_amount, other_amount, total_amount, status, paid_at, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  // P.101 invoices
  const e1_06 = 120, w1_06 = 8;
  const eAmt1_06 = e1_06 * 3500, wAmt1_06 = w1_06 * 25000;
  insertInvoice.run(uuid(), demoUserId, leaseIds[0], listingIds[0], tenantIds[0], "2026-06", 3200000, e1_06, eAmt1_06, w1_06, wAmt1_06, 0, 3200000 + eAmt1_06 + wAmt1_06, "paid", "2026-07-05T10:00:00Z", "2026-07-10");

  const e1_07 = 130, w1_07 = 9;
  const eAmt1_07 = e1_07 * 3500, wAmt1_07 = w1_07 * 25000;
  insertInvoice.run(uuid(), demoUserId, leaseIds[0], listingIds[0], tenantIds[0], "2026-07", 3200000, e1_07, eAmt1_07, w1_07, wAmt1_07, 0, 3200000 + eAmt1_07 + wAmt1_07, "paid", "2026-08-03T10:00:00Z", "2026-08-10");

  // P.102 invoices
  const e2_06 = 90, w2_06 = 6;
  const eAmt2_06 = e2_06 * 3500, wAmt2_06 = w2_06 * 25000;
  insertInvoice.run(uuid(), demoUserId, leaseIds[1], listingIds[1], tenantIds[1], "2026-06", 2800000, e2_06, eAmt2_06, w2_06, wAmt2_06, 0, 2800000 + eAmt2_06 + wAmt2_06, "paid", "2026-07-08T10:00:00Z", "2026-07-10");

  const e2_07 = 110, w2_07 = 8;
  const eAmt2_07 = e2_07 * 3500, wAmt2_07 = w2_07 * 25000;
  insertInvoice.run(uuid(), demoUserId, leaseIds[1], listingIds[1], tenantIds[1], "2026-07", 2800000, e2_07, eAmt2_07, w2_07, wAmt2_07, 0, 2800000 + eAmt2_07 + wAmt2_07, "unpaid", null, "2026-08-10");

  // P.201 invoices
  const e3_06 = 150, w3_06 = 10;
  const eAmt3_06 = e3_06 * 3800, wAmt3_06 = w3_06 * 27000;
  insertInvoice.run(uuid(), demoUserId, leaseIds[2], listingIds[2], tenantIds[2], "2026-06", 3800000, e3_06, eAmt3_06, w3_06, wAmt3_06, 50000, 3800000 + eAmt3_06 + wAmt3_06 + 50000, "paid", "2026-07-02T10:00:00Z", "2026-07-10");

  const e3_07 = 160, w3_07 = 11;
  const eAmt3_07 = e3_07 * 3800, wAmt3_07 = w3_07 * 27000;
  insertInvoice.run(uuid(), demoUserId, leaseIds[2], listingIds[2], tenantIds[2], "2026-07", 3800000, e3_07, eAmt3_07, w3_07, wAmt3_07, 0, 3800000 + eAmt3_07 + wAmt3_07, "unpaid", null, "2026-08-10");
}
