import { StyleSheet, Text, View } from "react-native";
import { BadgeCheck, Clock, MessageSquare, ShieldCheck } from "lucide-react-native";
import { toModeration } from "@/lib/moderation";
import { toVerification } from "@/lib/verification";
import { Card, Muted, Title } from "../ui";
import { StatCard } from "../dashboard/ui";
import type { AdminTabProps } from "./types";
import { colors, font } from "@/theme";

/** Bốn con số và luật chơi — đủ để biết hôm nay có việc gì phải làm. */
export function OverviewTab({ data }: AdminTabProps) {
  const { listings, reviews } = data;

  const pending = listings.filter((l) => toModeration(l.moderation_status) === "pending").length;
  const rejected = listings.filter((l) => toModeration(l.moderation_status) === "rejected").length;
  const live = listings.filter(
    (l) => l.is_published && toModeration(l.moderation_status) === "approved",
  ).length;
  // Cùng định nghĩa với mục "Phòng trọ chưa xác minh" bên tab Hàng chờ: đã
  // duyệt (nên đang hiển thị) nhưng chưa ai đi kiểm phòng. Đếm theo
  // `verification === 'pending'` như trước thì con số bỏ sót đúng nhóm đông
  // nhất — tin mặc định `unverified`.
  const unverified = listings.filter(
    (l) =>
      toModeration(l.moderation_status) === "approved" &&
      toVerification(l.verification) !== "verified",
  ).length;
  const verified = listings.filter((l) => toVerification(l.verification) === "verified").length;
  const unbacked = reviews.filter((r) => !r.from_tenant).length;

  return (
    <View style={{ gap: 20 }}>
      <View style={styles.stats}>
        <StatCard
          icon={<Clock size={18} color={colors.mutedForeground} />}
          label="Chờ duyệt"
          value={pending}
          sub={`${rejected} tin đang bị từ chối`}
        />
        <StatCard
          icon={<BadgeCheck size={18} color={colors.mutedForeground} />}
          label="Đang hiển thị"
          value={live}
          sub={`Trên tổng ${listings.length} tin`}
        />
        <StatCard
          icon={<ShieldCheck size={18} color={colors.mutedForeground} />}
          label="Chưa xác minh"
          value={unverified}
          sub={`${verified} phòng đã xác minh`}
        />
        <StatCard
          icon={<MessageSquare size={18} color={colors.mutedForeground} />}
          label="Đánh giá"
          value={reviews.length}
          sub={`${unbacked} không có hợp đồng`}
        />
      </View>

      <Card style={{ gap: 10 }}>
        <Title>Luật đang chạy</Title>
        <Rule text="Tin mới và tin vừa sửa nội dung công khai đều vào hàng chờ. Người tìm trọ chỉ thấy tin đã duyệt." />
        <Rule text="Từ chối thì phải ghi lý do — chủ trọ đọc nguyên văn câu đó trong Bảng điều khiển." />
        <Rule text="Duyệt mới chỉ là cho hiển thị. Tin đã duyệt nằm ở mục 'Phòng trọ chưa xác minh' cho tới khi có người đi kiểm phòng." />
        <Rule text="Huy hiệu 'Đã xác thực' chỉ cấp sau khi đối chiếu giấy tờ chủ trọ và địa chỉ phòng." />
        <Rule text="Chỉ người có hợp đồng thuê chính phòng đó mới viết được đánh giá, mỗi người một lần." />
        <Rule text="Gỡ tin là tắt hiển thị, không xoá: hợp đồng và hoá đơn của chủ trọ vẫn còn nguyên." />
        <Rule text="Xoá hẳn chỉ dành cho phòng không tồn tại — hợp đồng và hoá đơn mất theo, không khôi phục được." />
      </Card>

      <Muted size={11} style={{ textAlign: "center" }}>
        Mọi quyền ở trên đều do RLS trong `supabase/schema.sql` cấp, không phải do màn hình này.
      </Muted>
    </View>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <View style={styles.rule}>
      <View style={styles.dot} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  rule: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  ruleText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
});
