import { useMemo, useState } from "react";
import {
  getListings,
  insertListing,
  updateListing,
  deleteListing,
  updateListingStatus,
} from "@/lib/api/listings.api";
import { getLeases, insertLease, updateLeaseStatus } from "@/lib/api/leases.api";
import { getTenants } from "@/lib/api/tenants.api";
import { getInvoices, insertInvoice } from "@/lib/api/invoices.api";
import { getMeterReadings, upsertMeterReading } from "@/lib/api/meters.api";
import { toast } from "sonner";
import {
  Plus,
  Home,
  Trash2,
  Edit3,
  Search,
  Zap,
  Droplet,
  User,
  ChevronDown,
  ChevronRight,
  Gauge,
  Receipt,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatDate, formatVNDExact } from "@/lib/format";
import {
  ROOM_STATUS_COLOR,
  ROOM_STATUS_LABEL,
  STATUS_ORDER,
  currentPeriod,
  today,
  toRoomStatus,
  type Invoice,
  type Lease,
  type Listing,
  type MeterReading,
  type RoomStatus,
  type Tenant,
} from "@/lib/dashboard-types";
import { useOwnerData } from "@/hooks/use-owner-data";
import { errorMessage } from "@/lib/errors";
import {
  EmptyState,
  Field,
  IconButton,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Select,
  TextArea,
  TextInput,
} from "./ui";

type RoomRow = Listing & {
  tenantName: string | null;
  leaseRent: number | null;
  unpaidCount: number;
  unpaidTotal: number;
  currentMeter: MeterReading | null;
  prevMeter: MeterReading | null;
  currentInvoice: Invoice | null;
};

type RoomsData = {
  listings: Listing[];
  leases: Lease[];
  tenants: Tenant[];
  invoices: Invoice[];
  meters: MeterReading[];
};

const EMPTY: RoomsData = { listings: [], leases: [], tenants: [], invoices: [], meters: [] };

async function fetchRooms(ownerId: string): Promise<RoomsData> {
  const [listings, leases, tenants, invoices, meters] = await Promise.all([
    getListings({ data: { ownerId } }),
    getLeases({ data: { ownerId } }),
    getTenants({ data: { ownerId } }),
    getInvoices({ data: { ownerId } }),
    getMeterReadings({ data: { ownerId } }),
  ]);
  return { listings, leases, tenants, invoices, meters };
}

export function RoomsTab({ ownerId }: { ownerId: string }) {
  const { data, loading, reload } = useOwnerData(ownerId, fetchRooms, EMPTY);
  const { listings: items, leases, tenants, invoices, meters } = data;

  const [editing, setEditing] = useState<Listing | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatus | "all">("all");
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const period = currentPeriod();

  const rows: RoomRow[] = useMemo(() => {
    return items.map((l) => {
      const active = leases.find((x) => x.listing_id === l.id && x.status === "active");
      const tenant = active ? tenants.find((t) => t.id === active.tenant_id) : null;
      const roomInvoices = invoices.filter((i) => i.listing_id === l.id);
      const unpaid = roomInvoices.filter((i) => i.status !== "paid");
      const roomMeters = meters.filter((m) => m.listing_id === l.id);
      const currentMeter = roomMeters.find((m) => m.period === period) ?? null;
      // Sort explicitly: "most recent earlier period" must not depend on the
      // order rows happen to come back from the query in.
      const prevMeter =
        roomMeters
          .filter((m) => m.period < period)
          .sort((a, b) => b.period.localeCompare(a.period))[0] ?? null;
      const currentInvoice = roomInvoices.find((i) => i.period === period) ?? null;
      return {
        ...l,
        tenantName: tenant?.full_name ?? null,
        leaseRent: active?.monthly_rent ?? null,
        unpaidCount: unpaid.length,
        unpaidTotal: unpaid.reduce((s, i) => s + i.total_amount, 0),
        currentMeter,
        prevMeter,
        currentInvoice,
      };
    });
  }, [items, leases, tenants, invoices, meters, period]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && toRoomStatus(r.status) !== statusFilter) return false;
      if (!q) return true;
      return r.title.toLowerCase().includes(q) || (r.tenantName ?? "").toLowerCase().includes(q);
    });
  }, [rows, query, statusFilter]);

  const counts = useMemo(() => {
    const base = { all: rows.length, available: 0, occupied: 0, maintenance: 0 };
    for (const r of rows) base[toRoomStatus(r.status)]++;
    return base;
  }, [rows]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá phòng này? Các hợp đồng, hoá đơn và chỉ số liên quan cũng sẽ bị xoá."))
      return;
    try {
      const res = await deleteListing({ data: { id, owner_id: ownerId } });
      if (!res.ok) throw new Error("Không tìm thấy phòng");
      toast.success("Đã xoá phòng");
      setDetailsId((cur) => (cur === id ? null : cur));
      void reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const detailsRow = detailsId ? (rows.find((r) => r.id === detailsId) ?? null) : null;
  const detailsLease = detailsRow
    ? (leases.find((l) => l.listing_id === detailsRow.id && l.status === "active") ?? null)
    : null;
  const detailsTenant = detailsLease
    ? (tenants.find((t) => t.id === detailsLease.tenant_id) ?? null)
    : null;
  const detailsInvoices = detailsRow
    ? invoices
        .filter((i) => i.listing_id === detailsRow.id)
        .sort((a, b) => b.period.localeCompare(a.period))
        .slice(0, 6)
    : [];

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-6 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-serif italic font-bold truncate">Phòng trọ</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.all} phòng · {counts.occupied} đã thuê · {counts.available} trống
          </p>
        </div>
        <PrimaryButton
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          aria-label="Thêm phòng"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Thêm phòng</span>
        </PrimaryButton>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên phòng hoặc người thuê..."
            className="w-full pl-10 pr-4 h-12 sm:h-10 rounded-xl border border-border bg-background text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-foreground/40 transition"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {(["all", ...STATUS_ORDER] as const).map((s) => {
            const active = statusFilter === s;
            const label = s === "all" ? "Tất cả" : ROOM_STATUS_LABEL[s];
            const n = counts[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-xs font-medium border transition-colors active:scale-95 ${
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                <span
                  className={`px-1.5 rounded-full text-[10px] ${active ? "bg-background/20" : "bg-foreground/5"}`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showForm && (
        <RoomForm
          // Keyed so switching which room is edited re-seeds the form state.
          key={editing?.id ?? "new"}
          ownerId={ownerId}
          initial={editing}
          tenants={tenants}
          activeLease={
            editing
              ? (leases.find((l) => l.listing_id === editing.id && l.status === "active") ?? null)
              : null
          }
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void reload();
          }}
        />
      )}

      {/* Body */}
      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Home className="size-12" />}
          title="Chưa có phòng nào"
          description="Thêm phòng đầu tiên để bắt đầu quản lý người thuê, chỉ số và hoá đơn."
          action={
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus className="size-4" /> Thêm phòng
            </PrimaryButton>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Không tìm thấy phòng phù hợp.
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="space-y-3 lg:hidden">
            {filtered.map((r) => (
              <li
                key={r.id}
                onClick={() => setDetailsId(r.id)}
                className="border border-border rounded-2xl p-4 bg-background cursor-pointer hover:border-foreground/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{r.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-block text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full border ${ROOM_STATUS_COLOR[toRoomStatus(r.status)]}`}
                      >
                        {ROOM_STATUS_LABEL[toRoomStatus(r.status)]}
                      </span>
                      {r.status === "occupied" && !r.currentMeter && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          <AlertCircle className="size-2.5" /> Chưa ghi
                        </span>
                      )}
                      {r.status === "occupied" && r.currentMeter && !r.currentInvoice && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                          <Receipt className="size-2.5" /> Chờ tạo HĐ
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif italic font-bold text-primary">
                      {formatVNDExact(r.leaseRent ?? r.price)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">/tháng</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <User className="size-3.5 shrink-0" />
                    <span className="truncate">{r.tenantName ?? "Chưa có"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Home className="size-3.5 shrink-0" />
                    {r.size ? `${r.size} m²` : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="size-3.5 shrink-0" />
                    {formatVNDExact(r.electricity_rate)}/kWh
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Droplet className="size-3.5 shrink-0" />
                    {formatVNDExact(r.water_rate)}/m³
                  </span>
                </div>
                {r.unpaidCount > 0 && (
                  <div className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    {r.unpaidCount} hoá đơn chưa thu · {formatVNDExact(r.unpaidTotal)}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-end gap-1">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(r);
                      setShowForm(true);
                    }}
                    aria-label={`Sửa ${r.title}`}
                  >
                    <Edit3 className="size-4" />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r.id);
                    }}
                    aria-label={`Xoá ${r.title}`}
                    className="hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden lg:block border border-border rounded-2xl bg-background">
            <table className="w-full text-sm">
              <thead className="bg-foreground/[0.03] text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3 rounded-tl-2xl">Phòng</th>
                  <th className="text-left font-medium px-4 py-3">Trạng thái</th>
                  <th className="text-left font-medium px-4 py-3">Người thuê</th>
                  <th className="text-right font-medium px-4 py-3">Giá thuê</th>
                  <th className="text-right font-medium px-4 py-3">Điện / Nước</th>
                  <th className="text-right font-medium px-4 py-3">Công nợ</th>
                  <th className="w-12 rounded-tr-2xl"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const status = toRoomStatus(r.status);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setDetailsId(r.id)}
                      className="border-t border-border hover:bg-foreground/[0.02] cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.title}</div>
                        {r.size && <div className="text-xs text-muted-foreground">{r.size} m²</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={`inline-block text-[10px] uppercase tracking-wide font-bold px-2.5 py-1 rounded-full border ${ROOM_STATUS_COLOR[status]}`}
                          >
                            {ROOM_STATUS_LABEL[status]}
                          </span>
                          {r.status === "occupied" && !r.currentMeter && (
                            <span
                              title={`Chưa ghi chỉ số kỳ ${period}`}
                              className="inline-flex items-center text-amber-600"
                            >
                              <AlertCircle className="size-3.5" />
                            </span>
                          )}
                          {r.status === "occupied" && r.currentMeter && !r.currentInvoice && (
                            <span
                              title={`Chưa tạo hoá đơn kỳ ${period}`}
                              className="inline-flex items-center text-blue-600"
                            >
                              <Receipt className="size-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {r.tenantName ? (
                          <span className="inline-flex items-center gap-1.5">
                            <User className="size-3.5 text-muted-foreground" />
                            {r.tenantName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        {formatVNDExact(r.leaseRent ?? r.price)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatVNDExact(r.electricity_rate)} / {formatVNDExact(r.water_rate)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {r.unpaidCount > 0 ? (
                          <span className="text-destructive font-medium">
                            {formatVNDExact(r.unpaidTotal)}
                            <span className="text-[10px] font-normal block">
                              {r.unpaidCount} hoá đơn
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(r);
                              setShowForm(true);
                            }}
                            aria-label={`Sửa ${r.title}`}
                          >
                            <Edit3 className="size-4" />
                          </IconButton>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id);
                            }}
                            aria-label={`Xoá ${r.title}`}
                            className="hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailsRow && (
        <RoomDetails
          ownerId={ownerId}
          period={period}
          row={detailsRow}
          lease={detailsLease}
          tenant={detailsTenant}
          invoices={detailsInvoices}
          onClose={() => setDetailsId(null)}
          onChanged={reload}
          onEdit={() => {
            setEditing(detailsRow);
            setDetailsId(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}

function RoomForm({
  ownerId,
  initial,
  tenants,
  activeLease,
  onClose,
  onSaved,
}: {
  ownerId: string;
  initial: Listing | null;
  tenants: Tenant[];
  activeLease: Lease | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [size, setSize] = useState(String(initial?.size ?? ""));
  const [status, setStatus] = useState<RoomStatus>(toRoomStatus(initial?.status ?? ""));
  const [electricityRate, setElectricityRate] = useState(String(initial?.electricity_rate ?? 3500));
  const [waterRate, setWaterRate] = useState(String(initial?.water_rate ?? 25000));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tenantId, setTenantId] = useState<string>(activeLease?.tenant_id ?? "");

  // Optional public-listing fields (collapsed by default)
  const [showPublic, setShowPublic] = useState(false);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");

  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (status === "occupied" && !tenantId) {
      toast.error("Vui lòng chọn người thuê cho phòng này.");
      return;
    }
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên phòng.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        owner_id: ownerId,
        title: title.trim(),
        description: description || null,
        price: Number(price),
        size: size ? Number(size) : null,
        address: address || null,
        area: area || null,
        image_url: imageUrl || null,
        status,
        electricity_rate: Number(electricityRate) || 0,
        water_rate: Number(waterRate) || 0,
      };
      const saved = initial
        ? await updateListing({ data: { ...payload, id: initial.id } })
        : await insertListing({ data: payload });

      const listingId = saved?.id ?? initial?.id;
      if (!listingId) throw new Error("Không lưu được phòng");

      // Keep the active lease in step with the tenant picked above.
      const tenantChanged = !activeLease || activeLease.tenant_id !== tenantId;
      if (status === "occupied" && tenantId && tenantChanged) {
        if (activeLease) {
          await updateLeaseStatus({
            data: { id: activeLease.id, owner_id: ownerId, status: "ended" },
          });
        }
        await insertLease({
          data: {
            owner_id: ownerId,
            listing_id: listingId,
            tenant_id: tenantId,
            start_date: today(),
            monthly_rent: Number(price) || 0,
            deposit: 0,
            status: "active",
          },
        });
      } else if (status !== "occupied" && activeLease) {
        await updateLeaseStatus({
          data: { id: activeLease.id, owner_id: ownerId, status: "ended" },
        });
      }

      // `updateLeaseStatus`/`insertLease` resync occupancy on the server, which
      // can override the status just saved above — reassert the explicit choice.
      await updateListingStatus({ data: { id: listingId, owner_id: ownerId, status } });

      toast.success(initial ? "Đã cập nhật phòng" : "Đã thêm phòng");
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <SecondaryButton onClick={onClose} className="flex-1">
            Huỷ
          </SecondaryButton>
          <PrimaryButton type="submit" form="room-form" disabled={busy} className="flex-1">
            {busy ? "Đang lưu..." : initial ? "Lưu thay đổi" : "Thêm phòng"}
          </PrimaryButton>
        </div>
      }
    >
      <form id="room-form" onSubmit={submit} className="space-y-4">
        <Field label="Tên / mã phòng">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="VD: P.101 — Tầng 1"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Giá thuê / tháng (VNĐ)">
            <TextInput
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min={0}
            />
          </Field>
          <Field label="Diện tích (m²)">
            <TextInput
              type="number"
              inputMode="numeric"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              min={0}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Giá điện / kWh">
            <TextInput
              type="number"
              inputMode="numeric"
              value={electricityRate}
              onChange={(e) => setElectricityRate(e.target.value)}
              min={0}
            />
          </Field>
          <Field label="Giá nước / m³">
            <TextInput
              type="number"
              inputMode="numeric"
              value={waterRate}
              onChange={(e) => setWaterRate(e.target.value)}
              min={0}
            />
          </Field>
        </div>

        <Field label="Trạng thái">
          <div className="grid grid-cols-3 gap-2">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  status === s
                    ? `${ROOM_STATUS_COLOR[s]} border-current`
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {ROOM_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </Field>

        {status === "occupied" && (
          <Field label="Người thuê hiện tại">
            {tenants.length === 0 ? (
              <div className="text-xs text-muted-foreground px-3 py-2.5 rounded-xl border border-dashed border-border">
                Chưa có người thuê. Vào tab{" "}
                <span className="font-medium text-foreground">Người thuê</span> để thêm trước.
              </div>
            ) : (
              <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} required>
                <option value="">— Chọn người thuê —</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                    {t.phone ? ` · ${t.phone}` : ""}
                  </option>
                ))}
              </Select>
            )}
            {activeLease && tenantId && activeLease.tenant_id !== tenantId && (
              <p className="text-[11px] text-amber-700 mt-1.5">
                Hợp đồng cũ sẽ được kết thúc và tạo hợp đồng mới cho người thuê này.
              </p>
            )}
          </Field>
        )}

        <Field label="Ghi chú nội bộ">
          <TextArea
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Ghi chú dành riêng cho chủ trọ (thiết bị, lưu ý...)"
          />
        </Field>

        {/* Optional public listing block */}
        <div className="border border-dashed border-border rounded-xl">
          <button
            type="button"
            onClick={() => setShowPublic((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              {showPublic ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              Tuỳ chọn đăng tin công khai
            </span>
            <span className="text-[10px] uppercase tracking-wide">không bắt buộc</span>
          </button>
          {showPublic && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
              <Field label="Khu vực">
                <TextInput
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="VD: Phường Quang Trung"
                />
              </Field>
              <Field label="Địa chỉ chi tiết">
                <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
              <Field label="Link ảnh">
                <TextInput
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

function RoomDetails({
  ownerId,
  period,
  row,
  lease,
  tenant,
  invoices,
  onClose,
  onEdit,
  onChanged,
}: {
  ownerId: string;
  period: string;
  row: RoomRow;
  lease: Lease | null;
  tenant: Tenant | null;
  invoices: Invoice[];
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [showMeter, setShowMeter] = useState(false);
  const [busy, setBusy] = useState(false);

  const cm = row.currentMeter;
  const pm = row.prevMeter;
  // For meter form defaults: start = previous period's end (carried forward)
  const defaultEStart = cm?.electricity_start ?? pm?.electricity_end ?? 0;
  const defaultWStart = cm?.water_start ?? pm?.water_end ?? 0;

  const [eStart, setEStart] = useState(String(defaultEStart));
  const [eEnd, setEEnd] = useState(String(cm?.electricity_end ?? ""));
  const [wStart, setWStart] = useState(String(defaultWStart));
  const [wEnd, setWEnd] = useState(String(cm?.water_end ?? ""));

  const saveMeter = async () => {
    if (busy) return;
    if (Number(eEnd) < Number(eStart) || Number(wEnd) < Number(wStart)) {
      toast.error("Chỉ số cuối kỳ không được nhỏ hơn chỉ số đầu kỳ.");
      return;
    }
    setBusy(true);
    try {
      const res = await upsertMeterReading({
        data: {
          owner_id: ownerId,
          listing_id: row.id,
          period,
          electricity_start: Number(eStart) || 0,
          electricity_end: Number(eEnd) || 0,
          water_start: Number(wStart) || 0,
          water_end: Number(wEnd) || 0,
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Không lưu được chỉ số");
      toast.success(`Đã lưu chỉ số kỳ ${period}`);
      setShowMeter(false);
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const createInvoice = async () => {
    if (busy) return;
    if (!cm) {
      toast.error("Hãy ghi chỉ số điện nước kỳ này trước.");
      return;
    }
    if (row.currentInvoice) {
      toast.info("Hoá đơn kỳ này đã tồn tại.");
      return;
    }
    const kwh = Math.max(0, cm.electricity_end - cm.electricity_start);
    const m3 = Math.max(0, cm.water_end - cm.water_start);
    const eAmt = kwh * row.electricity_rate;
    const wAmt = m3 * row.water_rate;
    const rent = row.leaseRent ?? row.price;
    const total = rent + eAmt + wAmt;
    setBusy(true);
    try {
      const res = await insertInvoice({
        data: {
          owner_id: ownerId,
          lease_id: lease?.id ?? null,
          listing_id: row.id,
          tenant_id: tenant?.id ?? null,
          period,
          rent_amount: rent,
          electricity_kwh: kwh,
          electricity_amount: eAmt,
          water_m3: m3,
          water_amount: wAmt,
          other_amount: 0,
          total_amount: total,
          status: "unpaid",
        },
      });
      if (res.error) throw new Error(res.error);
      toast.success(`Đã tạo hoá đơn kỳ ${period} · ${formatVNDExact(total)}`);
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const status = toRoomStatus(row.status);
  const kwhUsed = cm ? Math.max(0, cm.electricity_end - cm.electricity_start) : 0;
  const m3Used = cm ? Math.max(0, cm.water_end - cm.water_start) : 0;
  const eAmt = kwhUsed * row.electricity_rate;
  const wAmt = m3Used * row.water_rate;
  return (
    <Modal
      title={row.title}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <SecondaryButton onClick={onClose} className="flex-1">
            Đóng
          </SecondaryButton>
          <PrimaryButton onClick={onEdit} className="flex-1">
            <Edit3 className="size-4" /> Chỉnh sửa
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-block text-[10px] uppercase tracking-wide font-bold px-2.5 py-1 rounded-full border ${ROOM_STATUS_COLOR[status]}`}
          >
            {ROOM_STATUS_LABEL[status]}
          </span>
          {row.size && <span className="text-xs text-muted-foreground">{row.size} m²</span>}
          <span className="ml-auto font-serif italic font-bold text-primary">
            {formatVNDExact(row.leaseRent ?? row.price)}
            <span className="text-xs text-muted-foreground font-sans not-italic font-normal">
              {" "}
              /tháng
            </span>
          </span>
        </div>

        <section>
          <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
            Người thuê
          </h4>
          {tenant ? (
            <div className="border border-border rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <User className="size-4 text-muted-foreground" />
                {tenant.full_name}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {tenant.phone && (
                  <div>
                    SĐT: <span className="text-foreground">{tenant.phone}</span>
                  </div>
                )}
                {tenant.email && (
                  <div>
                    Email: <span className="text-foreground">{tenant.email}</span>
                  </div>
                )}
                {tenant.id_number && (
                  <div>
                    CCCD: <span className="text-foreground">{tenant.id_number}</span>
                  </div>
                )}
                {tenant.move_in_date && (
                  <div>
                    Ngày vào:{" "}
                    <span className="text-foreground">{formatDate(tenant.move_in_date)}</span>
                  </div>
                )}
                {lease && (
                  <div>
                    Bắt đầu HĐ:{" "}
                    <span className="text-foreground">{formatDate(lease.start_date)}</span>
                  </div>
                )}
                {lease?.deposit ? (
                  <div>
                    Tiền cọc:{" "}
                    <span className="text-foreground">{formatVNDExact(lease.deposit)}</span>
                  </div>
                ) : null}
              </div>
              {tenant.notes && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                  {tenant.notes}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-2xl p-4">
              Chưa gán người thuê cho phòng này.
            </p>
          )}
        </section>

        <section className="border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-foreground/[0.03]">
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Kỳ hiện tại</span>
              <span className="text-xs text-muted-foreground">· {period}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {cm ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="size-3" /> Đã ghi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  <AlertCircle className="size-3" /> Chưa ghi
                </span>
              )}
              {row.currentInvoice && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  <Receipt className="size-3" /> Có HĐ
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {cm ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Zap className="size-3 text-amber-500" /> Điện
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cm.electricity_start} → {cm.electricity_end}
                  </div>
                  <div className="font-medium">
                    {kwhUsed} kWh · {formatVNDExact(eAmt)}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Droplet className="size-3 text-blue-500" /> Nước
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cm.water_start} → {cm.water_end}
                  </div>
                  <div className="font-medium">
                    {m3Used} m³ · {formatVNDExact(wAmt)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {pm
                  ? `Chỉ số cuối kỳ trước: điện ${pm.electricity_end}, nước ${pm.water_end}. Ghi chỉ số mới để tự động tính hoá đơn.`
                  : "Chưa có chỉ số nào. Ghi chỉ số đầu/cuối kỳ để tự động tính hoá đơn."}
              </p>
            )}

            {showMeter && (
              <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
                <div>
                  <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-500" /> Điện (kWh)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Chỉ số đầu">
                      <TextInput
                        type="number"
                        inputMode="numeric"
                        value={eStart}
                        onChange={(e) => setEStart(e.target.value)}
                      />
                    </Field>
                    <Field label="Chỉ số cuối">
                      <TextInput
                        type="number"
                        inputMode="numeric"
                        value={eEnd}
                        onChange={(e) => setEEnd(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                    <Droplet className="size-3.5 text-blue-500" /> Nước (m³)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Chỉ số đầu">
                      <TextInput
                        type="number"
                        inputMode="numeric"
                        value={wStart}
                        onChange={(e) => setWStart(e.target.value)}
                      />
                    </Field>
                    <Field label="Chỉ số cuối">
                      <TextInput
                        type="number"
                        inputMode="numeric"
                        value={wEnd}
                        onChange={(e) => setWEnd(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
                <div className="flex gap-2">
                  <SecondaryButton
                    type="button"
                    onClick={() => setShowMeter(false)}
                    className="flex-1"
                  >
                    Huỷ
                  </SecondaryButton>
                  <PrimaryButton
                    type="button"
                    onClick={saveMeter}
                    disabled={busy}
                    className="flex-1"
                  >
                    {busy ? "Đang lưu..." : "Lưu chỉ số"}
                  </PrimaryButton>
                </div>
              </div>
            )}

            {!showMeter && (
              <div className="flex flex-wrap gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setShowMeter(true)}
                  className="flex-1 min-w-[140px]"
                >
                  <Gauge className="size-4" />
                  {cm ? "Cập nhật chỉ số" : "Ghi chỉ số"}
                </SecondaryButton>
                <PrimaryButton
                  type="button"
                  onClick={createInvoice}
                  disabled={busy || !cm || !!row.currentInvoice}
                  className="flex-1 min-w-[140px]"
                >
                  <Receipt className="size-4" />
                  {row.currentInvoice ? "Đã có HĐ kỳ này" : "Tạo hoá đơn"}
                </PrimaryButton>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="border border-border rounded-2xl p-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Zap className="size-3" /> Giá điện
            </div>
            <div className="text-sm font-medium">{formatVNDExact(row.electricity_rate)}/kWh</div>
          </div>
          <div className="border border-border rounded-2xl p-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Droplet className="size-3" /> Giá nước
            </div>
            <div className="text-sm font-medium">{formatVNDExact(row.water_rate)}/m³</div>
          </div>
        </section>

        {row.description && (
          <section>
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
              Ghi chú nội bộ
            </h4>
            <p className="text-sm whitespace-pre-wrap border border-border rounded-2xl p-4">
              {row.description}
            </p>
          </section>
        )}

        <section>
          <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
            Hoá đơn gần đây
          </h4>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-2xl p-4">
              Chưa có hoá đơn nào.
            </p>
          ) : (
            <ul className="border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <div className="font-medium">Kỳ {inv.period}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {inv.status === "paid" ? "Đã thanh toán" : "Chưa thu"}
                      {inv.due_date ? ` · Hạn ${formatDate(inv.due_date)}` : ""}
                    </div>
                  </div>
                  <div className={`font-medium ${inv.status !== "paid" ? "text-destructive" : ""}`}>
                    {formatVNDExact(inv.total_amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(row.address || row.area) && (
          <section className="text-xs text-muted-foreground">
            {row.area && (
              <div>
                Khu vực: <span className="text-foreground">{row.area}</span>
              </div>
            )}
            {row.address && (
              <div>
                Địa chỉ: <span className="text-foreground">{row.address}</span>
              </div>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
