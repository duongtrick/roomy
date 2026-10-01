import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Calendar, CalendarDays, Check, Clock, LogIn, Trash2, X } from "lucide-react-native";
import { BrandHeader, PageHeading } from "@/components/ScreenHeader";
import { Loading, LoadError } from "@/components/AsyncState";
import { AccentButton, Badge, Display, EmptyState } from "@/components/ui";
import { toast } from "@/components/Toast";
import {
  deleteBooking,
  getBookings,
  setBookingStatus,
  statusLabel,
  type Booking,
  type BookingStatus,
} from "@/lib/api/bookings";
import { formatDate } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { confirm } from "@/lib/confirm";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/hooks/use-auth";
import { colors, font, radius } from "@/theme";

const NO_BOOKINGS: Booking[] = [];

const STATUS_STYLE: Record<BookingStatus, { bg: string; fg: string }> = {
  pending: { bg: colors.amber.bg, fg: colors.amber.fg },
  confirmed: { bg: colors.emerald.bg, fg: colors.emerald.fg },
  cancelled: { bg: colors.neutral.bg, fg: colors.neutral.fg },
};

export default function BookingsScreen() {
  const { user, isLandlord } = useAuth();
  const { data: bookings, loading, error, reload } = useAsync(getBookings, NO_BOOKINGS);

  const mutate = useCallback(
    async (action: Promise<void>, done: string) => {
      try {
        await action;
        toast.success(done);
        await reload();
      } catch (e) {
        toast.error(errorMessage(e, "Không cập nhật được lịch xem"));
      }
    },
    [reload],
  );

  const askRemove = async (id: string) => {
    if (!(await confirm("Xoá lịch xem phòng này khỏi danh sách?"))) return;
    await mutate(deleteBooking(id), "Đã xoá");
  };

  if (!user) {
    return (
      <View style={styles.screen}>
        <BrandHeader />
        <View style={styles.body}>
          <PageHeading
            eyebrow="Quản lý"
            title="Lịch xem phòng"
            description="Đăng nhập để gửi và theo dõi yêu cầu xem phòng."
          />
          <EmptyState
            icon={<CalendarDays size={44} color={colors.tint400} />}
            title="Chưa đăng nhập"
            description="Yêu cầu xem phòng gắn với tài khoản để chủ trọ biết ai đang hỏi."
            action={
              <AccentButton
                label="Đăng nhập"
                icon={<LogIn size={16} color={colors.primaryForeground} />}
                onPress={() => router.push("/auth")}
              />
            }
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && bookings.length > 0}
            onRefresh={() => void reload()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <PageHeading
              eyebrow="Quản lý"
              title={isLandlord ? "Yêu cầu xem phòng" : "Lịch xem phòng của tôi"}
              description={
                isLandlord
                  ? "Yêu cầu người thuê gửi tới các phòng của bạn. Xác nhận để họ biết lịch đã được duyệt."
                  : "Theo dõi trạng thái xác nhận từ chủ trọ."
              }
            />
            {error ? (
              <View style={{ paddingBottom: 16 }}>
                <LoadError message={error} onRetry={() => void reload()} />
              </View>
            ) : null}
          </>
        }
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? null : (
            <EmptyState
              icon={<CalendarDays size={44} color={colors.tint400} />}
              title={isLandlord ? "Chưa có yêu cầu nào." : "Bạn chưa đặt lịch xem phòng nào."}
              description={
                isLandlord
                  ? "Khi người thuê gửi yêu cầu xem một phòng của bạn, nó sẽ hiện ở đây."
                  : "Chọn một phòng và gửi yêu cầu xem — chủ trọ sẽ xác nhận lại."
              }
              action={
                isLandlord ? undefined : (
                  <AccentButton label="Khám phá phòng trọ" onPress={() => router.push("/")} />
                )
              }
            />
          )
        }
        renderItem={({ item: b }) => {
          const tone = STATUS_STYLE[b.status];
          return (
            <View style={styles.card}>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/room/[id]", params: { id: b.listingId } })
                }
                style={({ pressed }) => [{ padding: 16, gap: 10 }, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.titleRow}>
                  <Display size={18} style={{ flex: 1 }} numberOfLines={2}>
                    {b.roomTitle}
                  </Display>
                  <Badge label={statusLabel(b.status)} bg={tone.bg} fg={tone.fg} />
                </View>

                <View style={styles.chips}>
                  <View style={styles.metaRow}>
                    <Calendar size={14} color={colors.mutedForeground} />
                    <Text style={styles.meta}>{formatDate(b.date)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Clock size={14} color={colors.mutedForeground} />
                    <Text style={styles.meta}>{b.time}</Text>
                  </View>
                  <Text style={styles.contact}>
                    {b.name} · {b.phone}
                  </Text>
                </View>

                {b.note ? <Text style={styles.note}>“{b.note}”</Text> : null}
              </Pressable>

              <View style={styles.actions}>
                {/* Only the landlord can confirm — that is what the status means. */}
                {isLandlord && b.status === "pending" ? (
                  <Pressable
                    onPress={() =>
                      void mutate(setBookingStatus(b.id, "confirmed"), "Đã xác nhận lịch")
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Xác nhận lịch"
                    style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
                  >
                    <Check size={13} color={colors.emerald.fg} />
                    <Text style={[styles.actionLabel, { color: colors.emerald.fg }]}>Xác nhận</Text>
                  </Pressable>
                ) : null}

                {b.status !== "cancelled" ? (
                  <Pressable
                    onPress={() => void mutate(setBookingStatus(b.id, "cancelled"), "Đã hủy lịch")}
                    accessibilityRole="button"
                    accessibilityLabel="Hủy lịch"
                    style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
                  >
                    <X size={13} color={colors.foreground} />
                    <Text style={styles.actionLabel}>Hủy lịch</Text>
                  </Pressable>
                ) : null}

                {/* Deleting is the requester's row to remove. */}
                {!isLandlord ? (
                  <Pressable
                    onPress={() => void askRemove(b.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Xoá lịch xem"
                    style={({ pressed }) => [
                      styles.action,
                      styles.actionGhost,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Trash2 size={13} color={colors.mutedForeground} />
                    <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>Xoá</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 16, gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius["3xl"],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.mutedForeground, flexShrink: 1 },
  chips: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 14 },
  contact: { fontFamily: font.medium, fontSize: 11, color: colors.mutedForeground },
  note: {
    fontFamily: font.italic,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },

  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  actionGhost: { borderColor: "transparent" },
  actionLabel: {
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.foreground,
  },
});
