import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LogIn, ShieldQuestion, Star, Trash2 } from "lucide-react-native";
import { deleteReview, saveReview, type ReviewState } from "@/lib/api/reviews";
import { confirm } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "./Toast";
import { AccentButton, Card, Field, Muted, SecondaryButton, TextInput } from "./ui";
import { colors, font, radius } from "@/theme";

/**
 * Ô viết đánh giá, chỉ mở cho người đã thuê chính phòng này.
 *
 * Ba trạng thái, và cả ba đều nói ra lý do thay vì im lặng giấu nút đi: chưa
 * đăng nhập, đã đăng nhập nhưng không có hợp đồng, và viết được. Ẩn nút mà
 * không giải thích thì người thật sự đang thuê phòng sẽ tưởng app hỏng.
 *
 * Điều kiện thật nằm ở policy "Tenants review rooms they rented" — màn hình
 * này chỉ hỏi trước cho đỡ mất công gõ.
 */
export function ReviewComposer({
  listingId,
  state,
  onSaved,
}: {
  listingId: string;
  state: ReviewState;
  onSaved: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const mine = state.mine;

  useEffect(() => {
    setRating(mine?.rating ?? 5);
    setComment(mine?.comment ?? "");
  }, [mine?.id, mine?.rating, mine?.comment]);

  if (!user) {
    return (
      <Card style={styles.notice}>
        <Muted size={13} style={{ flex: 1, lineHeight: 19 }}>
          Đăng nhập bằng tài khoản đã từng thuê phòng này để viết đánh giá.
        </Muted>
        <SecondaryButton
          label="Đăng nhập"
          icon={<LogIn size={16} color={colors.foreground} />}
          onPress={() => router.push("/auth")}
        />
      </Card>
    );
  }

  if (!state.canReview) {
    return (
      <View style={styles.locked}>
        <ShieldQuestion size={18} color={colors.mutedForeground} />
        <Muted size={12} style={{ flex: 1, lineHeight: 18 }}>
          Chỉ người đã thuê phòng này mới đánh giá được, nên những nhận xét ở đây đều đến từ người
          từng ở thật. Nếu bạn đang thuê, nhờ chủ trọ điền email của bạn vào hồ sơ người thuê rồi
          bấm &quot;Nhận hồ sơ thuê của tôi&quot; trong tab Tài khoản.
        </Muted>
      </View>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      await saveReview({ listingId, rating, comment, existingId: mine?.id ?? null });
      toast.success(mine ? "Đã cập nhật đánh giá" : "Cảm ơn bạn đã đánh giá");
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e, "Không gửi được đánh giá"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!mine) return;
    if (!(await confirm("Xoá đánh giá của bạn cho phòng này?"))) return;
    setBusy(true);
    try {
      await deleteReview(mine.id);
      toast.success("Đã xoá đánh giá");
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e, "Không xoá được đánh giá"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      <Text style={styles.title}>{mine ? "Đánh giá của bạn" : "Viết đánh giá"}</Text>

      <Field label="Số sao">
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`${n} sao`}
            >
              <Star
                size={30}
                color={n <= rating ? colors.primary : colors.tint400}
                fill={n <= rating ? colors.primary : "transparent"}
              />
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Nhận xét" hint="Nói về phòng, chủ trọ và hàng xóm — thứ ảnh không kể được.">
        <TextInput
          value={comment}
          onChangeText={setComment}
          multiline
          placeholder="Phòng thoáng, chủ trọ sửa điện nước nhanh…"
        />
      </Field>

      <AccentButton
        label={busy ? "Đang gửi…" : mine ? "Cập nhật đánh giá" : "Gửi đánh giá"}
        disabled={busy}
        onPress={() => void submit()}
      />
      {mine ? (
        <SecondaryButton
          label="Xoá đánh giá"
          icon={<Trash2 size={16} color={colors.destructive} />}
          disabled={busy}
          onPress={() => void remove()}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  stars: { flexDirection: "row", gap: 10 },
  notice: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  locked: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    backgroundColor: colors.tint50,
  },
});
