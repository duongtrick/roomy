import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db.server";
import crypto from "node:crypto";

export const getLeases = createServerFn({ method: "GET" })
  .validator((data: { ownerId: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    return db.prepare("SELECT * FROM leases WHERE owner_id = ? ORDER BY created_at DESC").all(data.ownerId);
  });

export const insertLease = createServerFn({ method: "POST" })
  .validator((data: { owner_id: string; listing_id: string; tenant_id: string; start_date: string; end_date?: string | null; monthly_rent: number; deposit?: number; notes?: string | null; status?: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO leases (id, owner_id, listing_id, tenant_id, start_date, end_date, monthly_rent, deposit, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, data.owner_id, data.listing_id, data.tenant_id, data.start_date, data.end_date ?? null, data.monthly_rent, data.deposit ?? 0, data.notes ?? null, data.status ?? "active");
    return { id };
  });

export const updateLeaseStatus = createServerFn({ method: "POST" })
  .validator((data: { id: string; status: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare("UPDATE leases SET status=?, updated_at=datetime('now') WHERE id=?").run(data.status, data.id);
    return { ok: true };
  });

export const deleteLease = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare("DELETE FROM leases WHERE id = ?").run(data.id);
    return { ok: true };
  });
