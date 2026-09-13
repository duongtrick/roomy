import { useEffect, useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { BadgeCheck, EyeOff, Phone, ShieldCheck, Trash2, X } from "lucide-react-native";
import type { AdminListingRow, VerificationLevel } from "@/lib/database.types";
import {
  deleteListing,
  setListingModeration,
  setListingVerification,
  unpublishListing,
} from "@/lib/api/admin";
import { photoUrl } from "@/lib/supabase";
import { confirm } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatDistance, formatVNDExact } from "@/lib/format";
import { MODERATION_COLOR, MODERATION_LABEL, toModeration } from "@/lib/moderation";
import { VERIFICATION_LABEL, VERIFICATION_ORDER, toVerification } from "@/lib/verification";
import { toast } from "../Toast";
import {
  AccentButton,
  Divider,
  Field,
  Muted,
  PrimaryButton,
  SecondaryButton,
  Select,
  Sheet,
  TextInput,
  Title,
} from "../ui";
import { ListingBadges } from "./ui";
import { colors, font, radius } from "@/theme";

/**
 * Phiếu duyệt một tin đăng.
 *
 * Hiện đúng những gì người tìm trọ sẽ thấy — ảnh, tên, mô tả, giá, địa chỉ,
 * toạ độ — vì đó là thứ đang được duyệt. Số liệu nội bộ của chủ trọ (ghi chú,
 * đơn giá điện nước, hợp đồng) cố ý không có ở đây: quản trị viên duyệt tin,
 * không phải quản lý sổ sách của chủ trọ.
 */
export function ModerationSheet({
  row,
  onClose,
  onChanged,
}: {
  row: AdminListingRow | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Sheet vẫn nằm trong cây khi đóng, nên ô lý do phải được dọn theo từng tin,
  // nếu không lý do từ chối tin trước sẽ hiện sẵn ở tin sau.
  useEffect(() => {
    setRejecting(false);
    setNote(row?.moderation_note ?? "");
  }, [row?.id, row?.moderation_note]);

  if (!row) return null;

  const moderation = toModeration(row.moderation_status);
  const gallery = [...row.images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => photoUrl(i.storage_path))
    .filter((u): u is string => Boolean(u));

  /**
   * Chạy một thao tác rồi nạp lại dữ liệu.
   *
   * `close` để mặc định là đóng phiếu: duyệt, từ chối và gỡ tin đều kết thúc
   * việc với tin đó. Đổi mức xác thực thì không — nó thường đi kèm một quyết
   * định duyệt ngay sau đó, đóng phiếu là bắt mở lại.
   */
  const run = async (action: () => Promise<void>, done: string, close = true) => {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      await onChanged();
      if (close) onClose();
    } catch (e) {
      toast.error(errorMessage(e, "Không thực hiện được"));
    } finally {
      setBusy(false);
    }
  };

  const approve = () =>
    run(() => setListingModeration(row.id, "approved"), "Đã duyệt tin đăng");

  const reject = () => {
    if (!note.trim()) {
      toast.error("Hãy ghi lý do để chủ trọ biết cần sửa gì.");
      return;
    }
    void run(() => setListingModeration(row.id, "rejected", note), "Đã từ chối tin đăng");
  };

  const changeVerification = (next: VerificationLevel) =>
    run(
      () => setListingVerification(row.id, next),
      next === "verified" ? "Đã cấp huy hiệu xác thực" : "Đã cập nhật mức xác thực",
      false,
    );

  const takeDown = async () => {
    const ok = await confirm(
      "Gỡ tin này khỏi trang công khai? Chủ trọ vẫn giữ phòng, hợp đồng và hoá đơn; họ có thể đăng lại sau khi sửa.",
      { title: "Gỡ tin", confirmLabel: "Gỡ tin" },
    );
    if (!ok) return;
    void run(() => unpublishListing(row.id), "Đã gỡ tin khỏi trang công khai");
  };

  /**
   * Xoá hẳn — nửa còn lại của "Gỡ tin", không phải bản mạnh hơn.
   *
   * Gỡ dành cho tin sai nội dung: phòng có thật nên sổ sách của chủ trọ phải
   * còn. Xoá dành cho phòng không tồn tại, lúc đó hợp đồng và hoá đơn treo
   * trên nó cũng vô nghĩa và mất theo qua ON DELETE CASCADE. Hai câu hỏi lại
   * cố ý nói rõ khác biệt đó, vì đây là chỗ duy nhất chọn nhầm không sửa được.
   */
  const removeForever = async () => {
    const ok = await confirm(
      `Xoá hẳn tin "${row.public_title ?? row.title}"? Hợp đồng, chỉ số và hoá đơn gắn với phòng này mất theo và không khôi phục được. Chỉ xoá khi đã kiểm tra và phòng không tồn tại.`,
      { title: "Xoá tin đăng", confirmLabel: "Xoá hẳn" },
    );
    if (!ok) return;
    void run(() => deleteListing(row.id), "Đã xoá tin đăng");
  };

  return (
    <Sheet
      open
      title={row.public_title ?? row.title}
      onClose={onClose}
      footer={
        rejecting ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SecondaryButton
              label="Quay lại"
              onPress={() => setRejecting(false)}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={busy ? "Đang gửi…" : "Xác nhận từ chối"}
              disabled={busy}
              onPress={reject}
              style={{ flex: 1, backgroundColor: colors.destructive }}
            />
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SecondaryButton
              label="Từ chối"
              icon={<X size={16} color={colors.destructive} />}
              disabled={busy}
              onPress={() => setRejecting(true)}
              style={{ flex: 1 }}
            />
            <AccentButton
              label={moderation === "approved" ? "Đã duyệt" : "Duyệt tin"}
              icon={<BadgeCheck size={16} color={colors.primaryForeground} />}
              disabled={busy || moderation === "approved"}
              onPress={() => void approve()}
              style={{ flex: 1 }}
            />
          </View>
        )
      }
    >
      {rejecting ? (
        <>
          <Field
            label="Lý do từ chối"
            hint="Chủ trọ đọc được nguyên văn câu này trong Bảng điều khiển."
          >
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              autoFocus
              placeholder="VD: Ảnh không phải ảnh phòng thật, giá ghi thiếu phí dịch vụ…"
            />
          </Field>
          <Muted size={11}>
            Tin bị từ chối sẽ ẩn khỏi trang công khai. Chủ trọ sửa và lưu lại là tin tự quay về
            hàng chờ duyệt.
          </Muted>
        </>
      ) : (
        <>
          <ListingBadges row={row} />

          {moderation === "rejected" && row.moderation_note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Lý do đã gửi chủ trọ</Text>
              <Text style={styles.noteText}>{row.moderation_note}</Text>
            </View>
          ) : null}

          {gallery.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {gallery.map((src) => (
                <Image key={src} source={{ uri: src }} style={styles.photo} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>
                Tin chưa có ảnh nào. Người tìm trọ sẽ thấy một thẻ phòng trống ảnh.
              </Text>
            </View>
          )}

          <View style={{ gap: 10 }}>
            <Row label="Giá thuê" value={`${formatVNDExact(row.price)}/tháng`} />
            <Row label="Diện tích" value={row.size ? `${row.size} m²` : "—"} />
            <Row label="Địa chỉ" value={row.address ?? "—"} />
            <Row label="Khu vực" value={[row.area, row.district].filter(Boolean).join(" · ") || "—"} />
            <Row
              label="Cách trường"
              value={
                row.distance_to_school != null
                  ? `${formatDistance(row.distance_to_school)}${row.school_name ? ` · ${row.school_name}` : ""}`
                  : "—"
              }
            />
            <Row
              label="Toạ độ"
              value={row.lat != null && row.lng != null ? `${row.lat}, ${row.lng}` : "—"}
            />
            <Row label="Tiện ích" value={row.amenities.join(", ") || "—"} />
            <Row label="Đăng lúc" value={formatDate(row.created_at)} />
            <Row label="Sửa lần cuối" value={formatDate(row.updated_at)} />
          </View>

          {row.public_description ? (
            <View style={{ gap: 6 }}>
              <Text style={styles.blockLabel}>Mô tả công khai</Text>
              <Text style={styles.body}>{row.public_description}</Text>
            </View>
          ) : null}

          <Divider />

          <View style={{ gap: 6 }}>
            <Text style={styles.blockLabel}>Chủ trọ</Text>
            <Title>{row.owner_name ?? "Chưa đặt tên"}</Title>
            {row.owner_phone ? (
              <SecondaryButton
                label={`Gọi ${row.owner_phone}`}
                icon={<Phone size={16} color={colors.foreground} />}
                onPress={() => void Linking.openURL(`tel:${row.owner_phone!.replace(/\s/g, "")}`)}
              />
            ) : (
              <Muted size={12}>Chủ trọ chưa điền số điện thoại.</Muted>
            )}
          </View>

          <Divider />

          <Field
            label="Mức xác thực"
            hint="Chỉ đặt 'Đã xác thực' sau khi đối chiếu giấy tờ chủ trọ và địa chỉ phòng."
          >
            <Select
              title="Mức xác thực"
              value={toVerification(row.verification)}
              onChange={(v) => void changeVerification(v as VerificationLevel)}
              disabled={busy}
              options={VERIFICATION_ORDER.map((v) => ({
                label: VERIFICATION_LABEL[v],
                value: v,
              }))}
            />
          </Field>

          {row.is_published ? (
            <SecondaryButton
              label="Gỡ tin khỏi trang công khai"
              icon={<EyeOff size={16} color={colors.destructive} />}
              disabled={busy}
              onPress={() => void takeDown()}
            />
          ) : (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>
                Chủ trọ đang tắt hiển thị tin này. Duyệt trước cũng được — tin sẽ hiện ngay khi họ
                bật lại.
              </Text>
            </View>
          )}

          <SecondaryButton
            label="Xoá hẳn tin này"
            icon={<Trash2 size={16} color={colors.destructive} />}
            disabled={busy}
            onPress={() => void removeForever()}
          />
          <Muted size={11}>
            Chỉ xoá khi đã kiểm tra và phòng không tồn tại. Tin sai nội dung nhưng phòng có thật
            thì từ chối hoặc gỡ, để chủ trọ sửa lại.
          </Muted>

          <View style={styles.metaRow}>
            <ShieldCheck size={13} color={colors.mutedForeground} />
            <Muted size={11}>
              {row.moderated_at
                ? `${MODERATION_LABEL[moderation]} lúc ${formatDate(row.moderated_at)}`
                : "Tin này chưa qua tay quản trị viên nào."}
            </Muted>
          </View>
        </>
      )}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: 200, height: 140, borderRadius: radius.xl, backgroundColor: colors.tint200 },

  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  rowLabel: {
    width: 96,
    fontFamily: font.regular,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    paddingTop: 2,
  },
  rowValue: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.foreground },

  blockLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.foreground },

  noteBox: {
    gap: 4,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    backgroundColor: MODERATION_COLOR.rejected.bg,
    borderColor: MODERATION_COLOR.rejected.border,
  },
  noteLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: MODERATION_COLOR.rejected.fg,
  },
  noteText: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: MODERATION_COLOR.rejected.fg },

  warnBox: {
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    backgroundColor: colors.amber.bg,
    borderColor: colors.amber.border,
  },
  warnText: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: colors.amber.fg },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
