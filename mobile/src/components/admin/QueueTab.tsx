import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BadgeCheck, Inbox, ShieldQuestion, ShieldCheck, Trash2 } from "lucide-react-native";
import type { AdminListingRow } from "@/lib/database.types";
import { deleteListing, setListingModeration, setListingVerification } from "@/lib/api/admin";
import { confirm } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { assessListingRisk } from "@/lib/listing-risk";
import { toModeration } from "@/lib/moderation";
import { toVerification } from "@/lib/verification";
import { toast } from "../Toast";
import { AccentButton, EmptyState, Muted, PrimaryButton, SecondaryButton } from "../ui";
import { TabHeader } from "../dashboard/ui";
import { AdminListingCard } from "./ui";
import { ModerationSheet } from "./ModerationSheet";
import type { AdminTabProps } from "./types";
import { colors, font } from "@/theme";

/**
 * Hàng chờ: việc quản trị viên phải làm hôm nay.
 *
 * Tin cũ lên trước — ngược với mọi danh sách khác trong app. Một tin chờ ba
 * ngày mà vẫn bị tin mới đẩy xuống cuối là cách chắc chắn nhất để nó không
 * bao giờ được duyệt.
 */
export function QueueTab({ data, reload }: AdminTabProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = useMemo(
    () =>
      data.listings
        .filter((l) => toModeration(l.moderation_status) === "pending")
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [data.listings],
  );

  /**
   * Phòng đã duyệt nhưng chưa xác minh.
   *
   * Duyệt chỉ nói "tin đọc được, cho hiện"; nó không nói phòng có thật. Nên
   * mọi tin vừa qua cửa duyệt đều rơi vào đây, kể cả tin `unverified` mà chủ
   * trọ chưa hề bấm gửi giấy tờ — trước đây mục này chỉ bắt `pending`, nghĩa
   * là nhóm đông nhất (mặc định là `unverified`) không bao giờ hiện ra và
   * không ai đi kiểm chúng.
   *
   * Tin `rejected` không tính: nó đang không hiển thị, đi kiểm một phòng
   * không ai thấy là làm việc thừa.
   */
  const unverified = useMemo(
    () =>
      data.listings
        .filter(
          (l) =>
            toModeration(l.moderation_status) === "approved" &&
            toVerification(l.verification) !== "verified",
        )
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [data.listings],
  );

  /** Chạy một thao tác trên một tin rồi nạp lại snapshot. */
  const run = async (row: AdminListingRow, action: () => Promise<void>, done: string, fail: string) => {
    setBusyId(row.id);
    try {
      await action();
      toast.success(done);
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, fail));
    } finally {
      setBusyId(null);
    }
  };

  const approve = (row: AdminListingRow) =>
    run(row, () => setListingModeration(row.id, "approved"), "Đã duyệt tin đăng", "Không duyệt được tin");

  const verify = (row: AdminListingRow) =>
    run(
      row,
      () => setListingVerification(row.id, "verified"),
      "Đã xác minh phòng trọ",
      "Không xác minh được phòng",
    );

  /**
   * Xoá hẳn tin — dành cho phòng không tồn tại.
   *
   * Hỏi lại vì không lùi được: hợp đồng, chỉ số và hoá đơn gắn với phòng đó
   * mất theo (khoá ngoại ON DELETE CASCADE). Với tin sai nội dung mà phòng có
   * thật thì gỡ trong phiếu duyệt mới đúng, không phải nút này.
   */
  const remove = async (row: AdminListingRow) => {
    const ok = await confirm(
      `Xoá hẳn tin "${row.public_title ?? row.title}"? Hợp đồng, chỉ số và hoá đơn gắn với phòng này mất theo và không khôi phục được. Chỉ xoá khi đã kiểm tra và phòng không tồn tại.`,
      { title: "Xoá tin đăng", confirmLabel: "Xoá hẳn" },
    );
    if (!ok) return;
    if (openId === row.id) setOpenId(null);
    await run(row, () => deleteListing(row.id), "Đã xoá tin đăng", "Không xoá được tin");
  };

  const open = openId ? (data.listings.find((l) => l.id === openId) ?? null) : null;

  return (
    <View>
      <TabHeader
        title="Hàng chờ"
        subtitle={`${pending.length} tin chờ duyệt · ${unverified.length} phòng chưa xác minh`}
      />

      {pending.length === 0 ? (
        <EmptyState
          icon={<Inbox size={44} color={colors.tint400} />}
          title="Hàng chờ trống"
          description="Mọi tin đăng đều đã được xem. Tin mới của chủ trọ sẽ xuất hiện ở đây."
        />
      ) : (
        <View style={{ gap: 12 }}>
          {pending.map((row) => (
            <View key={row.id} style={{ gap: 8 }}>
              <AdminListingCard row={row} onOpen={() => setOpenId(row.id)} />
              <ModerationAssistant row={row} />
              <View style={styles.quickRow}>
                <Text style={styles.waiting}>Gửi ngày {formatDate(row.created_at)}</Text>
                <SecondaryButton
                  label="Xem phiếu"
                  onPress={() => setOpenId(row.id)}
                  style={{ flex: 1 }}
                />
                <AccentButton
                  label="Duyệt"
                  icon={<BadgeCheck size={16} color={colors.primaryForeground} />}
                  disabled={busyId === row.id}
                  onPress={() => void approve(row)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {unverified.length > 0 ? (
        <View style={{ marginTop: 28, gap: 12 }}>
          <View style={styles.sectionHead}>
            <ShieldQuestion size={16} color={colors.amber.fg} />
            <Text style={styles.sectionTitle}>Phòng trọ chưa xác minh</Text>
          </View>
          <Muted size={12}>
            Những tin này đã duyệt nên người tìm trọ đã thấy, nhưng chưa ai kiểm phòng. Mở phiếu,
            gọi theo số chủ trọ để đối chiếu địa chỉ và giấy tờ. Đúng như tin đăng thì bấm Xác
            minh; kiểm ra phòng không tồn tại thì Xoá.
          </Muted>
          {unverified.map((row) => (
            <View key={row.id} style={{ gap: 8 }}>
              <AdminListingCard row={row} onOpen={() => setOpenId(row.id)} />
              <ModerationAssistant row={row} />
              <View style={styles.quickRow}>
                <PrimaryButton
                  label="Xoá"
                  icon={<Trash2 size={16} color={colors.primaryForeground} />}
                  disabled={busyId === row.id}
                  onPress={() => void remove(row)}
                  style={{ flex: 1, backgroundColor: colors.destructive }}
                />
                <AccentButton
                  label="Xác minh"
                  icon={<ShieldCheck size={16} color={colors.primaryForeground} />}
                  disabled={busyId === row.id}
                  onPress={() => void verify(row)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <ModerationSheet row={open} onClose={() => setOpenId(null)} onChanged={reload} />
    </View>
  );
}

function ModerationAssistant({ row }: { row: AdminListingRow }) {
  const risk = assessListingRisk({
    title: row.public_title ?? row.title,
    description: row.public_description,
    price: row.price,
    size: row.size,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    verification: toVerification(row.verification),
    imageCount: row.images.length,
  });
  const tone =
    risk.level === "high"
      ? { bg: colors.tint100, fg: colors.destructive, border: colors.borderStrong }
      : risk.level === "medium"
        ? colors.amber
        : colors.emerald;

  return (
    <View style={[styles.aiBox, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={styles.aiHead}>
        <ShieldQuestion size={16} color={tone.fg} />
        <Text style={[styles.aiTitle, { color: tone.fg }]}>Trợ lý kiểm duyệt · {risk.label}</Text>
      </View>
      <Text style={[styles.aiText, { color: tone.fg }]}>
        {risk.reasons.length ? risk.reasons.join(" · ") : "Không thấy tín hiệu bất thường rõ ràng."}
      </Text>
      {risk.checklist.map((item) => (
        <Text key={item} style={[styles.aiCheck, { color: tone.fg }]}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  waiting: {
    width: "100%",
    fontFamily: font.medium,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  sectionTitle: { fontFamily: font.extrabold, fontSize: 18, color: colors.foreground },
  aiBox: {
    gap: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  aiHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiTitle: { fontFamily: font.semibold, fontSize: 13 },
  aiText: { fontFamily: font.medium, fontSize: 12, lineHeight: 18 },
  aiCheck: { fontFamily: font.regular, fontSize: 12, lineHeight: 18 },
});
