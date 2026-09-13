import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MessageSquare, ShieldCheck, ShieldQuestion, Star, Trash2 } from "lucide-react-native";
import { deleteReview } from "@/lib/api/admin";
import { confirm } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { toast } from "../Toast";
import { Badge, Card, EmptyState, IconButton, Muted, SecondaryButton } from "../ui";
import { TabHeader } from "../dashboard/ui";
import type { AdminTabProps } from "./types";
import { colors, font, radius } from "@/theme";

/**
 * Đánh giá trên toàn hệ thống, để gỡ những nhận xét phá đám.
 *
 * `from_tenant` là thứ đáng nhìn nhất ở đây. Từ khi có policy "Tenants review
 * rooms they rented", mọi đánh giá mới đều phải có hợp đồng chống lưng, nên
 * dòng nào không có thì hoặc là dữ liệu cũ, hoặc là dữ liệu mẫu nạp bằng
 * service_role — chứ không phải người lạ vừa vào chấm một sao.
 */
export function ReviewsTab({ data, reload }: AdminTabProps) {
  const [unverifiedOnly, setUnverifiedOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const unverified = data.reviews.filter((r) => !r.from_tenant).length;
  const rows = unverifiedOnly ? data.reviews.filter((r) => !r.from_tenant) : data.reviews;

  const remove = async (id: string) => {
    const ok = await confirm("Gỡ đánh giá này? Người viết sẽ không thấy nó nữa và không khôi phục được.", {
      title: "Gỡ đánh giá",
      confirmLabel: "Gỡ",
    });
    if (!ok) return;
    setBusyId(id);
    try {
      await deleteReview(id);
      toast.success("Đã gỡ đánh giá");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, "Không gỡ được đánh giá"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View>
      <TabHeader
        title="Đánh giá"
        subtitle={`${data.reviews.length} đánh giá · ${unverified} không có hợp đồng`}
      />

      <Pressable
        onPress={() => setUnverifiedOnly((v) => !v)}
        style={[styles.toggle, unverifiedOnly && styles.toggleOn]}
      >
        <Text style={[styles.toggleLabel, unverifiedOnly && { color: colors.primary }]}>
          {unverifiedOnly ? "✓ Chỉ hiện đánh giá không có hợp đồng" : "Chỉ hiện đánh giá không có hợp đồng"}
        </Text>
      </Pressable>

      {rows.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={44} color={colors.tint400} />}
          title={unverifiedOnly ? "Không có đánh giá đáng ngờ" : "Chưa có đánh giá nào"}
          description={
            unverifiedOnly
              ? "Mọi đánh giá hiện tại đều đến từ người có hợp đồng thuê phòng."
              : "Người thuê viết đánh giá ở trang chi tiết phòng họ từng thuê."
          }
        />
      ) : (
        <View style={{ gap: 12 }}>
          {rows.map((r) => (
            <Card key={r.id} style={{ gap: 10 }}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listing} numberOfLines={1}>
                    {r.listing_title}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={12} color={colors.primary} fill={colors.primary} />
                      ))}
                    </View>
                    <Muted size={11} numberOfLines={1}>
                      {r.author_name} · {formatDate(r.created_at)}
                    </Muted>
                  </View>
                </View>
                {r.from_tenant ? (
                  <Badge
                    label="Có hợp đồng"
                    bg={colors.emerald.bg}
                    fg={colors.emerald.fg}
                    border={colors.emerald.border}
                    icon={<ShieldCheck size={10} color={colors.emerald.fg} />}
                  />
                ) : (
                  <Badge
                    label="Không hợp đồng"
                    bg={colors.amber.bg}
                    fg={colors.amber.fg}
                    border={colors.amber.border}
                    icon={<ShieldQuestion size={10} color={colors.amber.fg} />}
                  />
                )}
              </View>

              <Text style={styles.comment}>“{r.comment}”</Text>

              <View style={styles.actions}>
                <SecondaryButton
                  label="Xem phòng"
                  onPress={() =>
                    router.push({ pathname: "/room/[id]", params: { id: r.listing_id } })
                  }
                  style={{ flex: 1 }}
                />
                <IconButton
                  accessibilityLabel="Gỡ đánh giá"
                  onPress={() => void remove(r.id)}
                  style={busyId === r.id ? { opacity: 0.4 } : undefined}
                >
                  <Trash2 size={18} color={colors.destructive} />
                </IconButton>
              </View>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: colors.card,
  },
  toggleOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  toggleLabel: { fontFamily: font.medium, fontSize: 13, color: colors.mutedForeground },

  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  listing: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  comment: {
    fontFamily: font.italic,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
});
