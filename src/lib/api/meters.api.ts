import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db.server";
import type { MeterReading } from "../dashboard-types";

export const getMeterReadings = createServerFn({ method: "GET" })
  .validator((data: { ownerId: string }) => data)
  .handler(async ({ data }): Promise<MeterReading[]> => {
    const db = getDb();
    return db
      .prepare("SELECT * FROM meter_readings WHERE owner_id = ? ORDER BY period DESC")
      .all(data.ownerId) as MeterReading[];
  });

export const upsertMeterReading = createServerFn({ method: "POST" })
  .validator(
    (data: {
      owner_id: string;
      listing_id: string;
      period: string;
      electricity_start: number;
      electricity_end: number;
      water_start: number;
      water_end: number;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const db = getDb();

    // Confirm the room belongs to this owner before writing. The unique index
    // is on (listing_id, period) alone, so an unscoped upsert would let one
    // landlord overwrite another's readings.
    const owns = db
      .prepare("SELECT 1 FROM listings WHERE id = ? AND owner_id = ?")
      .get(data.listing_id, data.owner_id);
    if (!owns) return { ok: false, error: "Phòng không tồn tại" };

    db.prepare(
      `INSERT INTO meter_readings (id, owner_id, listing_id, period, electricity_start, electricity_end, water_start, water_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (listing_id, period) DO UPDATE SET
         electricity_start = excluded.electricity_start,
         electricity_end   = excluded.electricity_end,
         water_start       = excluded.water_start,
         water_end         = excluded.water_end,
         updated_at        = datetime('now')`,
    ).run(
      crypto.randomUUID(),
      data.owner_id,
      data.listing_id,
      data.period,
      data.electricity_start,
      data.electricity_end,
      data.water_start,
      data.water_end,
    );

    return { ok: true };
  });
