import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Zap, Droplet } from "lucide-react";
import { formatVND } from "@/lib/rooms";
import { currentPeriod, type Listing, type MeterReading } from "@/lib/dashboard-types";
import { EmptyState, Field, Modal, PrimaryButton, SecondaryButton, TextInput } from "./ui";

export function MetersTab({ ownerId }: { ownerId: string }) {
  const [items, setItems] = useState<MeterReading[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [m, ls] = await Promise.all([
      supabase.from("meter_readings").select("*").eq("owner_id", ownerId).order("period", { ascending: false }),
      supabase.from("listings").select("*").eq("owner_id", ownerId),
    ]);
    setItems((m.data ?? []) as unknown as MeterReading[]);
    setListings((ls.data ?? []) as unknown as Listing[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ownerId]);

  const listing = (id: string) => listings.find((x) => x.id === id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif italic font-bold">Chỉ số điện nước</h2>
          <p className="text-sm text-muted-foreground mt-1">Ghi nhận chỉ số đầu/cuối kỳ theo tháng</p>
        </div>
        <PrimaryButton onClick={() => setShowForm(true)} disabled={listings.length === 0}>
          <Plus className="size-4" /> Ghi chỉ số
        </PrimaryButton>
      </div>

      {showForm && (
        <MeterForm
          ownerId={ownerId}
          listings={listings}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Zap className="size-12" />}
          title="Chưa ghi chỉ số nào"
          description="Ghi chỉ số điện nước đầu/cuối kỳ để tự động tính hoá đơn."
        />
      ) : (
        <div className="overflow-x-auto border border-border rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Kỳ</th>
                <th className="px-4 py-3 text-left">Phòng</th>
                <th className="px-4 py-3 text-right">Điện (kWh)</th>
                <th className="px-4 py-3 text-right">Tiền điện</th>
                <th className="px-4 py-3 text-right">Nước (m³)</th>
                <th className="px-4 py-3 text-right">Tiền nước</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => {
                const r = listing(m.listing_id);
                const kwh = Math.max(0, m.electricity_end - m.electricity_start);
                const m3 = Math.max(0, m.water_end - m.water_start);
                const eAmt = kwh * (r?.electricity_rate ?? 0);
                const wAmt = m3 * (r?.water_rate ?? 0);
                return (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{m.period}</td>
                    <td className="px-4 py-3">{r?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{kwh}</td>
                    <td className="px-4 py-3 text-right">{formatVND(eAmt)}</td>
                    <td className="px-4 py-3 text-right">{m3}</td>
                    <td className="px-4 py-3 text-right">{formatVND(wAmt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MeterForm({
  ownerId, listings, onClose, onSaved,
}: { ownerId: string; listings: Listing[]; onClose: () => void; onSaved: () => void }) {
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [period, setPeriod] = useState(currentPeriod());
  const [eStart, setEStart] = useState("");
  const [eEnd, setEEnd] = useState("");
  const [wStart, setWStart] = useState("");
  const [wEnd, setWEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("meter_readings").upsert({
      owner_id: ownerId,
      listing_id: listingId,
      period,
      electricity_start: Number(eStart) || 0,
      electricity_end: Number(eEnd) || 0,
      water_start: Number(wStart) || 0,
      water_end: Number(wEnd) || 0,
    }, { onConflict: "listing_id,period" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Đã lưu chỉ số");
    onSaved();
  };

  return (
    <Modal title="Ghi chỉ số điện nước" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Phòng">
          <select value={listingId} onChange={(e) => setListingId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm">
            {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </Field>
        <Field label="Kỳ (YYYY-MM)">
          <TextInput value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-06" required />
        </Field>
        <div className="border border-border rounded-2xl p-4">
          <p className="text-sm font-medium mb-3 flex items-center gap-2"><Zap className="size-4 text-amber-500" /> Điện (kWh)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chỉ số đầu"><TextInput type="number" value={eStart} onChange={(e) => setEStart(e.target.value)} /></Field>
            <Field label="Chỉ số cuối"><TextInput type="number" value={eEnd} onChange={(e) => setEEnd(e.target.value)} /></Field>
          </div>
        </div>
        <div className="border border-border rounded-2xl p-4">
          <p className="text-sm font-medium mb-3 flex items-center gap-2"><Droplet className="size-4 text-blue-500" /> Nước (m³)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chỉ số đầu"><TextInput type="number" value={wStart} onChange={(e) => setWStart(e.target.value)} /></Field>
            <Field label="Chỉ số cuối"><TextInput type="number" value={wEnd} onChange={(e) => setWEnd(e.target.value)} /></Field>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <SecondaryButton type="button" onClick={onClose} className="flex-1">Huỷ</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy} className="flex-1">{busy ? "Đang lưu..." : "Lưu chỉ số"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
