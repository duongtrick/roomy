import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db.server";
import crypto from "node:crypto";

export const getTenants = createServerFn({ method: "GET" })
  .validator((data: { ownerId: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    return db.prepare("SELECT * FROM tenants WHERE owner_id = ? ORDER BY created_at DESC").all(data.ownerId);
  });

export const insertTenant = createServerFn({ method: "POST" })
  .validator((data: { owner_id: string; full_name: string; phone?: string | null; email?: string | null; id_number?: string | null; move_in_date?: string | null; notes?: string | null }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO tenants (id, owner_id, full_name, phone, email, id_number, move_in_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, data.owner_id, data.full_name, data.phone ?? null, data.email ?? null, data.id_number ?? null, data.move_in_date ?? null, data.notes ?? null);
    return { id };
  });

export const updateTenant = createServerFn({ method: "POST" })
  .validator((data: { id: string; owner_id: string; full_name: string; phone?: string | null; email?: string | null; id_number?: string | null; move_in_date?: string | null; notes?: string | null }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare(
      `UPDATE tenants SET full_name=?, phone=?, email=?, id_number=?, move_in_date=?, notes=?, updated_at=datetime('now') WHERE id=?`,
    ).run(data.full_name, data.phone ?? null, data.email ?? null, data.id_number ?? null, data.move_in_date ?? null, data.notes ?? null, data.id);
    return { ok: true };
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare("DELETE FROM tenants WHERE id = ?").run(data.id);
    return { ok: true };
  });
