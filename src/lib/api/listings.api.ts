import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db.server";
import type { Listing } from "../dashboard-types";

/**
 * Every mutation is scoped by `owner_id` in its WHERE clause. Without that a
 * caller could pass any row id and edit or delete another landlord's data,
 * since ids travel from the client.
 */
type ListingInput = {
  owner_id: string;
  title: string;
  description?: string | null;
  price: number;
  size?: number | null;
  address?: string | null;
  area?: string | null;
  image_url?: string | null;
  status?: string;
  electricity_rate?: number;
  water_rate?: number;
};

export const getListings = createServerFn({ method: "GET" })
  .validator((data: { ownerId: string }) => data)
  .handler(async ({ data }): Promise<Listing[]> => {
    const db = getDb();
    return db
      .prepare("SELECT * FROM listings WHERE owner_id = ? ORDER BY title")
      .all(data.ownerId) as Listing[];
  });

export const insertListing = createServerFn({ method: "POST" })
  .validator((data: ListingInput) => data)
  .handler(async ({ data }): Promise<Listing | null> => {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO listings (id, owner_id, title, description, price, size, address, area, image_url, status, electricity_rate, water_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      data.owner_id,
      data.title,
      data.description ?? null,
      data.price,
      data.size ?? null,
      data.address ?? null,
      data.area ?? null,
      data.image_url ?? null,
      data.status ?? "active",
      data.electricity_rate ?? 3500,
      data.water_rate ?? 25000,
    );
    return (db.prepare("SELECT * FROM listings WHERE id = ?").get(id) as Listing) ?? null;
  });

export const updateListing = createServerFn({ method: "POST" })
  .validator((data: ListingInput & { id: string }) => data)
  .handler(async ({ data }): Promise<Listing | null> => {
    const db = getDb();
    db.prepare(
      `UPDATE listings
       SET title=?, description=?, price=?, size=?, address=?, area=?, image_url=?, status=?, electricity_rate=?, water_rate=?, updated_at=datetime('now')
       WHERE id=? AND owner_id=?`,
    ).run(
      data.title,
      data.description ?? null,
      data.price,
      data.size ?? null,
      data.address ?? null,
      data.area ?? null,
      data.image_url ?? null,
      data.status ?? "active",
      data.electricity_rate ?? 3500,
      data.water_rate ?? 25000,
      data.id,
      data.owner_id,
    );
    return (
      (db
        .prepare("SELECT * FROM listings WHERE id = ? AND owner_id = ?")
        .get(data.id, data.owner_id) as Listing) ?? null
    );
  });

export const deleteListing = createServerFn({ method: "POST" })
  .validator((data: { id: string; owner_id: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDb();
    const res = db
      .prepare("DELETE FROM listings WHERE id = ? AND owner_id = ?")
      .run(data.id, data.owner_id);
    return { ok: res.changes > 0 };
  });

export const updateListingStatus = createServerFn({ method: "POST" })
  .validator((data: { id: string; owner_id: string; status: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDb();
    const res = db
      .prepare("UPDATE listings SET status=?, updated_at=datetime('now') WHERE id=? AND owner_id=?")
      .run(data.status, data.id, data.owner_id);
    return { ok: res.changes > 0 };
  });
