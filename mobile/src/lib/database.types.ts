/**
 * Schema types for `supabase-js`.
 *
 * Hand-written to match `supabase/schema.sql`, because there is no project to
 * generate them from yet. Once one exists, replace this file with:
 *
 *     npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 *
 * Keep the two in step: a column added in SQL but not here is invisible to the
 * query builder, and one removed in SQL but left here fails only at runtime.
 */

export type AppRole = "landlord" | "tenant" | "admin";
export type ListingStatus = "available" | "occupied" | "maintenance";
export type VerificationLevel = "unverified" | "pending" | "verified";
export type ModerationStatus = "pending" | "approved" | "rejected";
export type LeaseStatus = "active" | "ended";
export type InvoiceStatus = "unpaid" | "paid";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type ProfileRow = Timestamps & {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export type UserRoleRow = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
};

export type ListingRow = Timestamps & {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: ListingStatus;
  electricity_rate: number;
  water_rate: number;
  is_published: boolean;
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
  school_name: string | null;
  /** Khoảng cách tới trường, tính bằng mét. */
  distance_to_school: number | null;
  verification: VerificationLevel;
  /** Kiểm duyệt nội dung tin. Chỉ quản trị viên đặt được, xem `guard_listing_moderation`. */
  moderation_status: ModerationStatus;
  /** Lý do từ chối — bắt buộc khi `moderation_status = 'rejected'`. */
  moderation_note: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
};

export type PublicListingRow = {
  id: string;
  public_title: string | null;
  public_description: string | null;
  price: number;
  electricity_rate: number;
  water_rate: number;
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

/**
 * Một dòng của view `admin_listings` — mọi tin đăng, kèm chủ trọ và ảnh.
 *
 * Không phải `ListingRow`: quản trị viên không đọc ghi chú nội bộ hay đơn giá
 * điện nước của chủ trọ, đó là việc của chủ trọ. Bù lại có tên/điện thoại chủ
 * trọ để gọi đối chiếu, thứ `ListingRow` không mang theo.
 */
export type AdminListingRow = {
  id: string;
  owner_id: string;
  title: string;
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
  is_published: boolean;
  moderation_status: ModerationStatus;
  moderation_note: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
  owner_phone: string | null;
  images: { storage_path: string; sort_order: number }[];
  review_count: number;
};

export type AdminReviewRow = {
  id: string;
  listing_id: string;
  author_id: string | null;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
  owner_id: string;
  listing_title: string;
  /** Đánh giá có hợp đồng thuê chống lưng hay không. */
  from_tenant: boolean;
};

export type TenantRow = Timestamps & {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  move_in_date: string | null;
  notes: string | null;
  /** Tài khoản Roomy của người thuê, do chính họ nhận qua `claim_tenancy`. */
  user_id: string | null;
};

export type LeaseRow = Timestamps & {
  id: string;
  owner_id: string;
  listing_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  deposit: number;
  status: LeaseStatus;
  notes: string | null;
};

export type MeterReadingRow = Timestamps & {
  id: string;
  owner_id: string;
  listing_id: string;
  period: string;
  electricity_start: number;
  electricity_end: number;
  water_start: number;
  water_end: number;
};

export type InvoiceRow = Timestamps & {
  id: string;
  owner_id: string;
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
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
};

export type ListingImageRow = {
  id: string;
  listing_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  listing_id: string;
  author_id: string | null;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type FavoriteRow = {
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type BookingRow = Timestamps & {
  id: string;
  listing_id: string;
  user_id: string;
  name: string;
  phone: string;
  view_date: string;
  view_time: string;
  note: string | null;
  status: BookingStatus;
};

/** Columns the database fills in itself on insert. */
type Generated = "id" | "created_at" | "updated_at";

type Table<Row, RequiredOnInsert extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, RequiredOnInsert> & Partial<Omit<Row, RequiredOnInsert>>;
  Update: Partial<Omit<Row, Generated & keyof Row>>;
  Relationships: [];
};

type ReadOnlyView<Row> = {
  Row: Row;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      user_roles: Table<UserRoleRow, "user_id" | "role">;
      listings: Table<ListingRow, "owner_id" | "title" | "price">;
      tenants: Table<TenantRow, "owner_id" | "full_name">;
      leases: Table<
        LeaseRow,
        "owner_id" | "listing_id" | "tenant_id" | "start_date" | "monthly_rent"
      >;
      meter_readings: Table<MeterReadingRow, "owner_id" | "listing_id" | "period">;
      invoices: Table<InvoiceRow, "owner_id" | "listing_id" | "period">;
      listing_images: Table<ListingImageRow, "listing_id" | "storage_path">;
      reviews: Table<ReviewRow, "listing_id" | "author_name" | "rating" | "comment">;
      favorites: Table<FavoriteRow, "user_id" | "listing_id">;
      bookings: Table<
        BookingRow,
        "listing_id" | "user_id" | "name" | "phone" | "view_date" | "view_time"
      >;
    };
    Views: {
      public_listings: ReadOnlyView<PublicListingRow>;
      owner_listings: ReadOnlyView<ListingRow>;
      admin_listings: ReadOnlyView<AdminListingRow>;
      admin_reviews: ReadOnlyView<AdminReviewRow>;
    };
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      can_review_listing: {
        Args: { _listing_id: string };
        Returns: boolean;
      };
      /** Trả về số hồ sơ người thuê vừa nối được vào tài khoản đang đăng nhập. */
      claim_tenancy: {
        Args: Record<never, never>;
        Returns: number;
      };
      replace_lease: {
        Args: {
          p_current_lease_id: string | null;
          p_listing_id: string;
          p_tenant_id: string;
          p_start_date: string;
          p_end_date: string | null;
          p_monthly_rent: number;
          p_deposit: number;
          p_notes: string | null;
        };
        Returns: LeaseRow;
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<never, never>;
  };
};
