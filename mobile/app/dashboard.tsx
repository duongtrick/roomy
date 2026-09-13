import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { FileText, Home, LayoutDashboard, Receipt, Users, Zap } from "lucide-react-native";
import { useAuth } from "@/hooks/use-auth";
import { useAsync } from "@/hooks/use-async";
import { toast } from "@/components/Toast";
import { Loading, LoadError } from "@/components/AsyncState";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/lib/api/dashboard";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { RoomsTab } from "@/components/dashboard/RoomsTab";
import { TenantsTab } from "@/components/dashboard/TenantsTab";
import { LeasesTab } from "@/components/dashboard/LeasesTab";
import { MetersTab } from "@/components/dashboard/MetersTab";
import { InvoicesTab } from "@/components/dashboard/InvoicesTab";
import { colors, font, radius } from "@/theme";

type TabKey = "overview" | "rooms" | "tenants" | "leases" | "meters" | "invoices";

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { key: "rooms", label: "Phòng", icon: Home },
  { key: "tenants", label: "Người thuê", icon: Users },
  { key: "leases", label: "Hợp đồng", icon: FileText },
  { key: "meters", label: "Chỉ số", icon: Zap },
  { key: "invoices", label: "Hoá đơn", icon: Receipt },
];

const EMPTY: DashboardSnapshot = {
  listings: [],
  tenants: [],
  leases: [],
  meters: [],
  invoices: [],
};

export default function DashboardScreen() {
  const { user, isLandlord, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<TabKey>("overview");

  // Every tab reads from one snapshot instead of fetching its own five tables,
  // so switching tabs is instant and a write refreshes all of them at once.
  const { data, loading, error, reload } = useAsync(getDashboardSnapshot, EMPTY);

  // Navigating during render is not allowed, so the guard runs in an effect
  // and the body below renders nothing until it has had a chance to fire.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    if (!isLandlord) {
      toast.error("Trang này chỉ dành cho chủ trọ.");
      router.replace("/");
    }
  }, [user, isLandlord, authLoading]);

  if (authLoading || !user || !isLandlord) return null;

  const tabProps = { data, reload };

  return (
    <View style={styles.screen}>
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabStrip}
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={({ pressed }) => [
                  styles.chip,
                  on && styles.chipActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Icon size={15} color={on ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.chipLabel, on && styles.chipLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading && data.listings.length > 0}
            onRefresh={() => void reload()}
            tintColor={colors.primary}
          />
        }
      >
        {error ? (
          <LoadError message={error} onRetry={() => void reload()} />
        ) : loading && data.listings.length === 0 ? (
          <Loading label="Đang tải dữ liệu…" />
        ) : (
          <>
            {tab === "overview" && <OverviewTab {...tabProps} />}
            {tab === "rooms" && <RoomsTab {...tabProps} />}
            {tab === "tenants" && <TenantsTab {...tabProps} />}
            {tab === "leases" && <LeasesTab {...tabProps} />}
            {tab === "meters" && <MetersTab {...tabProps} />}
            {tab === "invoices" && <InvoicesTab {...tabProps} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tabStrip: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep },
  chipLabel: { fontFamily: font.medium, fontSize: 13, color: colors.mutedForeground },
  chipLabelActive: { fontFamily: font.semibold, color: colors.primaryForeground },

  body: { padding: 16, paddingBottom: 48 },
});
