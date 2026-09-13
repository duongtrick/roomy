import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Droplet, Plus, Zap } from "lucide-react-native";
import { saveMeterReading } from "@/lib/api/dashboard";
import { currentPeriod, type Listing } from "@/lib/dashboard-types";
import { formatVND } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { toast } from "../Toast";
import {
  AccentButton,
  EmptyState,
  Field,
  PrimaryButton,
  SecondaryButton,
  Select,
  Sheet,
  TextInput,
} from "../ui";
import { RecordCard, TabHeader } from "./ui";
import type { TabProps } from "./types";
import { colors, font, radius } from "@/theme";

export function MetersTab({ data, reload }: TabProps) {
  const { meters, listings } = data;
  const [showForm, setShowForm] = useState(false);

  const listing = (id: string) => listings.find((x) => x.id === id);

  return (
    <View>
      <TabHeader
        title="Chỉ số điện nước"
        subtitle="Ghi nhận chỉ số đầu/cuối kỳ theo tháng"
        action={
          <AccentButton
            label="Ghi"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            disabled={listings.length === 0}
            onPress={() => setShowForm(true)}
          />
        }
      />

      {meters.length === 0 ? (
        <EmptyState
          icon={<Zap size={44} color={colors.tint400} />}
          title="Chưa ghi chỉ số nào"
          description="Ghi chỉ số điện nước đầu/cuối kỳ để tự động tính hoá đơn."
        />
      ) : (
        <View style={{ gap: 12 }}>
          {meters.map((m) => {
            const r = listing(m.listing_id);
            const kwh = Math.max(0, m.electricity_end - m.electricity_start);
            const m3 = Math.max(0, m.water_end - m.water_start);
            const eAmt = kwh * (r?.electricity_rate ?? 0);
            const wAmt = m3 * (r?.water_rate ?? 0);
            return (
              <RecordCard
                key={m.id}
                title={r?.title ?? "—"}
                subtitle={`Kỳ ${m.period}`}
                rows={[
                  {
                    label: "Điện",
                    value: (
                      <View style={styles.usage}>
                        <Zap size={12} color={colors.power} />
                        <Text style={styles.usageText}>
                          {kwh} kWh · {formatVND(eAmt)}
                        </Text>
                      </View>
                    ),
                  },
                  {
                    label: "Nước",
                    value: (
                      <View style={styles.usage}>
                        <Droplet size={12} color={colors.water} />
                        <Text style={styles.usageText}>
                          {m3} m³ · {formatVND(wAmt)}
                        </Text>
                      </View>
                    ),
                  },
                  {
                    label: "Chỉ số điện",
                    value: `${m.electricity_start} → ${m.electricity_end}`,
                  },
                  { label: "Chỉ số nước", value: `${m.water_start} → ${m.water_end}` },
                ]}
              />
            );
          })}
        </View>
      )}

      <MeterForm
        open={showForm}
        listings={listings}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await reload();
        }}
      />
    </View>
  );
}

function MeterForm({
  open,
  listings,
  onClose,
  onSaved,
}: {
  open: boolean;
  listings: Listing[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [listingId, setListingId] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [eStart, setEStart] = useState("");
  const [eEnd, setEEnd] = useState("");
  const [wStart, setWStart] = useState("");
  const [wEnd, setWEnd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setListingId(listings[0]?.id ?? "");
    setPeriod(currentPeriod());
    setEStart("");
    setEEnd("");
    setWStart("");
    setWEnd("");
  }, [open, listings]);

  const submit = async () => {
    if (!listingId) {
      toast.error("Vui lòng chọn phòng.");
      return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      toast.error("Kỳ phải có dạng YYYY-MM và tháng từ 01 đến 12.");
      return;
    }
    if ([eStart, eEnd, wStart, wEnd].some((value) => !value.trim())) {
      toast.error("Vui lòng nhập đủ bốn chỉ số điện nước.");
      return;
    }
    const values = [eStart, eEnd, wStart, wEnd].map(Number);
    if (
      values.some((value) => !Number.isInteger(value) || value < 0) ||
      values[1] < values[0] ||
      values[3] < values[2]
    ) {
      toast.error("Chỉ số phải là số nguyên không âm và chỉ số cuối không nhỏ hơn đầu.");
      return;
    }
    setSaving(true);
    try {
      await saveMeterReading({
        listing_id: listingId,
        period,
        electricity_start: values[0],
        electricity_end: values[1],
        water_start: values[2],
        water_end: values[3],
      });
      toast.success("Đã lưu chỉ số");
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e, "Không lưu được chỉ số"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      title="Ghi chỉ số điện nước"
      onClose={onClose}
      footer={
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SecondaryButton label="Huỷ" onPress={onClose} style={{ flex: 1 }} />
          <PrimaryButton
            label={saving ? "Đang lưu…" : "Lưu chỉ số"}
            disabled={saving}
            onPress={() => void submit()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <Field label="Phòng">
        <Select
          title="Chọn phòng"
          value={listingId}
          onChange={setListingId}
          options={listings.map((l) => ({ label: l.title, value: l.id }))}
        />
      </Field>
      <Field label="Kỳ (YYYY-MM)" hint="Ví dụ: 2026-08">
        <TextInput value={period} onChangeText={setPeriod} placeholder="2026-08" />
      </Field>

      <View style={styles.group}>
        <View style={styles.groupHead}>
          <Zap size={15} color={colors.power} />
          <Text style={styles.groupTitle}>Điện (kWh)</Text>
        </View>
        <View style={styles.groupRow}>
          <View style={{ flex: 1 }}>
            <Field label="Chỉ số đầu">
              <TextInput value={eStart} onChangeText={setEStart} keyboardType="number-pad" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Chỉ số cuối">
              <TextInput value={eEnd} onChangeText={setEEnd} keyboardType="number-pad" />
            </Field>
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.groupHead}>
          <Droplet size={15} color={colors.water} />
          <Text style={styles.groupTitle}>Nước (m³)</Text>
        </View>
        <View style={styles.groupRow}>
          <View style={{ flex: 1 }}>
            <Field label="Chỉ số đầu">
              <TextInput value={wStart} onChangeText={setWStart} keyboardType="number-pad" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Chỉ số cuối">
              <TextInput value={wEnd} onChangeText={setWEnd} keyboardType="number-pad" />
            </Field>
          </View>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  usage: { flexDirection: "row", alignItems: "center", gap: 5 },
  usageText: { fontFamily: font.medium, fontSize: 13, color: colors.foreground, flexShrink: 1 },

  group: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius["2xl"],
    padding: 14,
    gap: 12,
  },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  groupRow: { flexDirection: "row", gap: 12 },
});
