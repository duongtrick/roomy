import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db.server";
import type { Invoice } from "../dashboard-types";

export const getInvoices = createServerFn({ method: "GET" })
  .validator((data: { ownerId: string }) => data)
  .handler(async ({ data }): Promise<Invoice[]> => {
    const db = getDb();
    return db
      .prepare("SELECT * FROM invoices WHERE owner_id = ? ORDER BY period DESC")
      .all(data.ownerId) as Invoice[];
  });

export const insertInvoice = createServerFn({ method: "POST" })
  .validator(
    (data: {
      owner_id: string;
      lease_id?: string | null;
      listing_id: string;
      tenant_id?: string | null;
      period: string;
      rent_amount: number;
      electricity_kwh: number;
      electricity_amount: number;
      water_m3: number;
      water_amount: number;
      other_amount: number;
      total_amount: number;
      due_date?: string | null;
      notes?: string | null;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ id?: string; error?: string }> => {
    const db = getDb();

    const owns = db
      .prepare("SELECT 1 FROM listings WHERE id = ? AND owner_id = ?")
      .get(data.listing_id, data.owner_id);
    if (!owns) return { error: "Phòng không tồn tại" };

    // Guard against double-billing: the UI checks this too, but a double
    // submit or a stale list would otherwise create a second invoice.
    const duplicate = db
      .prepare("SELECT 1 FROM invoices WHERE owner_id = ? AND listing_id = ? AND period = ?")
      .get(data.owner_id, data.listing_id, data.period);
    if (duplicate) return { error: `Hoá đơn kỳ ${data.period} cho phòng này đã tồn tại` };

    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO invoices (id, owner_id, lease_id, listing_id, tenant_id, period, rent_amount, electricity_kwh, electricity_amount, water_m3, water_amount, other_amount, total_amount, status, due_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      data.owner_id,
      data.lease_id ?? null,
      data.listing_id,
      data.tenant_id ?? null,
      data.period,
      data.rent_amount,
      data.electricity_kwh,
      data.electricity_amount,
      data.water_m3,
      data.water_amount,
      data.other_amount,
      data.total_amount,
      data.status ?? "unpaid",
      data.due_date ?? null,
      data.notes ?? null,
    );
    return { id };
  });

export const updateInvoiceStatus = createServerFn({ method: "POST" })
  .validator(
    (data: { id: string; owner_id: string; status: string; paid_at?: string | null }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDb();
    const res = db
      .prepare(
        "UPDATE invoices SET status=?, paid_at=?, updated_at=datetime('now') WHERE id=? AND owner_id=?",
      )
      .run(data.status, data.paid_at ?? null, data.id, data.owner_id);
    return { ok: res.changes > 0 };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .validator((data: { id: string; owner_id: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDb();
    const res = db
      .prepare("DELETE FROM invoices WHERE id = ? AND owner_id = ?")
      .run(data.id, data.owner_id);
    return { ok: res.changes > 0 };
  });
