import { supabase } from "../supabase";
import type {
  InvoiceRow,
  LeaseRow,
  ListingRow,
  ListingStatus,
  MeterReadingRow,
  TenantRow,
  VerificationLevel,
} from "../database.types";
import { assertConfigured, requireUserId, unwrap } from "./errors";

/**
 * The landlord's own data.
 *
 * No function filters by owner: every table's RLS policy already restricts
 * rows to `auth.uid()`, so a stray `.eq("owner_id", …)` would be duplicated
 * logic that can drift from the policy. Writes still set `owner_id` explicitly
 * because the policy's `WITH CHECK` requires it to match.
 */

/* -------------------------------------------------------------- listings */

export async function getListings(): Promise<ListingRow[]> {
  assertConfigured();
  return unwrap(
    await supabase.from("owner_listings").select("*").order("created_at", { ascending: false }),
  );
}

export type ListingDraft = {
  id?: string;
  title: string;
  price: number;
  size: number | null;
  status: ListingStatus;
  description: string | null;
  electricity_rate: number;
  water_rate: number;
  is_published: boolean;
  public_title: string | null;
  public_description: string | null;
  address: string | null;
  area: string | null;
  district: string | null;
  amenities: string[];
  lat: number | null;
  lng: number | null;
  school_name: string | null;
  /** Khoảng cách tới trường, tính bằng mét. */
  distance_to_school: number | null;
  /**
   * Chủ trọ chỉ gửi được 'unverified' hoặc 'pending'; trigger
   * `listings_guard_verification` hạ 'verified' về mức cũ nếu bị gửi lên.
   */
  verification: VerificationLevel;
};

export async function saveListing(draft: ListingDraft): Promise<ListingRow> {
  const ownerId = await requireUserId();
  const { id, ...values } = draft;

  if (id) {
    const updated = unwrap(
      await supabase.from("listings").update(values).eq("id", id).select("id").single(),
    );
    const row = (await getListings()).find((item) => item.id === updated.id);
    if (!row) throw new Error("Không tìm thấy phòng vừa cập nhật.");
    return row;
  }
  const inserted = unwrap(
    await supabase
      .from("listings")
      .insert({ ...values, owner_id: ownerId })
      .select("id")
      .single(),
  );
  const row = (await getListings()).find((item) => item.id === inserted.id);
  if (!row) throw new Error("Không tìm thấy phòng vừa thêm.");
  return row;
}

export async function deleteListing(id: string): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("listings").delete().eq("id", id).select("id"));
}

export async function updateListingStatus(id: string, status: ListingStatus): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("listings").update({ status }).eq("id", id).select("id"));
}

/* --------------------------------------------------------------- tenants */

export async function getTenants(): Promise<TenantRow[]> {
  assertConfigured();
  return unwrap(
    await supabase.from("tenants").select("*").order("created_at", { ascending: false }),
  );
}

export type TenantDraft = {
  id?: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  move_in_date: string | null;
  notes: string | null;
};

export async function saveTenant(draft: TenantDraft): Promise<TenantRow> {
  const ownerId = await requireUserId();
  const { id, ...values } = draft;

  if (id) {
    return unwrap(await supabase.from("tenants").update(values).eq("id", id).select("*").single());
  }
  return unwrap(
    await supabase
      .from("tenants")
      .insert({ ...values, owner_id: ownerId })
      .select("*")
      .single(),
  );
}

export async function deleteTenant(id: string): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("tenants").delete().eq("id", id).select("id"));
}

/* ---------------------------------------------------------------- leases */

export async function getLeases(): Promise<LeaseRow[]> {
  assertConfigured();
  return unwrap(
    await supabase.from("leases").select("*").order("created_at", { ascending: false }),
  );
}

export type LeaseDraft = {
  listing_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  deposit: number;
  notes: string | null;
};

/**
 * Creates a contract; the database trigger marks its room occupied.
 *
 * `leases_one_active_per_listing` rejects a second live contract on the same
 * room, so the caller must end the previous one first — `replaceLease` does
 * both in the right order.
 */
export async function createLease(draft: LeaseDraft): Promise<LeaseRow> {
  const ownerId = await requireUserId();
  const lease = unwrap(
    await supabase
      .from("leases")
      .insert({ ...draft, owner_id: ownerId, status: "active" })
      .select("*")
      .single(),
  );
  return lease;
}

export async function updateLeaseStatus(id: string, status: "active" | "ended"): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("leases").update({ status }).eq("id", id).select("id"));
}

export async function deleteLease(id: string): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("leases").delete().eq("id", id).select("id"));
}

/** Atomically ends the room's current contract and opens one for the new tenant. */
export async function replaceLease(
  currentLeaseId: string | null,
  draft: LeaseDraft,
): Promise<LeaseRow> {
  await requireUserId();
  return unwrap(
    await supabase.rpc("replace_lease", {
      p_current_lease_id: currentLeaseId,
      p_listing_id: draft.listing_id,
      p_tenant_id: draft.tenant_id,
      p_start_date: draft.start_date,
      p_end_date: draft.end_date,
      p_monthly_rent: draft.monthly_rent,
      p_deposit: draft.deposit,
      p_notes: draft.notes,
    }),
  );
}

/* --------------------------------------------------------- meter readings */

export async function getMeterReadings(): Promise<MeterReadingRow[]> {
  assertConfigured();
  return unwrap(
    await supabase.from("meter_readings").select("*").order("period", { ascending: false }),
  );
}

export type MeterDraft = {
  listing_id: string;
  period: string;
  electricity_start: number;
  electricity_end: number;
  water_start: number;
  water_end: number;
};

/** Upserts on `(listing_id, period)` — re-reading a meter overwrites the row. */
export async function saveMeterReading(draft: MeterDraft): Promise<MeterReadingRow> {
  const ownerId = await requireUserId();
  return unwrap(
    await supabase
      .from("meter_readings")
      .upsert({ ...draft, owner_id: ownerId }, { onConflict: "listing_id,period" })
      .select("*")
      .single(),
  );
}

/* -------------------------------------------------------------- invoices */

export async function getInvoices(): Promise<InvoiceRow[]> {
  assertConfigured();
  return unwrap(
    await supabase.from("invoices").select("*").order("period", { ascending: false }),
  );
}

export type InvoiceDraft = {
  lease_id: string | null;
  listing_id: string;
  tenant_id: string | null;
  period: string;
  rent_amount: number;
  electricity_kwh: number;
  electricity_amount: number;
  water_m3: number;
  water_amount: number;
  other_amount: number;
  total_amount: number;
  due_date: string | null;
  notes: string | null;
};

export async function createInvoice(draft: InvoiceDraft): Promise<InvoiceRow> {
  const ownerId = await requireUserId();
  return unwrap(
    await supabase
      .from("invoices")
      .insert({ ...draft, owner_id: ownerId, status: "unpaid", paid_at: null })
      .select("*")
      .single(),
  );
}

/**
 * `invoices_paid_at_check` requires `status` and `paid_at` to agree, so both
 * move together here rather than in two separate updates.
 */
export async function setInvoicePaid(id: string, paid: boolean): Promise<void> {
  assertConfigured();
  unwrap(
    await supabase
      .from("invoices")
      .update({
        status: paid ? "paid" : "unpaid",
        paid_at: paid ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select("id"),
  );
}

export async function deleteInvoice(id: string): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("invoices").delete().eq("id", id).select("id"));
}

/* ------------------------------------------------------------ aggregation */

export type DashboardSnapshot = {
  listings: ListingRow[];
  tenants: TenantRow[];
  leases: LeaseRow[];
  meters: MeterReadingRow[];
  invoices: InvoiceRow[];
};

/**
 * One round of every table the dashboard reads.
 *
 * The tabs used to call five getters each and re-fetch on every switch; doing
 * it once in parallel keeps a tab change instant and costs the same five
 * requests it always did.
 */
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  assertConfigured();
  const [listings, tenants, leases, meters, invoices] = await Promise.all([
    getListings(),
    getTenants(),
    getLeases(),
    getMeterReadings(),
    getInvoices(),
  ]);
  return { listings, tenants, leases, meters, invoices };
}
