import { useState } from "react";
import { getMeterReadings, upsertMeterReading } from "@/lib/api/meters.api";
import { getListings } from "@/lib/api/listings.api";
import { toast } from "sonner";
import { Plus, Zap, Droplet } from "lucide-react";
import { formatVNDExact } from "@/lib/format";
import { currentPeriod, type Listing, type MeterReading } from "@/lib/dashboard-types";
import { useOwnerData } from "@/hooks/use-owner-data";
import { errorMessage } from "@/lib/errors";
import {
  EmptyState,
  Field,
  Modal,
  PrimaryButton,
  RecordCard,
  SecondaryButton,
  Select,
  TabHeader,
  TextInput,
} from "./ui";

/** Billing periods are `YYYY-MM`; anything else silently breaks invoice matching. */
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type MetersData = { readings: MeterReading[]; listings: Listing[] };

const EMPTY: MetersData = { readings: [], listings: [] };

async function fetchMeters(ownerId: string): Promise<MetersData> {
  const [readings, listings] = await Promise.all([
    getMeterReadings({ data: { ownerId } }),
    getListings({ data: { ownerId } }),
  ]);
  return { readings, listings };
}

export function MetersTab({ ownerId }: { ownerId: string }) {
  const { data, loading, reload } = useOwnerData(ownerId, fetchMeters, EMPTY);
  const { readings, listings } = data;
  const [showForm, setShowForm] = useState(false);

  const listing = (id: string) => listings.find((x) => x.id === id);

  return (
    <div>
      <TabHeader
        title="Chỉ số điện nước"
        subtitle="Ghi nhận chỉ số đầu/cuối kỳ theo tháng"
        action={
          <PrimaryButton
            onClick={() => setShowForm(true)}
            disabled={listings.length === 0}
            aria-label="Ghi chỉ số"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Ghi chỉ số</span>
          </PrimaryButton>
        }
      />

      {showForm && listings.length > 0 && (
        <MeterForm
          ownerId={ownerId}
          listings={listings}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void reload();
          }}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : readings.length === 0 ? (
        <EmptyState
          icon={<Zap className="size-12" />}
          title="Chưa ghi chỉ số nào"
          description="Ghi chỉ số điện nước đầu/cuối kỳ để tự động tính hoá đơn."
        />
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {readings.map((m) => {
              const r = listing(m.listing_id);
              const kwh = Math.max(0, m.electricity_end - m.electricity_start);
              const m3 = Math.max(0, m.water_end - m.water_start);
              return (
                <RecordCard
                  key={m.id}
                  title={r?.title ?? "—"}
                  subtitle={`Kỳ ${m.period}`}
                  rows={[
                    {
                      label: "Điện",
                      value: (
                        <span className="inline-flex items-center gap-1.5">
                          <Zap className="size-3.5 text-amber-500 shrink-0" />
                          {kwh} kWh
                        </span>
                      ),
                    },
                    {
                      label: "Tiền điện",
                      value: formatVNDExact(kwh * (r?.electricity_rate ?? 0)),
                    },
                    {
                      label: "Nước",
                      value: (
                        <span className="inline-flex items-center gap-1.5">
                          <Droplet className="size-3.5 text-blue-500 shrink-0" />
                          {m3} m³
                        </span>
                      ),
                    },
                    { label: "Tiền nước", value: formatVNDExact(m3 * (r?.water_rate ?? 0)) },
                  ]}
                />
              );
            })}
          </ul>

          <div className="hidden lg:block overflow-x-auto border border-border rounded-2xl">
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
                {readings.map((m) => {
                  const r = listing(m.listing_id);
                  const kwh = Math.max(0, m.electricity_end - m.electricity_start);
                  const m3 = Math.max(0, m.water_end - m.water_start);
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{m.period}</td>
                      <td className="px-4 py-3">{r?.title ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{kwh}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatVNDExact(kwh * (r?.electricity_rate ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{m3}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatVNDExact(m3 * (r?.water_rate ?? 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function MeterForm({
  ownerId,
  listings,
  onClose,
  onSaved,
}: {
  ownerId: string;
  listings: Listing[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [period, setPeriod] = useState(currentPeriod());
  const [eStart, setEStart] = useState("");
  const [eEnd, setEEnd] = useState("");
  const [wStart, setWStart] = useState("");
  const [wEnd, setWEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!PERIOD_RE.test(period)) {
      toast.error("Kỳ phải có dạng YYYY-MM, ví dụ 2026-08.");
      return;
    }
    if (Number(eEnd) < Number(eStart) || Number(wEnd) < Number(wStart)) {
      toast.error("Chỉ số cuối kỳ không được nhỏ hơn chỉ số đầu kỳ.");
      return;
    }
    setBusy(true);
    try {
      const res = await upsertMeterReading({
        data: {
          owner_id: ownerId,
          listing_id: listingId,
          period,
          electricity_start: Number(eStart) || 0,
          electricity_end: Number(eEnd) || 0,
          water_start: Number(wStart) || 0,
          water_end: Number(wEnd) || 0,
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Không lưu được chỉ số");
      toast.success("Đã lưu chỉ số");
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Ghi chỉ số điện nước"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <SecondaryButton onClick={onClose} className="flex-1">
            Huỷ
          </SecondaryButton>
          <PrimaryButton type="submit" form="meter-form" disabled={busy} className="flex-1">
            {busy ? "Đang lưu..." : "Lưu chỉ số"}
          </PrimaryButton>
        </div>
      }
    >
      <form id="meter-form" onSubmit={submit} className="space-y-4">
        <Field label="Phòng">
          <Select value={listingId} onChange={(e) => setListingId(e.target.value)}>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kỳ" hint="Định dạng YYYY-MM, ví dụ 2026-08">
          <TextInput
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            inputMode="numeric"
            placeholder="2026-06"
            required
          />
        </Field>

        <div className="border border-border rounded-2xl p-4">
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Zap className="size-4 text-amber-500" /> Điện (kWh)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chỉ số đầu">
              <TextInput
                type="number"
                inputMode="numeric"
                min={0}
                value={eStart}
                onChange={(e) => setEStart(e.target.value)}
              />
            </Field>
            <Field label="Chỉ số cuối">
              <TextInput
                type="number"
                inputMode="numeric"
                min={0}
                value={eEnd}
                onChange={(e) => setEEnd(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="border border-border rounded-2xl p-4">
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Droplet className="size-4 text-blue-500" /> Nước (m³)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chỉ số đầu">
              <TextInput
                type="number"
                inputMode="numeric"
                min={0}
                value={wStart}
                onChange={(e) => setWStart(e.target.value)}
              />
            </Field>
            <Field label="Chỉ số cuối">
              <TextInput
                type="number"
                inputMode="numeric"
                min={0}
                value={wEnd}
                onChange={(e) => setWEnd(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
}
