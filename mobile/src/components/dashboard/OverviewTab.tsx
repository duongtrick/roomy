import { StyleSheet, Text, View } from "react-native";
import { Home, Receipt, TrendingUp, Users } from "lucide-react-native";
import { currentPeriod, formatVND } from "@/lib/format";
import { ROOM_STATUS_LABEL, STATUS_ORDER } from "@/lib/dashboard-types";
import { Card, Muted, Title } from "../ui";
import { StatCard } from "./ui";
import type { TabProps } from "./types";
import { colors, font } from "@/theme";

export function OverviewTab({ data }: TabProps) {
  const { listings, tenants, leases, invoices } = data;

  const occupied = listings.filter((l) => l.status === "occupied").length;
  const available = listings.filter((l) => l.status === "available").length;
  const activeLeases = leases.filter((l) => l.status === "active").length;
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const unpaidAmt = unpaid.reduce((s, i) => s + i.total_amount, 0);

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

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

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
