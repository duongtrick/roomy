import { useEffect, useState } from "react";
import { getInvoices, insertInvoice, updateInvoiceStatus, deleteInvoice as deleteInvoiceFn } from "@/lib/api/invoices.api";
import { getListings } from "@/lib/api/listings.api";
import { getTenants } from "@/lib/api/tenants.api";
import { getLeases } from "@/lib/api/leases.api";
import { getMeterReadings } from "@/lib/api/meters.api";
import { toast } from "sonner";
import { Plus, Receipt, Trash2, Check } from "lucide-react";
import { formatVND } from "@/lib/rooms";
import {
  currentPeriod,
  type Invoice,
  type Lease,
  type Listing,
  type MeterReading,
  type Tenant,
} from "@/lib/dashboard-types";
import { EmptyState, Field, Modal, PrimaryButton, SecondaryButton, TextArea, TextInput } from "./ui";

export function InvoicesTab({ ownerId }: { ownerId: string }) {
  const [items, setItems] = useState<Invoice[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [i, ls, t, le, m] = await Promise.all([
      getInvoices({ data: { ownerId } }),
      getListings({ data: { ownerId } }),
      getTenants({ data: { ownerId } }),
      getLeases({ data: { ownerId } }),
      getMeterReadings({ data: { ownerId } }),
    ]);
    setItems((i ?? []) as unknown as Invoice[]);
    setListings((ls ?? []) as unknown as Listing[]);
    setTenants((t ?? []) as unknown as Tenant[]);
    setLeases((le ?? []) as unknown as Lease[]);
    setReadings((m ?? []) as unknown as MeterReading[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ownerId]);

  const markPaid = async (inv: Invoice) => {
    const paid = inv.status === "paid";
    try {
      await updateInvoiceStatus({
        data: {
          id: inv.id,
          status: paid ? "unpaid" : "paid",
          paid_at: paid ? null : new Date().toISOString(),
        },
      });
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Lỗi");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá hoá đơn này?")) return;
    try {
      await deleteInvoiceFn({ data: { id } });
      toast.success("Đã xoá");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Lỗi");
    }
  };

  const room = (id: string) => listings.find((x) => x.id === id);
  const tenant = (id: string | null) => (id ? tenants.find((x) => x.id === id) : null);

  const totalUnpaid = items.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = items.filter((i) => i.status === "paid").reduce((s, i) => s + i.total_amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif italic font-bold">Hoá đơn</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Chưa thu: <span className="text-destructive font-medium">{formatVND(totalUnpaid)}</span>
            {" · "}
            Đã thu: <span className="text-emerald-600 font-medium">{formatVND(totalPaid)}</span>
          </p>
        </div>
        <PrimaryButton onClick={() => setShowForm(true)} disabled={leases.length === 0}>
          <Plus className="size-4" /> Tạo hoá đơn
        </PrimaryButton>
      </div>

      {showForm && (
        <InvoiceForm
          ownerId={ownerId}
          listings={listings}
          tenants={tenants}
          leases={leases}
          readings={readings}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-12" />}
          title="Chưa có hoá đơn"
          description={leases.length === 0 ? "Tạo hợp đồng trước khi xuất hoá đơn." : "Tạo hoá đơn đầu tiên cho người thuê."}
        />
      ) : (
        <div className="overflow-x-auto border border-border rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Kỳ</th>
                <th className="px-4 py-3 text-left">Phòng</th>
                <th className="px-4 py-3 text-left">Người thuê</th>
                <th className="px-4 py-3 text-right">Tiền phòng</th>
                <th className="px-4 py-3 text-right">Điện</th>
                <th className="px-4 py-3 text-right">Nước</th>
                <th className="px-4 py-3 text-right">Khác</th>
                <th className="px-4 py-3 text-right">Tổng</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{inv.period}</td>
                  <td className="px-4 py-3">{room(inv.listing_id)?.title ?? "—"}</td>
                  <td className="px-4 py-3">{tenant(inv.tenant_id)?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{formatVND(inv.rent_amount)}</td>
                  <td className="px-4 py-3 text-right">{formatVND(inv.electricity_amount)}<div className="text-[10px] text-muted-foreground">{inv.electricity_kwh} kWh</div></td>
                  <td className="px-4 py-3 text-right">{formatVND(inv.water_amount)}<div className="text-[10px] text-muted-foreground">{inv.water_m3} m³</div></td>
                  <td className="px-4 py-3 text-right">{formatVND(inv.other_amount)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatVND(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => markPaid(inv)}
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        inv.status === "paid"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                      }`}
                    >
                      {inv.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(inv.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-full hover:bg-destructive/10">
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

function InvoiceForm({
  ownerId, listings, tenants, leases, readings, onClose, onSaved,
}: {
  ownerId: string;
  listings: Listing[];
  tenants: Tenant[];
  leases: Lease[];
  readings: MeterReading[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const activeLeases = leases.filter((l) => l.status === "active");
  const [leaseId, setLeaseId] = useState(activeLeases[0]?.id ?? "");
  const [period, setPeriod] = useState(currentPeriod());
  const [otherAmount, setOtherAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const lease = leases.find((l) => l.id === leaseId);
  const listing = lease ? listings.find((x) => x.id === lease.listing_id) : null;
  const reading = lease ? readings.find((r) => r.listing_id === lease.listing_id && r.period === period) : null;

  const kwh = reading ? Math.max(0, reading.electricity_end - reading.electricity_start) : 0;
  const m3 = reading ? Math.max(0, reading.water_end - reading.water_start) : 0;
  const eAmt = kwh * (listing?.electricity_rate ?? 0);
  const wAmt = m3 * (listing?.water_rate ?? 0);
  const rentAmt = lease?.monthly_rent ?? 0;
  const total = rentAmt + eAmt + wAmt + (Number(otherAmount) || 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lease || !listing) return;
    setBusy(true);
    try {
      await insertInvoice({
        data: {
          owner_id: ownerId,
          lease_id: lease.id,
          listing_id: lease.listing_id,
          tenant_id: lease.tenant_id,
          period,
          rent_amount: rentAmt,
          electricity_kwh: kwh,
          electricity_amount: eAmt,
          water_m3: m3,
          water_amount: wAmt,
          other_amount: Number(otherAmount) || 0,
          total_amount: total,
          due_date: dueDate || null,
          notes: notes || null,
        },
      });
      toast.success("Đã tạo hoá đơn");
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Tạo hoá đơn" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Hợp đồng">
          <select value={leaseId} onChange={(e) => setLeaseId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm">
            {activeLeases.map((l) => {
              const ls = listings.find((x) => x.id === l.listing_id);
              const t = tenants.find((x) => x.id === l.tenant_id);
              return <option key={l.id} value={l.id}>{ls?.title} — {t?.full_name}</option>;
            })}
          </select>
        </Field>
        <Field label="Kỳ thanh toán (YYYY-MM)">
          <TextInput value={period} onChange={(e) => setPeriod(e.target.value)} required />
        </Field>
        {!reading && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Chưa có chỉ số điện nước cho phòng này kỳ {period}. Tiền điện/nước sẽ là 0. Vào tab "Chỉ số" để nhập trước.
          </p>
        )}
        <div className="bg-foreground/5 rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>Tiền phòng</span><span className="font-medium">{formatVND(rentAmt)}</span></div>
          <div className="flex justify-between"><span>Điện ({kwh} kWh × {formatVND(listing?.electricity_rate ?? 0)})</span><span className="font-medium">{formatVND(eAmt)}</span></div>
          <div className="flex justify-between"><span>Nước ({m3} m³ × {formatVND(listing?.water_rate ?? 0)})</span><span className="font-medium">{formatVND(wAmt)}</span></div>
          <div className="flex justify-between pt-2 border-t border-border"><span>Phí khác</span><span className="font-medium">{formatVND(Number(otherAmount) || 0)}</span></div>
          <div className="flex justify-between pt-2 border-t border-border text-base"><span className="font-bold">Tổng cộng</span><span className="font-bold text-primary">{formatVND(total)}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phí khác"><TextInput type="number" value={otherAmount} onChange={(e) => setOtherAmount(e.target.value)} /></Field>
          <Field label="Hạn thanh toán"><TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        </div>
        <Field label="Ghi chú"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></Field>
        <div className="flex gap-3 pt-2">
          <SecondaryButton type="button" onClick={onClose} className="flex-1">Huỷ</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy || !lease} className="flex-1">{busy ? "Đang tạo..." : "Tạo hoá đơn"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
