import { useEffect, useState } from "react";
import { getLeases, insertLease, updateLeaseStatus, deleteLease as deleteLeaseFn } from "@/lib/api/leases.api";
import { getListings, updateListingStatus } from "@/lib/api/listings.api";
import { getTenants } from "@/lib/api/tenants.api";
import { toast } from "sonner";
import { Plus, FileText, Trash2 } from "lucide-react";
import { formatVND } from "@/lib/rooms";
import type { Lease, Listing, Tenant } from "@/lib/dashboard-types";
import { EmptyState, Field, Modal, PrimaryButton, SecondaryButton, TextArea, TextInput } from "./ui";

export function LeasesTab({ ownerId }: { ownerId: string }) {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [l, ls, t] = await Promise.all([
      getLeases({ data: { ownerId } }),
      getListings({ data: { ownerId } }),
      getTenants({ data: { ownerId } }),
    ]);
    setLeases((l ?? []) as unknown as Lease[]);
    setListings((ls ?? []) as unknown as Listing[]);
    setTenants((t ?? []) as unknown as Tenant[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ownerId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá hợp đồng này?")) return;
    try {
      await deleteLeaseFn({ data: { id } });
      toast.success("Đã xoá");
      load();
    } catch (e: any) { toast.error(e.message ?? "Lỗi"); }
  };

  const toggleStatus = async (lease: Lease) => {
    const next = lease.status === "active" ? "ended" : "active";
    try {
      await updateLeaseStatus({ data: { id: lease.id, status: next } });
      load();
    } catch (e: any) { toast.error(e.message ?? "Lỗi"); }
  };

  const roomTitle = (id: string) => listings.find((x) => x.id === id)?.title ?? "—";
  const tenantName = (id: string) => tenants.find((x) => x.id === id)?.full_name ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif italic font-bold">Hợp đồng thuê</h2>
          <p className="text-sm text-muted-foreground mt-1">Tổng {leases.length} hợp đồng</p>
        </div>
        <PrimaryButton onClick={() => setShowForm(true)} disabled={listings.length === 0 || tenants.length === 0}>
          <Plus className="size-4" /> Thêm hợp đồng
        </PrimaryButton>
      </div>

      {showForm && (
        <LeaseForm ownerId={ownerId} listings={listings} tenants={tenants} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : leases.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-12" />}
          title="Chưa có hợp đồng"
          description={listings.length === 0 || tenants.length === 0
            ? "Bạn cần có ít nhất 1 phòng và 1 người thuê trước khi tạo hợp đồng."
            : "Tạo hợp đồng để bắt đầu tính tiền thuê hàng tháng."}
        />
      ) : (
        <div className="overflow-x-auto border border-border rounded-2xl">
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
                  <td className="px-4 py-3">{l.start_date}</td>
                  <td className="px-4 py-3">{l.end_date ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatVND(l.monthly_rent)}</td>
                  <td className="px-4 py-3 text-right">{formatVND(l.deposit)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleStatus(l)}
                      className={`text-xs px-2.5 py-1 rounded-full border ${l.status === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-stone-100 text-stone-600 border-stone-200"}`}>
                      {l.status === "active" ? "Hiệu lực" : "Kết thúc"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(l.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-full hover:bg-destructive/10">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeaseForm({ ownerId, listings, tenants, onClose, onSaved }: { ownerId: string; listings: Listing[]; tenants: Tenant[]; onClose: () => void; onSaved: () => void }) {
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [rent, setRent] = useState(String(listings[0]?.price ?? ""));
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await insertLease({ data: {
        owner_id: ownerId, listing_id: listingId, tenant_id: tenantId,
        start_date: startDate, end_date: endDate || null,
        monthly_rent: Number(rent), deposit: Number(deposit) || 0, notes: notes || null,
      }});
      await updateListingStatus({ data: { id: listingId, status: "occupied" } });
      toast.success("Đã tạo hợp đồng");
      onSaved();
    } catch (e: any) { toast.error(e.message ?? "Lỗi"); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Thêm hợp đồng" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Phòng">
          <select value={listingId} onChange={(e) => { setListingId(e.target.value); const p = listings.find((x) => x.id === e.target.value)?.price; if (p) setRent(String(p)); }} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm">
            {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </Field>
        <Field label="Người thuê">
          <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm">
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày bắt đầu"><TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></Field>
          <Field label="Ngày kết thúc"><TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tiền thuê / tháng"><TextInput type="number" value={rent} onChange={(e) => setRent(e.target.value)} required /></Field>
          <Field label="Tiền cọc"><TextInput type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></Field>
        </div>
        <Field label="Ghi chú"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></Field>
        <div className="flex gap-3 pt-2">
          <SecondaryButton type="button" onClick={onClose} className="flex-1">Huỷ</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy} className="flex-1">{busy ? "Đang lưu..." : "Tạo hợp đồng"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
