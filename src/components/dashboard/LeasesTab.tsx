import { useState } from "react";
import { getLeases, insertLease, updateLeaseStatus, deleteLease } from "@/lib/api/leases.api";
import { getListings } from "@/lib/api/listings.api";
import { getTenants } from "@/lib/api/tenants.api";
import { toast } from "sonner";
import { Plus, FileText, Trash2 } from "lucide-react";
import { formatDate, formatVNDExact } from "@/lib/format";
import { today, type Lease, type Listing, type Tenant } from "@/lib/dashboard-types";
import { useOwnerData } from "@/hooks/use-owner-data";
import { errorMessage } from "@/lib/errors";
import {
  EmptyState,
  Field,
  IconButton,
  Modal,
  PrimaryButton,
  RecordCard,
  SecondaryButton,
  Select,
  TabHeader,
  TextArea,
  TextInput,
} from "./ui";

type LeasesData = { leases: Lease[]; listings: Listing[]; tenants: Tenant[] };

const EMPTY: LeasesData = { leases: [], listings: [], tenants: [] };

async function fetchLeases(ownerId: string): Promise<LeasesData> {
  const [leases, listings, tenants] = await Promise.all([
    getLeases({ data: { ownerId } }),
    getListings({ data: { ownerId } }),
    getTenants({ data: { ownerId } }),
  ]);
  return { leases, listings, tenants };
}

function StatusPill({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 text-[11px] font-medium px-3 h-8 rounded-full border active:scale-95 transition ${
        active
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-stone-100 text-stone-600 border-stone-200"
      }`}
    >
      {active ? "Hiệu lực" : "Kết thúc"}
    </button>
  );
}

export function LeasesTab({ ownerId }: { ownerId: string }) {
  const { data, loading, reload } = useOwnerData(ownerId, fetchLeases, EMPTY);
  const { leases, listings, tenants } = data;
  const [showForm, setShowForm] = useState(false);

  const canCreate = listings.length > 0 && tenants.length > 0;

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá hợp đồng này? Phòng sẽ được đánh dấu còn trống.")) return;
    try {
      const res = await deleteLease({ data: { id, owner_id: ownerId } });
      if (!res.ok) throw new Error("Không tìm thấy hợp đồng");
      toast.success("Đã xoá");
      void reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const toggleStatus = async (lease: Lease) => {
    const next = lease.status === "active" ? "ended" : "active";
    try {
      const res = await updateLeaseStatus({
        data: { id: lease.id, owner_id: ownerId, status: next },
      });
      if (!res.ok) throw new Error("Không tìm thấy hợp đồng");
      // The server resyncs the room's occupancy, so refetch listings too.
      void reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const roomTitle = (id: string) => listings.find((x) => x.id === id)?.title ?? "—";
  const tenantName = (id: string) => tenants.find((x) => x.id === id)?.full_name ?? "—";

  return (
    <div>
      <TabHeader
        title="Hợp đồng thuê"
        subtitle={`Tổng ${leases.length} hợp đồng`}
        action={
          <PrimaryButton
            onClick={() => setShowForm(true)}
            disabled={!canCreate}
            aria-label="Thêm hợp đồng"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Thêm hợp đồng</span>
          </PrimaryButton>
        }
      />

      {showForm && canCreate && (
        <LeaseForm
          ownerId={ownerId}
          listings={listings}
          tenants={tenants}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void reload();
          }}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : leases.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-12" />}
          title="Chưa có hợp đồng"
          description={
            canCreate
              ? "Tạo hợp đồng để bắt đầu tính tiền thuê hàng tháng."
              : "Bạn cần có ít nhất 1 phòng và 1 người thuê trước khi tạo hợp đồng."
          }
        />
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {leases.map((l) => (
              <RecordCard
                key={l.id}
                title={roomTitle(l.listing_id)}
                subtitle={tenantName(l.tenant_id)}
                badge={
                  <StatusPill active={l.status === "active"} onClick={() => toggleStatus(l)} />
                }
                rows={[
                  { label: "Từ ngày", value: formatDate(l.start_date) },
                  { label: "Đến ngày", value: formatDate(l.end_date) },
                  { label: "Tiền thuê", value: formatVNDExact(l.monthly_rent) },
                  { label: "Tiền cọc", value: formatVNDExact(l.deposit) },
                ]}
                actions={
                  <IconButton
                    onClick={() => handleDelete(l.id)}
                    aria-label="Xoá hợp đồng"
                    className="hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                }
              />
            ))}
          </ul>

          <div className="hidden lg:block overflow-x-auto border border-border rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-foreground/5 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Phòng</th>
                  <th className="px-4 py-3 text-left">Người thuê</th>
                  <th className="px-4 py-3 text-left">Từ ngày</th>
                  <th className="px-4 py-3 text-left">Đến ngày</th>
                  <th className="px-4 py-3 text-right">Tiền thuê</th>
                  <th className="px-4 py-3 text-right">Tiền cọc</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {leases.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-3">{roomTitle(l.listing_id)}</td>
                    <td className="px-4 py-3">{tenantName(l.tenant_id)}</td>
                    <td className="px-4 py-3">{formatDate(l.start_date)}</td>
                    <td className="px-4 py-3">{formatDate(l.end_date)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatVNDExact(l.monthly_rent)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatVNDExact(l.deposit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill active={l.status === "active"} onClick={() => toggleStatus(l)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <IconButton
                        onClick={() => handleDelete(l.id)}
                        aria-label="Xoá hợp đồng"
                        className="hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function LeaseForm({
  ownerId,
  listings,
  tenants,
  onClose,
  onSaved,
}: {
  ownerId: string;
  listings: Listing[];
  tenants: Tenant[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [rent, setRent] = useState(String(listings[0]?.price ?? ""));
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const onListingChange = (id: string) => {
    setListingId(id);
    const price = listings.find((x) => x.id === id)?.price;
    if (price != null) setRent(String(price));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (endDate && endDate < startDate) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }
    setBusy(true);
    try {
      await insertLease({
        data: {
          owner_id: ownerId,
          listing_id: listingId,
          tenant_id: tenantId,
          start_date: startDate,
          end_date: endDate || null,
          monthly_rent: Number(rent) || 0,
          deposit: Number(deposit) || 0,
          notes: notes.trim() || null,
        },
      });
      toast.success("Đã tạo hợp đồng");
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Thêm hợp đồng"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <SecondaryButton onClick={onClose} className="flex-1">
            Huỷ
          </SecondaryButton>
          <PrimaryButton type="submit" form="lease-form" disabled={busy} className="flex-1">
            {busy ? "Đang lưu..." : "Tạo hợp đồng"}
          </PrimaryButton>
        </div>
      }
    >
      <form id="lease-form" onSubmit={submit} className="space-y-4">
        <Field label="Phòng">
          <Select value={listingId} onChange={(e) => onListingChange(e.target.value)}>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Người thuê">
          <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Ngày bắt đầu">
            <TextInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Ngày kết thúc">
            <TextInput
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tiền thuê / tháng">
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              required
            />
          </Field>
          <Field label="Tiền cọc">
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Ghi chú">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
      </form>
    </Modal>
  );
}
