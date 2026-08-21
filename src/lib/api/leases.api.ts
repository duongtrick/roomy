import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db.server";
import type { Lease } from "../dashboard-types";
import type Database from "better-sqlite3";

/**
 * Room occupancy is derived from leases, so it is resynced here rather than by
 * the caller — ending or deleting a lease used to leave the room stuck on
 * "occupied" forever.
 *
 * A room under maintenance keeps that status: it is a deliberate override, not
 * an occupancy state.
 */
function syncListingStatus(db: Database.Database, listingId: string, ownerId: string) {
  const active = db
    .prepare("SELECT 1 FROM leases WHERE listing_id = ? AND owner_id = ? AND status = 'active'")
    .get(listingId, ownerId);

  db.prepare(
    `UPDATE listings SET status=?, updated_at=datetime('now')
     WHERE id=? AND owner_id=? AND status != 'maintenance'`,
  ).run(active ? "occupied" : "available", listingId, ownerId);
}

export const getLeases = createServerFn({ method: "GET" })
  .validator((data: { ownerId: string }) => data)
  .handler(async ({ data }): Promise<Lease[]> => {
    const db = getDb();
    return db
      .prepare("SELECT * FROM leases WHERE owner_id = ? ORDER BY created_at DESC")
      .all(data.ownerId) as Lease[];
  });

export const insertLease = createServerFn({ method: "POST" })
  .validator(
    (data: {
      owner_id: string;
      listing_id: string;
      tenant_id: string;
      start_date: string;
      end_date?: string | null;
      monthly_rent: number;
      deposit?: number;
      notes?: string | null;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ id: string }> => {
    const db = getDb();
    const id = crypto.randomUUID();
    const status = data.status ?? "active";

    db.transaction(() => {
      db.prepare(
        `INSERT INTO leases (id, owner_id, listing_id, tenant_id, start_date, end_date, monthly_rent, deposit, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        data.owner_id,
        data.listing_id,
        data.tenant_id,
        data.start_date,
        data.end_date ?? null,
        data.monthly_rent,
        data.deposit ?? 0,
        data.notes ?? null,
        status,
      );
      syncListingStatus(db, data.listing_id, data.owner_id);
    })();

    return { id };
  });

export const updateLeaseStatus = createServerFn({ method: "POST" })
  .validator((data: { id: string; owner_id: string; status: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDb();

    return db.transaction(() => {
      const lease = db
        .prepare("SELECT listing_id FROM leases WHERE id = ? AND owner_id = ?")
        .get(data.id, data.owner_id) as { listing_id: string } | undefined;
      if (!lease) return { ok: false };

      db.prepare(
        "UPDATE leases SET status=?, updated_at=datetime('now') WHERE id=? AND owner_id=?",
      ).run(data.status, data.id, data.owner_id);
      syncListingStatus(db, lease.listing_id, data.owner_id);
      return { ok: true };
    })();
  });

export const deleteLease = createServerFn({ method: "POST" })
  .validator((data: { id: string; owner_id: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDb();

    return db.transaction(() => {
      const lease = db
        .prepare("SELECT listing_id FROM leases WHERE id = ? AND owner_id = ?")
        .get(data.id, data.owner_id) as { listing_id: string } | undefined;
      if (!lease) return { ok: false };

      db.prepare("DELETE FROM leases WHERE id = ? AND owner_id = ?").run(data.id, data.owner_id);
      syncListingStatus(db, lease.listing_id, data.owner_id);
      return { ok: true };
    })();
  });
