import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db.server";
import crypto from "node:crypto";

export const getInvoices = createServerFn({ method: "GET" })
  .validator((data: { ownerId: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    return db.prepare("SELECT * FROM invoices WHERE owner_id = ? ORDER BY period DESC").all(data.ownerId);
  });

export const insertInvoice = createServerFn({ method: "POST" })
  .validator((data: {
    owner_id: string; lease_id?: string | null; listing_id: string; tenant_id?: string | null;
    period: string; rent_amount: number; electricity_kwh: number; electricity_amount: number;
    water_m3: number; water_amount: number; other_amount: number; total_amount: number;
    due_date?: string | null; notes?: string | null; status?: string;
  }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO invoices (id, owner_id, lease_id, listing_id, tenant_id, period, rent_amount, electricity_kwh, electricity_amount, water_m3, water_amount, other_amount, total_amount, status, due_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, data.owner_id, data.lease_id ?? null, data.listing_id, data.tenant_id ?? null, data.period, data.rent_amount, data.electricity_kwh, data.electricity_amount, data.water_m3, data.water_amount, data.other_amount, data.total_amount, data.status ?? "unpaid", data.due_date ?? null, data.notes ?? null);
    return { id };
  });

export const updateInvoiceStatus = createServerFn({ method: "POST" })
  .validator((data: { id: string; status: string; paid_at?: string | null }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare("UPDATE invoices SET status=?, paid_at=?, updated_at=datetime('now') WHERE id=?").run(data.status, data.paid_at ?? null, data.id);
    return { ok: true };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare("DELETE FROM invoices WHERE id = ?").run(data.id);
    return { ok: true };
  });
