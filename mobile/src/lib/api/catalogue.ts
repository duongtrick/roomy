import type { ListingStatus, VerificationLevel } from "../database.types";
import { photoUrl, supabase } from "../supabase";
import { assertConfigured, unwrap, unwrapAs } from "./errors";

/**
 * The public room catalogue — what a visitor browsing the app sees.
 *
 * Shaped to match what the screens render rather than the table layout: the
 * cover photo, the gallery, the landlord's contact card and the review list
 * all arrive in one request, because a listing card that fires four follow-up
 * queries per row makes the feed crawl.
 */

export type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
};

export type Room = {
  id: string;
  title: string;
  area: string;
  district: string;
  address: string;
  price: number;
  size: number;
  amenities: string[];
  description: string;
  /** Trạng thái phòng — người tìm trọ cần biết phòng còn trống hay đã có người. */
  status: ListingStatus;
  /** Trường học dùng làm mốc cho `distanceToSchool`. */
  school: string;
  /** Khoảng cách tới trường tính bằng mét, `null` nếu chủ trọ chưa khai. */
  distanceToSchool: number | null;
  /** Mức độ xác thực của tin đăng. */
  verification: VerificationLevel;
  /** Cover photo, or null while the room has no images uploaded. */
  image: string | null;
  gallery: string[];
  landlord: { name: string; phone: string; rating: number };
  reviews: Review[];
  lat: number;
  lng: number;
};

const SELECT = `
  id, public_title, public_description, price, size, address, area, district,
  amenities, lat, lng, status, school_name, distance_to_school, verification,
  owner, images, reviews, created_at
` as const;

type CatalogueRow = {
  id: string;
  public_title: string | null;
  public_description: string | null;
  price: number;
  size: number | null;
  address: string | null;
  area: string | null;
  district: string | null;
  amenities: string[];
  lat: number | null;
  lng: number | null;
  status: ListingStatus;
  school_name: string | null;
  distance_to_school: number | null;
  verification: VerificationLevel;
  created_at: string;
  owner: { full_name: string | null; phone: string | null } | null;
  images: { storage_path: string; sort_order: number }[];
  reviews: {
    id: string;
    author_name: string;
    rating: number;
    comment: string;
    created_at: string;
  }[];
};

/** `2026-03-14T…` → `03/2026`, the form the review list shows. */
function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function toRoom(row: CatalogueRow): Room {
  const gallery = [...row.images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => photoUrl(i.storage_path))
    .filter((u): u is string => Boolean(u));

  const reviews = row.reviews.map((r) => ({
    id: r.id,
    author: r.author_name,
    rating: r.rating,
    comment: r.comment,
    date: monthLabel(r.created_at),
  }));

  // The landlord's headline rating is the average of their room's reviews —
  // there is no separate rating column to drift out of sync with them.
  const rating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  return {
    id: row.id,
    title: row.public_title ?? "Phòng chưa đặt tên",
    area: row.area ?? "",
    district: row.district ?? "",
    address: row.address ?? "",
    price: row.price,
    size: row.size ?? 0,
    amenities: row.amenities,
    description: row.public_description ?? "",
    status: row.status,
    school: row.school_name ?? "",
    distanceToSchool: row.distance_to_school,
    verification: row.verification,
    image: gallery[0] ?? null,
    gallery,
    landlord: {
      name: row.owner?.full_name ?? "Chủ trọ",
      phone: row.owner?.phone ?? "",
      rating,
    },
    reviews,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
  };
}

export async function getRooms(): Promise<Room[]> {
  assertConfigured();
  const rows = unwrapAs<CatalogueRow[]>(
    await supabase
      .from("public_listings")
      .select(SELECT)
      .order("created_at", { ascending: false }),
  );
  return rows.map(toRoom);
}

export async function getRoom(id: string): Promise<Room | null> {
  assertConfigured();
  const row = unwrapAs<CatalogueRow | null>(
    await supabase
      .from("public_listings")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle(),
  );
  return row ? toRoom(row) : null;
}

/** Distinct `area` values across published rooms, for the home filter. */
export async function getAreas(): Promise<string[]> {
  assertConfigured();
  const rows = unwrap(
    await supabase
      .from("public_listings")
      .select("area")
      .not("area", "is", null),
  );
  return [...new Set(rows.map((r) => r.area).filter((a): a is string => Boolean(a)))].sort();
}
