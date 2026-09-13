import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Mail, Pencil, Phone, Plus, ShieldCheck, Trash2, Users } from "lucide-react-native";
import { deleteTenant, saveTenant } from "@/lib/api/dashboard";
import { confirm } from "@/lib/confirm";
import { formatDate } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import type { Tenant } from "@/lib/dashboard-types";
import { toast } from "../Toast";
import {
  AccentButton,
  EmptyState,
  Field,
  IconButton,
  Muted,
  PrimaryButton,
  SecondaryButton,
  Sheet,
  TextInput,
} from "../ui";
import { DateField } from "../DateField";
import { RecordCard, TabHeader } from "./ui";
import type { TabProps } from "./types";
import { colors, font } from "@/theme";

export function TenantsTab({ data, reload }: TabProps) {
  const items = data.tenants;
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (id: string) => {
    if (!(await confirm("Xoá người thuê này? Hợp đồng của họ cũng sẽ bị xoá."))) return;
    try {
      await deleteTenant(id);
      toast.success("Đã xoá");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, "Không xoá được"));
    }
  };

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <View>
      <TabHeader
        title="Người thuê"
        subtitle={`Tổng ${items.length} người`}
        action={
          <AccentButton
            label="Thêm"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            onPress={openNew}
          />
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Users size={44} color={colors.tint400} />}
          title="Chưa có người thuê nào"
          description="Thêm thông tin người thuê để theo dõi và liên hệ dễ dàng."
          action={
            <AccentButton
              label="Thêm người thuê"
              icon={<Plus size={16} color={colors.primaryForeground} />}
              onPress={openNew}
            />
          }
        />
      ) : (
        <View style={{ gap: 12 }}>
          {items.map((t) => (
            <RecordCard
              key={t.id}
              title={t.full_name}
              subtitle={t.id_number ? `CCCD: ${t.id_number}` : undefined}
              rows={[
                {
                  label: "Điện thoại",
                  value: t.phone ? (
                    <View style={styles.iconRow}>
                      <Phone size={12} color={colors.mutedForeground} />
                      <Text style={styles.iconRowText}>{t.phone}</Text>
                    </View>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: "Email",
                  value: t.email ? (
                    <View style={styles.iconRow}>
                      <Mail size={12} color={colors.mutedForeground} />
                      <Text style={styles.iconRowText} numberOfLines={1}>
                        {t.email}
                      </Text>
                    </View>
                  ) : (
                    "—"
                  ),
                },
                { label: "Chuyển vào", value: formatDate(t.move_in_date) },
                {
                  label: "Tài khoản Roomy",
                  value: t.user_id ? (
                    <View style={styles.iconRow}>
                      <ShieldCheck size={12} color={colors.emerald.fg} />
                      <Text style={[styles.iconRowText, { color: colors.emerald.fg }]}>
                        Đã nối
                      </Text>
                    </View>
                  ) : (
                    "Chưa nối"
                  ),
                },
                { label: "Ghi chú", value: t.notes ?? "—" },
              ]}
              actions={
                <>
                  <IconButton
                    accessibilityLabel="Sửa"
                    onPress={() => {
                      setEditing(t);
                      setShowForm(true);
                    }}
                  >
                    <Pencil size={16} color={colors.mutedForeground} />
                  </IconButton>
                  <IconButton accessibilityLabel="Xoá" onPress={() => void handleDelete(t.id)}>
                    <Trash2 size={16} color={colors.destructive} />
                  </IconButton>
                </>
              }
            />
          ))}
        </View>
      )}

      <TenantForm
        open={showForm}
        initial={editing}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await reload();
        }}
      />
    </View>
  );
}

function TenantForm({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Tenant | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // The sheet stays mounted between openings, so the draft has to be reset
  // from `initial` each time it is shown — otherwise editing one tenant then
  // adding another starts with the previous tenant's values.
  useEffect(() => {
    if (!open) return;
    setFullName(initial?.full_name ?? "");
    setPhone(initial?.phone ?? "");
    setEmail(initial?.email ?? "");
    setIdNumber(initial?.id_number ?? "");
    setMoveInDate(initial?.move_in_date ?? "");
    setNotes(initial?.notes ?? "");
    setError("");
  }, [open, initial]);

  const submit = async () => {
    if (!fullName.trim()) {
      setError("Vui lòng nhập họ tên");
      return;
    }
    setSaving(true);
    try {
      await saveTenant({
        id: initial?.id,
        full_name: fullName.trim(),
        phone: phone || null,
        email: email || null,
        id_number: idNumber || null,
        move_in_date: moveInDate || null,
        notes: notes || null,
      });
      toast.success(initial ? "Đã cập nhật" : "Đã thêm người thuê");
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e, "Không lưu được"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      title={initial ? "Chỉnh sửa người thuê" : "Thêm người thuê"}
      onClose={onClose}
      footer={
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SecondaryButton label="Huỷ" onPress={onClose} style={{ flex: 1 }} />
          <PrimaryButton
            label={saving ? "Đang lưu…" : "Lưu"}
            disabled={saving}
            onPress={() => void submit()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <Field label="Họ tên" error={error}>
        <TextInput value={fullName} onChangeText={setFullName} placeholder="Nguyễn Văn A" />
      </Field>
      <Field label="Số điện thoại">
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </Field>
      <Field
        label="Email"
        hint="Điền đúng email người thuê dùng để đăng nhập Roomy, rồi bảo họ bấm 'Nhận hồ sơ thuê của tôi' trong tab Tài khoản. Đó là cách họ mở khoá quyền đánh giá phòng."
      >
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Field>
      <Field label="CCCD / CMND">
        <TextInput value={idNumber} onChangeText={setIdNumber} keyboardType="number-pad" />
      </Field>
      <Field label="Ngày chuyển vào">
        <DateField value={moveInDate} onChange={setMoveInDate} clearable />
      </Field>
      <Field label="Ghi chú">
        <TextInput value={notes} onChangeText={setNotes} multiline />
      </Field>
      <Muted size={11}>
        Chỉ bạn nhìn thấy thông tin người thuê của mình. Việc nối hồ sơ với tài khoản do chính
        người thuê xác nhận — bạn không đặt hộ được.
      </Muted>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  iconRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  iconRowText: { fontFamily: font.medium, fontSize: 13, color: colors.foreground, flexShrink: 1 },
});
