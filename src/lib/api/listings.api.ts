import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db.server";

export const getListings = createServerFn({ method: "GET" })
  .validator((data: { ownerId: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    return db.prepare("SELECT * FROM listings WHERE owner_id = ? ORDER BY title").all(data.ownerId);
  });

export const insertListing = createServerFn({ method: "POST" })
  .validator((data: { owner_id: string; title: string; description?: string | null; price: number; size?: number | null; address?: string | null; area?: string | null; image_url?: string | null; status?: string; electricity_rate?: number; water_rate?: number }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO listings (id, owner_id, title, description, price, size, address, area, image_url, status, electricity_rate, water_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, data.owner_id, data.title, data.description ?? null, data.price, data.size ?? null, data.address ?? null, data.area ?? null, data.image_url ?? null, data.status ?? "active", data.electricity_rate ?? 3500, data.water_rate ?? 25000);
    return db.prepare("SELECT * FROM listings WHERE id = ?").get(id);
  });

export const updateListing = createServerFn({ method: "POST" })
  .validator((data: { id: string; owner_id: string; title: string; description?: string | null; price: number; size?: number | null; address?: string | null; area?: string | null; image_url?: string | null; status?: string; electricity_rate?: number; water_rate?: number }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare(
      `UPDATE listings SET title=?, description=?, price=?, size=?, address=?, area=?, image_url=?, status=?, electricity_rate=?, water_rate=?, updated_at=datetime('now')
       WHERE id=?`,
    ).run(data.title, data.description ?? null, data.price, data.size ?? null, data.address ?? null, data.area ?? null, data.image_url ?? null, data.status ?? "active", data.electricity_rate ?? 3500, data.water_rate ?? 25000, data.id);
    return db.prepare("SELECT * FROM listings WHERE id = ?").get(data.id);
  });

export const deleteListing = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare("DELETE FROM listings WHERE id = ?").run(data.id);
    return { ok: true };
  });

export const updateListingStatus = createServerFn({ method: "POST" })
  .validator((data: { id: string; status: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare("UPDATE listings SET status=?, updated_at=datetime('now') WHERE id=?").run(data.status, data.id);
    return { ok: true };
  });

import crypto from "node:crypto";
