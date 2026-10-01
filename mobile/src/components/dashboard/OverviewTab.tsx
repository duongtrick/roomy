import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AlertCircle, CalendarClock, Home, Receipt, TrendingUp, Users, Zap } from "lucide-react-native";
import { currentPeriod, formatDate, formatVND, today } from "@/lib/format";
import { ROOM_STATUS_LABEL, STATUS_ORDER } from "@/lib/dashboard-types";
import { Card, Muted, Title } from "../ui";
import { StatCard } from "./ui";
import type { DashboardTabKey, TabProps } from "./types";
import { colors, font } from "@/theme";

type Task = {
  title: string;
  note: string;
  tone: "urgent" | "warn" | "normal";
  icon: typeof Receipt;
  target?: DashboardTabKey | "bookings";
};

export function OverviewTab({ data, goToTab }: TabProps) {
  const { listings, tenants, leases, meters, invoices, bookings } = data;

  const occupied = listings.filter((l) => l.status === "occupied").length;
  const available = listings.filter((l) => l.status === "available").length;
  const activeLeases = leases.filter((l) => l.status === "active").length;
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const unpaidAmt = unpaid.reduce((s, i) => s + i.total_amount, 0);
  const todayIso = today();

  const thisMonth = currentPeriod();
  const monthRevenue = invoices
    .filter(
      (i) =>
        i.status === "paid" &&
        i.paid_at &&
        (() => {
          const paidAt = new Date(i.paid_at);
          const paidPeriod =
            paidAt.getFullYear() + "-" + String(paidAt.getMonth() + 1).padStart(2, "0");
          return !Number.isNaN(paidAt.getTime()) && paidPeriod === thisMonth;
        })(),
    )
    .reduce((s, i) => s + i.total_amount, 0);
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const overdue = unpaid.filter((i) => i.due_date && i.due_date < todayIso);
  const occupiedWithoutMeter = listings.filter(
    (l) =>
      l.status === "occupied" &&
      !meters.some((m) => m.listing_id === l.id && m.period === thisMonth),
  );
  const publishedAvailable = listings.filter((l) => l.status === "available" && l.is_published);
  const draftRooms = listings.filter((l) => !l.is_published);
  const makeTask = (task: Task | null) => task;
  const tasks = [
    overdue.length > 0
      ? makeTask({
          title: `${overdue.length} hoá đơn quá hạn`,
          note: `Cũ nhất đến hạn ${formatDate(
            [...overdue].sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0]
              .due_date,
          )}.`,
          tone: "urgent",
          icon: Receipt,
          target: "invoices",
        })
      : null,
    pendingBookings.length > 0
      ? makeTask({
          title: `${pendingBookings.length} yêu cầu xem phòng mới`,
          note: "Xác nhận sớm để giữ khách đang có nhu cầu thật.",
          tone: "warn",
          icon: CalendarClock,
          target: "bookings",
        })
      : null,
    occupiedWithoutMeter.length > 0
      ? makeTask({
          title: `${occupiedWithoutMeter.length} phòng chưa ghi chỉ số tháng này`,
          note: `Kỳ ${thisMonth}; ghi chỉ số trước khi tạo hoá đơn.`,
          tone: "warn",
          icon: Zap,
          target: "meters",
        })
      : null,
    publishedAvailable.length > 0
      ? makeTask({
          title: `${publishedAvailable.length} phòng trống đang đăng`,
          note: "Theo dõi lịch xem và cập nhật trạng thái khi có khách thuê.",
          tone: "normal",
          icon: Home,
          target: "rooms",
        })
      : null,
    draftRooms.length > 0
      ? makeTask({
          title: `${draftRooms.length} phòng chưa đăng công khai`,
          note: "Hoàn thiện ảnh, vị trí, giá điện nước rồi bật đăng.",
          tone: "normal",
          icon: AlertCircle,
          target: "rooms",
        })
      : null,
  ].filter((task): task is Task => Boolean(task));

  return (
    <View style={{ gap: 20 }}>
      <View style={styles.stats}>
        <StatCard
          icon={<Home size={18} color={colors.mutedForeground} />}
          label="Tổng phòng"
          value={listings.length}
          sub={`${occupied} đã thuê · ${available} trống`}
        />
        <StatCard
          icon={<Users size={18} color={colors.mutedForeground} />}
          label="Người thuê"
          value={tenants.length}
          sub={`${activeLeases} hợp đồng hiệu lực`}
        />
        <StatCard
          icon={<Receipt size={18} color={colors.mutedForeground} />}
          label="Hoá đơn chưa thu"
          value={unpaid.length}
          sub={formatVND(unpaidAmt)}
        />
        <StatCard
          icon={<TrendingUp size={18} color={colors.mutedForeground} />}
          label="Doanh thu tháng này"
          value={formatVND(monthRevenue)}
          sub="Từ hoá đơn đã thanh toán"
        />
      </View>

      <Card style={{ gap: 14 }}>
        <View style={styles.cardHead}>
          <Title>Việc cần làm hôm nay</Title>
          <Text style={styles.aiBadge}>Gợi ý tự động</Text>
        </View>
        {tasks.length === 0 ? (
          <Muted size={13}>Ổn rồi. Không có việc gấp từ dữ liệu hiện tại.</Muted>
        ) : (
          tasks.slice(0, 5).map((task) => (
            <TaskRow key={task.title} task={task} goToTab={goToTab} />
          ))
        )}
      </Card>

      <Card style={{ gap: 14 }}>
        <Title>Tình trạng phòng</Title>
        {listings.length === 0 ? (
          <Muted size={13}>Chưa có phòng nào.</Muted>
        ) : (
          STATUS_ORDER.map((st) => {
            const count = listings.filter((l) => l.status === st).length;
            const pct = listings.length ? (count / listings.length) * 100 : 0;
            return (
              <View key={st} style={{ gap: 6 }}>
                <View style={styles.barHead}>
                  <Text style={styles.barLabel}>{ROOM_STATUS_LABEL[st]}</Text>
                  <Muted size={13}>{count}</Muted>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <Title>Hoá đơn chưa thanh toán</Title>
        {unpaid.length === 0 ? (
          <Muted size={13}>Tất cả hoá đơn đã được thanh toán 🎉</Muted>
        ) : (
          unpaid.slice(0, 5).map((inv) => {
            const room = listings.find((l) => l.id === inv.listing_id);
            return (
              <View key={inv.id} style={styles.invoiceRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.invoiceRoom} numberOfLines={1}>
                    {room?.title ?? "—"}
                  </Text>
                  <Muted size={11}>Kỳ {inv.period}</Muted>
                </View>
                <Text style={styles.invoiceAmount}>{formatVND(inv.total_amount)}</Text>
              </View>
            );
          })
        )}
      </Card>
    </View>
  );
}

function TaskRow({ task, goToTab }: { task: Task; goToTab?: (tab: DashboardTabKey) => void }) {
  const Icon = task.icon;
  const color =
    task.tone === "urgent"
      ? colors.destructive
      : task.tone === "warn"
        ? colors.amber.fg
        : colors.primary;
  return (
    <Pressable
      onPress={() => {
        if (task.target === "bookings") router.push("/bookings");
        else if (task.target) goToTab?.(task.target);
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.taskRow, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.taskIcon, { borderColor: color }]}>
        <Icon size={16} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.taskTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <Muted size={12} numberOfLines={2}>
          {task.note}
        </Muted>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  aiBadge: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primary,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  taskTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.foreground, marginBottom: 2 },

  barHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  barLabel: { fontFamily: font.medium, fontSize: 13, color: colors.foreground },
  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.tint100,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: colors.primary },

  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  invoiceRoom: { fontFamily: font.medium, fontSize: 13, color: colors.foreground },
  invoiceAmount: { fontFamily: font.semibold, fontSize: 13, color: colors.destructive },
});
