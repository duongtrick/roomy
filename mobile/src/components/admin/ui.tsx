import { Image, StyleSheet, Text, View } from "react-native";
import { BadgeCheck, ImageOff, ShieldCheck } from "lucide-react-native";
import type { AdminListingRow } from "@/lib/database.types";
import { photoUrl } from "@/lib/supabase";
import { formatDistance, formatVND } from "@/lib/format";
import { MODERATION_COLOR, MODERATION_LABEL, toModeration } from "@/lib/moderation";
import { VERIFICATION_COLOR, VERIFICATION_LABEL, toVerification } from "@/lib/verification";
import { Badge, Muted } from "../ui";
import { RecordCard } from "../dashboard/ui";
import { colors, font, radius } from "@/theme";

/** Ảnh bìa của tin, hoặc ô xám khi chủ trọ chưa tải ảnh nào lên. */
export function Thumb({ row, size = 56 }: { row: AdminListingRow; size?: number }) {
  const cover = photoUrl([...row.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path);
  return cover ? (
    <Image source={{ uri: cover }} style={[styles.thumb, { width: size, height: size }]} />
  ) : (
    <View style={[styles.thumb, styles.thumbEmpty, { width: size, height: size }]}>
      <ImageOff size={18} color={colors.tint400} />
    </View>
  );
}

/**
 * Ba huy hiệu trạng thái của một tin, luôn cùng thứ tự.
 *
 * Kiểm duyệt đứng trước vì đó là thứ quyết định tin có hiện với người tìm trọ
 * hay không; xác thực đứng sau vì nó chỉ thêm sức nặng cho một tin đã hiện.
 */
export function ListingBadges({ row }: { row: AdminListingRow }) {
  const moderation = toModeration(row.moderation_status);
  const verification = toVerification(row.verification);
  return (
    <View style={styles.badges}>
      <Badge
        label={MODERATION_LABEL[moderation]}
        bg={MODERATION_COLOR[moderation].bg}
        fg={MODERATION_COLOR[moderation].fg}
        border={MODERATION_COLOR[moderation].border}
        icon={<BadgeCheck size={10} color={MODERATION_COLOR[moderation].fg} />}
      />
      <Badge
        label={VERIFICATION_LABEL[verification]}
        bg={VERIFICATION_COLOR[verification].bg}
        fg={VERIFICATION_COLOR[verification].fg}
        border={VERIFICATION_COLOR[verification].border}
        icon={<ShieldCheck size={10} color={VERIFICATION_COLOR[verification].fg} />}
      />
      {row.is_published ? null : (
        <Badge label="Chủ trọ chưa đăng" bg={colors.neutral.bg} fg={colors.neutral.fg} />
      )}
    </View>
  );
}

/** Một tin trong danh sách quản trị. Bấm vào mở phiếu duyệt chi tiết. */
export function AdminListingCard({
  row,
  onOpen,
}: {
  row: AdminListingRow;
  onOpen: () => void;
}) {
  return (
    <RecordCard
      onPress={onOpen}
      title={
        <View style={styles.head}>
          <Thumb row={row} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title} numberOfLines={2}>
              {row.public_title ?? row.title}
            </Text>
            <Muted size={11} numberOfLines={1}>
              {row.owner_name ?? "Chủ trọ"}
              {row.owner_phone ? ` · ${row.owner_phone}` : ""}
            </Muted>
            <View style={{ marginTop: 6 }}>
              <ListingBadges row={row} />
            </View>
          </View>
        </View>
      }
      badge={
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.price}>{formatVND(row.price)}</Text>
          <Text style={styles.priceUnit}>/tháng</Text>
        </View>
      }
      rows={[
        { label: "Địa chỉ", value: row.address ?? "—" },
        { label: "Khu vực", value: row.area ?? "—" },
        {
          label: "Cách trường",
          value: row.distance_to_school != null ? formatDistance(row.distance_to_school) : "—",
        },
        { label: "Ảnh · đánh giá", value: `${row.images.length} ảnh · ${row.review_count} đánh giá` },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: radius.lg, backgroundColor: colors.tint200 },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  head: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  title: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  price: { fontFamily: font.bold, fontSize: 15, color: colors.primary },
  priceUnit: { fontFamily: font.regular, fontSize: 10, color: colors.mutedForeground },
});
