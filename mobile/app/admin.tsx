import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Home, Inbox, LayoutDashboard, MessageSquare } from "lucide-react-native";
import { useAuth } from "@/hooks/use-auth";
import { useAsync } from "@/hooks/use-async";
import { toast } from "@/components/Toast";
import { Loading, LoadError } from "@/components/AsyncState";
import { getAdminSnapshot, type AdminSnapshot } from "@/lib/api/admin";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { QueueTab } from "@/components/admin/QueueTab";
import { ListingsTab } from "@/components/admin/ListingsTab";
import { ReviewsTab } from "@/components/admin/ReviewsTab";
import { toModeration } from "@/lib/moderation";
import { colors, font, radius } from "@/theme";

type TabKey = "overview" | "queue" | "listings" | "reviews";

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { key: "queue", label: "Hàng chờ", icon: Inbox },
  { key: "listings", label: "Tin đăng", icon: Home },
  { key: "reviews", label: "Đánh giá", icon: MessageSquare },
];

const EMPTY: AdminSnapshot = { listings: [], reviews: [] };

/**
 * Bảng quản trị hệ thống.
 *
 * Mở thẳng ở tab Hàng chờ chứ không phải Tổng quan: người vào đây gần như
 * luôn vào để duyệt tin, còn con số tổng quan thì xem lúc nào cũng được.
 *
 * Việc chặn vai trò ở đây chỉ để không ai phải nhìn một trang trống. Quyền
 * thật nằm ở RLS: hai view `admin_listings`/`admin_reviews` lọc bằng
 * `is_admin()`, và policy "Admins moderate listings" mới là thứ quyết định ai
 * ghi được.
 */
export default function AdminScreen() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<TabKey>("queue");

  const { data, loading, error, reload } = useAsync(getAdminSnapshot, EMPTY);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    if (!isAdmin) {
      toast.error("Trang này chỉ dành cho quản trị viên.");
      router.replace("/");
    }
  }, [user, isAdmin, authLoading]);

  if (authLoading || !user || !isAdmin) return null;

  const pending = data.listings.filter(
    (l) => toModeration(l.moderation_status) === "pending",
  ).length;
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
                {t.key === "queue" && pending > 0 ? (
                  <View style={styles.pip}>
                    <Text style={styles.pipText}>{pending}</Text>
                  </View>
                ) : null}
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
            {tab === "queue" && <QueueTab {...tabProps} />}
            {tab === "listings" && <ListingsTab {...tabProps} />}
            {tab === "reviews" && <ReviewsTab {...tabProps} />}
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

  /** Số tin đang chờ, ngay trên nhãn tab — hàng chờ trống thì không hiện gì. */
  pip: {
    minWidth: 18,
    paddingHorizontal: 5,
    borderRadius: radius.full,
    backgroundColor: colors.destructive,
    alignItems: "center",
  },
  pipText: { fontFamily: font.bold, fontSize: 10, color: "#FFFFFF", lineHeight: 18 },

  body: { padding: 16, paddingBottom: 48 },
});
