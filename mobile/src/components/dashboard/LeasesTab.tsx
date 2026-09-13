import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FileText, Plus, Trash2 } from "lucide-react-native";
import { createLease, deleteLease, updateLeaseStatus } from "@/lib/api/dashboard";
import { confirm } from "@/lib/confirm";
import { formatDate, formatVND, today } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import type { Lease, Listing, Tenant } from "@/lib/dashboard-types";
import { toast } from "../Toast";
import {
  AccentButton,
  EmptyState,
  Field,
  IconButton,
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

export function LeasesTab({ data, reload }: TabProps) {
  const { leases, listings, tenants } = data;
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (id: string) => {
    if (!(await confirm("Xoá hợp đồng này?"))) return;
    try {
      await deleteLease(id);
      toast.success("Đã xoá");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, "Không xoá được"));
    }
  };

  const toggleStatus = async (lease: Lease) => {
    try {
      await updateLeaseStatus(lease.id, lease.status === "active" ? "ended" : "active");
      await reload();
    } catch (e) {
      // A second live contract on the same room trips the unique index.
      toast.error(errorMessage(e, "Không đổi được trạng thái"));
    }
  };

  const roomTitle = (id: string) => listings.find((x) => x.id === id)?.title ?? "—";
  const tenantName = (id: string) => tenants.find((x) => x.id === id)?.full_name ?? "—";
  const blocked = listings.length === 0 || tenants.length === 0;

  return (
    <View>
      <TabHeader
        title="Hợp đồng thuê"
        subtitle={`Tổng ${leases.length} hợp đồng`}
        action={
          <AccentButton
            label="Thêm"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            disabled={blocked}
            onPress={() => setShowForm(true)}
          />
        }
      />

      {leases.length === 0 ? (
        <EmptyState
          icon={<FileText size={44} color={colors.tint400} />}
          title="Chưa có hợp đồng"
          description={
            blocked
              ? "Bạn cần có ít nhất 1 phòng và 1 người thuê trước khi tạo hợp đồng."
              : "Tạo hợp đồng để bắt đầu tính tiền thuê hàng tháng."
          }
        />
      ) : (
        <View style={{ gap: 12 }}>
          {leases.map((l) => {
            const active = l.status === "active";
            return (
              <RecordCard
                key={l.id}
                title={roomTitle(l.listing_id)}
                subtitle={tenantName(l.tenant_id)}
                badge={
                  <Pressable
                    onPress={() => void toggleStatus(l)}
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: active ? colors.emerald.bg : colors.neutral.bg,
                        borderColor: active ? colors.emerald.border : colors.neutral.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: active ? colors.emerald.fg : colors.neutral.fg },
                      ]}
                    >
                      {active ? "Hiệu lực" : "Kết thúc"}
                    </Text>
                  </Pressable>
                }
                rows={[
                  { label: "Từ ngày", value: formatDate(l.start_date) },
                  { label: "Đến ngày", value: formatDate(l.end_date) },
                  { label: "Tiền thuê", value: formatVND(l.monthly_rent) },
                  { label: "Tiền cọc", value: formatVND(l.deposit) },
                ]}
                actions={
                  <IconButton accessibilityLabel="Xoá" onPress={() => void handleDelete(l.id)}>
                    <Trash2 size={16} color={colors.destructive} />
                  </IconButton>
                }
              />
            );
          })}
        </View>
      )}

      <LeaseForm
        open={showForm}
        listings={listings}
        tenants={tenants}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await reload();
        }}
      />
    </View>
  );
}

function LeaseForm({
  open,
  listings,
  tenants,
  onClose,
  onSaved,
}: {
  open: boolean;
  listings: Listing[];
  tenants: Tenant[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [listingId, setListingId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const first = listings[0];
    setListingId(first?.id ?? "");
    setTenantId(tenants[0]?.id ?? "");
    setStartDate(today());
    setEndDate("");
    setRent(String(first?.price ?? ""));
    setDeposit("");
    setNotes("");
  }, [open, listings, tenants]);

  const pickListing = (id: string) => {
    setListingId(id);
    // Prefill the rent from the room's asking price — it is right far more
    // often than it is wrong, and it stays editable.
    const price = listings.find((x) => x.id === id)?.price;
    if (price) setRent(String(price));
  };

  const submit = async () => {
    if (!listingId || !tenantId) {
      toast.error("Vui lòng chọn phòng và người thuê.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))) {
      toast.error("Ngày hợp đồng không hợp lệ.");
      return;
    }
    if (endDate && endDate < startDate) {
      toast.error("Ngày kết thúc không được trước ngày bắt đầu.");
      return;
    }
    const rentValue = Number(rent);
    const depositValue = Number(deposit || "0");
    if (!Number.isInteger(rentValue) || rentValue <= 0 || !Number.isInteger(depositValue) || depositValue < 0) {
      toast.error("Tiền thuê phải lớn hơn 0, tiền cọc không âm.");
      return;
    }
    setSaving(true);
    try {
      await createLease({
        listing_id: listingId,
        tenant_id: tenantId,
        start_date: startDate,
        end_date: endDate || null,
        monthly_rent: rentValue,
        deposit: depositValue,
        notes: notes || null,
      });
      toast.success("Đã tạo hợp đồng");
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e, "Không tạo được hợp đồng"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      title="Thêm hợp đồng"
      onClose={onClose}
      footer={
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SecondaryButton label="Huỷ" onPress={onClose} style={{ flex: 1 }} />
          <PrimaryButton
            label={saving ? "Đang lưu…" : "Tạo hợp đồng"}
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
          onChange={pickListing}
          options={listings.map((l) => ({ label: l.title, value: l.id }))}
        />
      </Field>
      <Field label="Người thuê">
        <Select
          title="Chọn người thuê"
          value={tenantId}
          onChange={setTenantId}
          options={tenants.map((t) => ({ label: t.full_name, value: t.id }))}
        />
      </Field>
      <Field label="Ngày bắt đầu">
        <DateField value={startDate} onChange={setStartDate} />
      </Field>
      <Field label="Ngày kết thúc">
        <DateField value={endDate} onChange={setEndDate} clearable />
      </Field>
      <Field label="Tiền thuê / tháng (VNĐ)">
        <TextInput value={rent} onChangeText={setRent} keyboardType="number-pad" />
      </Field>
      <Field label="Tiền cọc (VNĐ)">
        <TextInput value={deposit} onChangeText={setDeposit} keyboardType="number-pad" />
      </Field>
      <Field label="Ghi chú">
        <TextInput value={notes} onChangeText={setNotes} multiline />
      </Field>
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
});
