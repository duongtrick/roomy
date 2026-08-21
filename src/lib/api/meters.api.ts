import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db.server";
import crypto from "node:crypto";

export const getMeterReadings = createServerFn({ method: "GET" })
  .validator((data: { ownerId: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    return db.prepare("SELECT * FROM meter_readings WHERE owner_id = ? ORDER BY period DESC").all(data.ownerId);
  });

export const upsertMeterReading = createServerFn({ method: "POST" })
  .validator((data: { owner_id: string; listing_id: string; period: string; electricity_start: number; electricity_end: number; water_start: number; water_end: number }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const existing = db.prepare("SELECT id FROM meter_readings WHERE listing_id = ? AND period = ?").get(data.listing_id, data.period) as { id: string } | undefined;
    if (existing) {
      db.prepare(
        `UPDATE meter_readings SET electricity_start=?, electricity_end=?, water_start=?, water_end=?, updated_at=datetime('now') WHERE id=?`,
      ).run(data.electricity_start, data.electricity_end, data.water_start, data.water_end, existing.id);
    } else {
      db.prepare(
        `INSERT INTO meter_readings (id, owner_id, listing_id, period, electricity_start, electricity_end, water_start, water_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(crypto.randomUUID(), data.owner_id, data.listing_id, data.period, data.electricity_start, data.electricity_end, data.water_start, data.water_end);
    }
    return { ok: true };
  });
