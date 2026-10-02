import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { MessageCircle, Plus, Receipt, Trash2 } from "lucide-react-native";
import { createInvoice, deleteInvoice, setInvoicePaid } from "@/lib/api/dashboard";
import { confirm } from "@/lib/confirm";
import { formatDate, formatVND, today } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { buildInvoiceReminderDraft, type InvoiceReminderDraft } from "@/lib/invoice-reminder";
import {
  currentPeriod,
  type Invoice,
  type Lease,
  type Listing,
  type MeterReading,
  type Tenant,
} from "@/lib/dashboard-types";
import { toast } from "../Toast";
import {
  AccentButton,
  EmptyState,
  Field,
  IconButton,
  Muted,
  PrimaryButton,
  SecondaryButton,
  Select,
  Sheet,
  TextInput,
} from "../ui";
import { DateField } from "../DateField";
import { RecordCard, TabHeader } from "./ui";
import type { TabProps } from "./types";
import { colors, font, radius } from "@/theme";

export function InvoicesTab({ data, reload }: TabProps) {
  const { invoices, listings, tenants, leases, meters } = data;
  const [showForm, setShowForm] = useState(false);
  const [reminder, setReminder] = useState<ReminderDraft | null>(null);

  const markPaid = async (inv: Invoice) => {
    try {
      await setInvoicePaid(inv.id, inv.status !== "paid");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, "Không đổi được trạng thái"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Xoá hoá đơn này?"))) return;
    try {
      await deleteInvoice(id);
      toast.success("Đã xoá");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, "Không xoá được"));
    }
  };

  const room = (id: string) => listings.find((x) => x.id === id);
  const tenant = (id: string | null) => (id ? tenants.find((x) => x.id === id) : null);
  const openReminder = (inv: Invoice) => {
    const listing = room(inv.listing_id);
    const renter = tenant(inv.tenant_id);
    const draft = buildInvoiceReminderDraft({
      tenantName: renter?.full_name ?? null,
      roomTitle: listing?.title ?? "—",
      period: inv.period,
      totalAmount: inv.total_amount,
      dueDate: inv.due_date,
      overdue: Boolean(inv.due_date && inv.due_date < today()),
    });
    setReminder({
      phone: renter?.phone ?? null,
      draft,
    });
  };

  const totalUnpaid = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total_amount, 0);

  return (
    <View>
      <TabHeader
        title="Hoá đơn"
        subtitle={
          <Text style={styles.summary}>
            Chưa thu: <Text style={{ color: colors.destructive }}>{formatVND(totalUnpaid)}</Text> ·
            Đã thu: <Text style={{ color: colors.emerald.fg }}>{formatVND(totalPaid)}</Text>
          </Text>
        }
        action={
          <AccentButton
            label="Tạo"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            disabled={leases.length === 0}
            onPress={() => setShowForm(true)}
          />
        }
      />

      {invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt size={44} color={colors.tint400} />}
          title="Chưa có hoá đơn"
          description={
            leases.length === 0
              ? "Tạo hợp đồng trước khi xuất hoá đơn."
              : "Tạo hoá đơn đầu tiên cho người thuê."
          }
        />
      ) : (
        <View style={{ gap: 12 }}>
          {invoices.map((inv) => {
            const paid = inv.status === "paid";
            return (
              <RecordCard
                key={inv.id}
                title={room(inv.listing_id)?.title ?? "—"}
                subtitle={`Kỳ ${inv.period} · ${tenant(inv.tenant_id)?.full_name ?? "—"}`}
                badge={
                  <Pressable
                    onPress={() => void markPaid(inv)}
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: paid ? colors.emerald.bg : colors.amber.bg,
                        borderColor: paid ? colors.emerald.border : colors.amber.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: paid ? colors.emerald.fg : colors.amber.fg },
                      ]}
                    >
                      {paid ? "Đã thanh toán" : "Chưa thanh toán"}
                    </Text>
                  </Pressable>
                }
                rows={[
                  { label: "Tiền phòng", value: formatVND(inv.rent_amount) },
                  {
                    label: "Điện",
                    value: `${formatVND(inv.electricity_amount)} · ${inv.electricity_kwh} kWh`,
                  },
                  { label: "Nước", value: `${formatVND(inv.water_amount)} · ${inv.water_m3} m³` },
                  { label: "Phí khác", value: formatVND(inv.other_amount) },
                  { label: "Hạn thanh toán", value: formatDate(inv.due_date) },
                  {
                    label: "Tổng cộng",
                    value: <Text style={styles.total}>{formatVND(inv.total_amount)}</Text>,
                  },
                ]}
                actions={
                  <View style={styles.actionRow}>
                    {!paid ? (
                      <IconButton
                        accessibilityLabel="Soạn tin nhắc thanh toán"
                        onPress={() => openReminder(inv)}
                      >
                        <MessageCircle size={16} color={colors.primary} />
                      </IconButton>
                    ) : null}
                    <IconButton accessibilityLabel="Xoá" onPress={() => void handleDelete(inv.id)}>
                      <Trash2 size={16} color={colors.destructive} />
                    </IconButton>
                  </View>
                }
              />
            );
          })}
        </View>
      )}

      <InvoiceForm
        open={showForm}
        listings={listings}
        tenants={tenants}
        leases={leases}
        readings={meters}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await reload();
        }}
      />
      <ReminderSheet reminder={reminder} onClose={() => setReminder(null)} />
    </View>
  );
}

type ReminderDraft = {
  phone: string | null;
  draft: InvoiceReminderDraft;
};

function ReminderSheet({
  reminder,
  onClose,
}: {
  reminder: ReminderDraft | null;
  onClose: () => void;
}) {
  const sendSms = () => {
    if (!reminder?.phone) {
      toast.info("Người thuê chưa có số điện thoại.");
      return;
    }
    const url = `sms:${reminder.phone}?body=${encodeURIComponent(reminder.draft.message)}`;
    Linking.openURL(url).catch(() => toast.error("Không mở được ứng dụng nhắn tin."));
  };
  const tone =
    reminder?.draft.tone === "urgent"
      ? { bg: colors.tint100, fg: colors.destructive, border: colors.borderStrong }
      : colors.blue;

  return (
    <Sheet
      open={Boolean(reminder)}
      title="Tin nhắc thanh toán"
      onClose={onClose}
      footer={
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SecondaryButton label="Đóng" onPress={onClose} style={{ flex: 1 }} />
          <AccentButton
            label="Mở SMS"
            disabled={!reminder?.phone}
            onPress={sendSms}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <View style={[styles.reminderBox, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <Text style={[styles.reminderTitle, { color: tone.fg }]}>{reminder?.draft.title}</Text>
        <Text style={[styles.reminderText, { color: tone.fg }]}>{reminder?.draft.message}</Text>
        <View style={{ gap: 6 }}>
          {reminder?.draft.checklist.map((item) => (
            <Text key={item} style={[styles.reminderHint, { color: tone.fg }]}>
              • {item}
            </Text>
          ))}
        </View>
      </View>
      <Muted size={12}>
        Tin nhắn được soạn từ dữ liệu hoá đơn. Chủ trọ kiểm tra lại nội dung trước khi gửi.
      </Muted>
    </Sheet>
  );
}

function InvoiceForm({
  open,
  listings,
  tenants,
  leases,
  readings,
  onClose,
  onSaved,
}: {
  open: boolean;
  listings: Listing[];
  tenants: Tenant[];
  leases: Lease[];
  readings: MeterReading[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const activeLeases = leases.filter((l) => l.status === "active");
  const [leaseId, setLeaseId] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [otherAmount, setOtherAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLeaseId(leases.find((l) => l.status === "active")?.id ?? "");
    setPeriod(currentPeriod());
    setOtherAmount("0");
    setDueDate("");
    setNotes("");
  }, [open, leases]);

  const lease = leases.find((l) => l.id === leaseId);
  const listing = lease ? listings.find((x) => x.id === lease.listing_id) : null;
  const reading = lease
    ? readings.find((r) => r.listing_id === lease.listing_id && r.period === period)
    : null;

  const kwh = reading ? Math.max(0, reading.electricity_end - reading.electricity_start) : 0;
  const m3 = reading ? Math.max(0, reading.water_end - reading.water_start) : 0;
  const eAmt = kwh * (listing?.electricity_rate ?? 0);
  const wAmt = m3 * (listing?.water_rate ?? 0);
  const rentAmt = lease?.monthly_rent ?? 0;
  const total = rentAmt + eAmt + wAmt + (Number(otherAmount) || 0);

  const submit = async () => {
    if (!lease || !listing) {
      toast.error("Vui lòng chọn hợp đồng.");
      return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      toast.error("Kỳ phải có dạng YYYY-MM và tháng từ 01 đến 12.");
      return;
    }
    const otherValue = Number(otherAmount);
    if (!Number.isInteger(otherValue) || otherValue < 0) {
      toast.error("Phí khác phải là số nguyên không âm.");
      return;
    }
    setSaving(true);
    try {
      await createInvoice({
        lease_id: lease.id,
        listing_id: lease.listing_id,
        tenant_id: lease.tenant_id,
        period,
        rent_amount: rentAmt,
        electricity_kwh: kwh,
        electricity_amount: eAmt,
        water_m3: m3,
        water_amount: wAmt,
        other_amount: otherValue,
        total_amount: total,
        due_date: dueDate || null,
        notes: notes || null,
      });
      toast.success("Đã tạo hoá đơn");
      await onSaved();
    } catch (e) {
      // `(listing_id, period)` is unique — a second invoice for the same room
      // and month lands here rather than silently duplicating.
      toast.error(errorMessage(e, "Không tạo được hoá đơn"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      title="Tạo hoá đơn"
      onClose={onClose}
      footer={
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SecondaryButton label="Huỷ" onPress={onClose} style={{ flex: 1 }} />
          <PrimaryButton
            label={saving ? "Đang lưu…" : "Tạo hoá đơn"}
            disabled={saving}
            onPress={() => void submit()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <Field label="Hợp đồng">
        <Select
          title="Chọn hợp đồng"
          value={leaseId}
          onChange={setLeaseId}
          options={activeLeases.map((l) => {
            const ls = listings.find((x) => x.id === l.listing_id);
            const t = tenants.find((x) => x.id === l.tenant_id);
            return { label: `${ls?.title ?? "—"} — ${t?.full_name ?? "—"}`, value: l.id };
          })}
        />
      </Field>

      <Field label="Kỳ thanh toán (YYYY-MM)">
        <TextInput value={period} onChangeText={setPeriod} placeholder="2026-08" />
      </Field>

      {!reading ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Chưa có chỉ số điện nước cho phòng này kỳ {period}. Tiền điện/nước sẽ là 0. Vào tab
            &quot;Chỉ số&quot; để nhập trước.
          </Text>
        </View>
      ) : null}

      <View style={styles.breakdown}>
        <BreakdownRow label="Tiền phòng" value={formatVND(rentAmt)} />
        <BreakdownRow
          label={`Điện (${kwh} kWh × ${formatVND(listing?.electricity_rate ?? 0)})`}
          value={formatVND(eAmt)}
        />
        <BreakdownRow
          label={`Nước (${m3} m³ × ${formatVND(listing?.water_rate ?? 0)})`}
          value={formatVND(wAmt)}
        />
        <BreakdownRow label="Phí khác" value={formatVND(Number(otherAmount) || 0)} divided />
        <BreakdownRow label="Tổng cộng" value={formatVND(total)} strong divided />
      </View>

      <Field label="Phí khác (VNĐ)">
        <TextInput value={otherAmount} onChangeText={setOtherAmount} keyboardType="number-pad" />
      </Field>
      <Field label="Hạn thanh toán">
        <DateField value={dueDate} onChange={setDueDate} clearable />
      </Field>
      <Field label="Ghi chú">
        <TextInput value={notes} onChangeText={setNotes} multiline />
      </Field>
      <Muted size={11}>Mỗi phòng chỉ có một hoá đơn cho mỗi kỳ.</Muted>
    </Sheet>
  );
}

function BreakdownRow({
  label,
  value,
  strong,
  divided,
}: {
  label: string;
  value: string;
  strong?: boolean;
  divided?: boolean;
}) {
  return (
    <View style={[styles.breakdownRow, divided && styles.breakdownDivided]}>
      <Text style={[styles.breakdownLabel, strong && styles.breakdownStrong]}>{label}</Text>
      <Text
        style={[
          styles.breakdownValue,
          strong && styles.breakdownStrong,
          strong && { color: colors.primary },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { fontFamily: font.regular, fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 4 },

  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  total: { fontFamily: font.bold, fontSize: 14, color: colors.foreground },
  reminderBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  reminderTitle: {
    fontFamily: font.semibold,
    fontSize: 14,
  },
  reminderText: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 20,
  },
  reminderHint: { fontFamily: font.regular, fontSize: 12, lineHeight: 18 },

  warning: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.amber.border,
    backgroundColor: colors.amber.bg,
    padding: 12,
  },
  warningText: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: colors.amber.fg },

  breakdown: {
    borderRadius: radius["2xl"],
    backgroundColor: colors.tint50,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  breakdownDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 4,
    paddingTop: 10,
  },
  breakdownLabel: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  breakdownValue: { fontFamily: font.medium, fontSize: 13, color: colors.foreground },
  breakdownStrong: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
});
