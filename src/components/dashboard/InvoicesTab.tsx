import { useState } from "react";
import {
  getInvoices,
  insertInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} from "@/lib/api/invoices.api";
import { getListings } from "@/lib/api/listings.api";
import { getTenants } from "@/lib/api/tenants.api";
import { getLeases } from "@/lib/api/leases.api";
import { getMeterReadings } from "@/lib/api/meters.api";
import { toast } from "sonner";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { formatDate, formatVNDExact } from "@/lib/format";
import {
  currentPeriod,
  type Invoice,
  type Lease,
  type Listing,
  type MeterReading,
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
  RecordCard,
  SecondaryButton,
  Select,
  TabHeader,
  TextArea,
  TextInput,
} from "./ui";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type InvoicesData = {
  invoices: Invoice[];
  listings: Listing[];
  tenants: Tenant[];
  leases: Lease[];
  readings: MeterReading[];
};

const EMPTY: InvoicesData = { invoices: [], listings: [], tenants: [], leases: [], readings: [] };

async function fetchInvoices(ownerId: string): Promise<InvoicesData> {
  const [invoices, listings, tenants, leases, readings] = await Promise.all([
    getInvoices({ data: { ownerId } }),
    getListings({ data: { ownerId } }),
    getTenants({ data: { ownerId } }),
    getLeases({ data: { ownerId } }),
    getMeterReadings({ data: { ownerId } }),
  ]);
  return { invoices, listings, tenants, leases, readings };
}

function StatusPill({ paid, onClick }: { paid: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 text-[11px] font-medium px-3 h-8 rounded-full border active:scale-95 transition ${
        paid
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-amber-100 text-amber-700 border-amber-200"
      }`}
    >
      {paid ? "Đã thanh toán" : "Chưa thu"}
    </button>
  );
}

export function InvoicesTab({ ownerId }: { ownerId: string }) {
  const { data, loading, reload } = useOwnerData(ownerId, fetchInvoices, EMPTY);
  const { invoices, listings, tenants, leases, readings } = data;
  const [showForm, setShowForm] = useState(false);

  const togglePaid = async (inv: Invoice) => {
    const paid = inv.status === "paid";
    try {
      const res = await updateInvoiceStatus({
        data: {
          id: inv.id,
          owner_id: ownerId,
          status: paid ? "unpaid" : "paid",
          paid_at: paid ? null : new Date().toISOString(),
        },
      });
      if (!res.ok) throw new Error("Không tìm thấy hoá đơn");
      void reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá hoá đơn này?")) return;
    try {
      const res = await deleteInvoice({ data: { id, owner_id: ownerId } });
      if (!res.ok) throw new Error("Không tìm thấy hoá đơn");
      toast.success("Đã xoá");
      void reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const room = (id: string) => listings.find((x) => x.id === id);
  const tenant = (id: string | null) => (id ? tenants.find((x) => x.id === id) : undefined);

  const totalUnpaid = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total_amount, 0);
  const hasActiveLease = leases.some((l) => l.status === "active");

  return (
    <div>
      <TabHeader
        title="Hoá đơn"
        action={
          <PrimaryButton
            onClick={() => setShowForm(true)}
            disabled={!hasActiveLease}
            aria-label="Tạo hoá đơn"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Tạo hoá đơn</span>
          </PrimaryButton>
        }
      />

      {/* Money summary as its own pair of tiles — on a phone this reads far
          better than a run-on sentence under the heading. */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="border border-border rounded-2xl p-3 sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Chưa thu</p>
          <p className="text-base sm:text-lg font-bold text-destructive mt-1 tabular-nums">
            {formatVNDExact(totalUnpaid)}
          </p>
        </div>
        <div className="border border-border rounded-2xl p-3 sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Đã thu</p>
          <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1 tabular-nums">
            {formatVNDExact(totalPaid)}
          </p>
        </div>
      </div>

      {showForm && hasActiveLease && (
        <InvoiceForm
          ownerId={ownerId}
          listings={listings}
          tenants={tenants}
          leases={leases}
          readings={readings}
          existing={invoices}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void reload();
          }}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-12" />}
          title="Chưa có hoá đơn"
          description={
            hasActiveLease
              ? "Tạo hoá đơn đầu tiên cho người thuê."
              : "Tạo hợp đồng trước khi xuất hoá đơn."
          }
        />
      ) : (
        <>
          {/* Phones/tablets: one card per invoice */}
          <ul className="space-y-3 lg:hidden">
            {invoices.map((inv) => (
              <RecordCard
                key={inv.id}
                title={room(inv.listing_id)?.title ?? "—"}
                subtitle={`Kỳ ${inv.period}${inv.due_date ? ` · Hạn ${formatDate(inv.due_date)}` : ""}`}
                badge={<StatusPill paid={inv.status === "paid"} onClick={() => togglePaid(inv)} />}
                rows={[
                  { label: "Người thuê", value: tenant(inv.tenant_id)?.full_name ?? "—" },
                  { label: "Tiền phòng", value: formatVNDExact(inv.rent_amount) },
                  {
                    label: `Điện · ${inv.electricity_kwh} kWh`,
                    value: formatVNDExact(inv.electricity_amount),
                  },
                  { label: `Nước · ${inv.water_m3} m³`, value: formatVNDExact(inv.water_amount) },
                  ...(inv.other_amount
                    ? [{ label: "Phí khác", value: formatVNDExact(inv.other_amount) }]
                    : []),
                ]}
                actions={
                  <>
                    <span className="mr-auto text-xs text-muted-foreground">Tổng cộng</span>
                    <span className="font-bold tabular-nums">
                      {formatVNDExact(inv.total_amount)}
                    </span>
                    <IconButton
                      onClick={() => handleDelete(inv.id)}
                      aria-label="Xoá hoá đơn"
                      className="hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </>
                }
              />
            ))}
          </ul>

          {/* Desktop: full table */}
          <div className="hidden lg:block overflow-x-auto border border-border rounded-2xl">
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
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      {inv.period}
                      {inv.due_date && (
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Hạn {formatDate(inv.due_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{room(inv.listing_id)?.title ?? "—"}</td>
                    <td className="px-4 py-3">{tenant(inv.tenant_id)?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatVNDExact(inv.rent_amount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatVNDExact(inv.electricity_amount)}
                      <div className="text-[10px] text-muted-foreground">
                        {inv.electricity_kwh} kWh
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatVNDExact(inv.water_amount)}
                      <div className="text-[10px] text-muted-foreground">{inv.water_m3} m³</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatVNDExact(inv.other_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      {formatVNDExact(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill paid={inv.status === "paid"} onClick={() => togglePaid(inv)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <IconButton
                        onClick={() => handleDelete(inv.id)}
                        aria-label="Xoá hoá đơn"
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

function InvoiceForm({
  ownerId,
  listings,
  tenants,
  leases,
  readings,
  existing,
  onClose,
  onSaved,
}: {
  ownerId: string;
  listings: Listing[];
  tenants: Tenant[];
  leases: Lease[];
  readings: MeterReading[];
  existing: Invoice[];
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

  const lease = leases.find((l) => l.id === leaseId) ?? null;
  const listing = lease ? (listings.find((x) => x.id === lease.listing_id) ?? null) : null;
  const reading = lease
    ? (readings.find((r) => r.listing_id === lease.listing_id && r.period === period) ?? null)
    : null;

  const kwh = reading ? Math.max(0, reading.electricity_end - reading.electricity_start) : 0;
  const m3 = reading ? Math.max(0, reading.water_end - reading.water_start) : 0;
  const eAmt = kwh * (listing?.electricity_rate ?? 0);
  const wAmt = m3 * (listing?.water_rate ?? 0);
  const rentAmt = lease?.monthly_rent ?? 0;
  const other = Number(otherAmount) || 0;
  const total = rentAmt + eAmt + wAmt + other;

  // Surfaced before submit so the landlord isn't stopped by a server rejection.
  const duplicate = lease
    ? existing.some((i) => i.listing_id === lease.listing_id && i.period === period)
    : false;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !lease || !listing || duplicate) return;
    if (!PERIOD_RE.test(period)) {
      toast.error("Kỳ phải có dạng YYYY-MM, ví dụ 2026-08.");
      return;
    }
    setBusy(true);
    try {
      const res = await insertInvoice({
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
          other_amount: other,
          total_amount: total,
          due_date: dueDate || null,
          notes: notes.trim() || null,
        },
      });
      if (res.error) throw new Error(res.error);
      toast.success("Đã tạo hoá đơn");
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Tạo hoá đơn"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <SecondaryButton onClick={onClose} className="flex-1">
            Huỷ
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            form="invoice-form"
            disabled={busy || !lease || duplicate}
            className="flex-1"
          >
            {busy ? "Đang tạo..." : "Tạo hoá đơn"}
          </PrimaryButton>
        </div>
      }
    >
      <form id="invoice-form" onSubmit={submit} className="space-y-4">
        <Field label="Hợp đồng">
          <Select value={leaseId} onChange={(e) => setLeaseId(e.target.value)}>
            {activeLeases.map((l) => {
              const ls = listings.find((x) => x.id === l.listing_id);
              const t = tenants.find((x) => x.id === l.tenant_id);
              return (
                <option key={l.id} value={l.id}>
                  {ls?.title ?? "—"} — {t?.full_name ?? "—"}
                </option>
              );
            })}
          </Select>
        </Field>
        <Field label="Kỳ thanh toán" hint="Định dạng YYYY-MM, ví dụ 2026-08">
          <TextInput
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            inputMode="numeric"
            required
          />
        </Field>

        {duplicate && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            Đã có hoá đơn kỳ {period} cho phòng này. Chọn kỳ khác hoặc xoá hoá đơn cũ trước.
          </p>
        )}
        {!reading && !duplicate && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Chưa có chỉ số điện nước cho phòng này kỳ {period}. Tiền điện/nước sẽ là 0. Vào tab "Chỉ
            số" để nhập trước.
          </p>
        )}

        <div className="bg-foreground/5 rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Tiền phòng</span>
            <span className="font-medium tabular-nums">{formatVNDExact(rentAmt)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground min-w-0">
              Điện · {kwh} kWh × {formatVNDExact(listing?.electricity_rate ?? 0)}
            </span>
            <span className="font-medium tabular-nums shrink-0">{formatVNDExact(eAmt)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground min-w-0">
              Nước · {m3} m³ × {formatVNDExact(listing?.water_rate ?? 0)}
            </span>
            <span className="font-medium tabular-nums shrink-0">{formatVNDExact(wAmt)}</span>
          </div>
          <div className="flex justify-between gap-3 pt-2 border-t border-border">
            <span className="text-muted-foreground">Phí khác</span>
            <span className="font-medium tabular-nums">{formatVNDExact(other)}</span>
          </div>
          <div className="flex justify-between gap-3 pt-2 border-t border-border text-base">
            <span className="font-bold">Tổng cộng</span>
            <span className="font-bold text-primary tabular-nums">{formatVNDExact(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phí khác">
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              value={otherAmount}
              onChange={(e) => setOtherAmount(e.target.value)}
            />
          </Field>
          <Field label="Hạn thanh toán">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Ghi chú">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
      </form>
    </Modal>
  );
}
