import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Home, Search } from "lucide-react-native";
import type { ModerationStatus } from "@/lib/database.types";
import { MODERATION_LABEL, MODERATION_ORDER, toModeration } from "@/lib/moderation";
import { EmptyState, Muted, TextInput } from "../ui";
import { TabHeader } from "../dashboard/ui";
import { AdminListingCard } from "./ui";
import { ModerationSheet } from "./ModerationSheet";
import type { AdminTabProps } from "./types";
import { colors, font, radius } from "@/theme";

type Filter = ModerationStatus | "all";

/** Toàn bộ tin đăng trên hệ thống, kể cả tin chủ trọ chưa bật hiển thị. */
export function ListingsTab({ data, reload }: AdminTabProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: data.listings.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const l of data.listings) base[toModeration(l.moderation_status)] += 1;
    return base;
  }, [data.listings]);

  const filtered = data.listings.filter((l) => {
    if (filter !== "all" && toModeration(l.moderation_status) !== filter) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return [l.public_title, l.title, l.address, l.area, l.owner_name, l.owner_phone]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(q));
  });

  const open = openId ? (data.listings.find((l) => l.id === openId) ?? null) : null;

  return (
    <View>
      <TabHeader
        title="Tin đăng"
        subtitle={`${counts.all} tin · ${counts.approved} đã duyệt · ${counts.rejected} bị từ chối`}
      />

      <View style={styles.searchWrap}>
        <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm theo tên tin, địa chỉ hoặc chủ trọ..."
          style={{ paddingLeft: 42 }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterStrip}
      >
        {(["all", ...MODERATION_ORDER] as Filter[]).map((f) => {
          const on = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, on && styles.filterChipActive]}
            >
              <Text style={[styles.filterLabel, on && styles.filterLabelActive]}>
                {f === "all" ? "Tất cả" : MODERATION_LABEL[f]}
              </Text>
              <View style={[styles.filterCount, on && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, on && styles.filterLabelActive]}>
                  {counts[f]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {data.listings.length === 0 ? (
        <EmptyState
          icon={<Home size={44} color={colors.tint400} />}
          title="Chưa có tin đăng nào"
          description="Khi chủ trọ đăng phòng đầu tiên, tin sẽ xuất hiện ở đây để bạn duyệt."
        />
      ) : filtered.length === 0 ? (
        <Muted style={{ textAlign: "center", paddingVertical: 32 }}>
          Không tìm thấy tin phù hợp.
        </Muted>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((row) => (
            <AdminListingCard key={row.id} row={row} onOpen={() => setOpenId(row.id)} />
          ))}
        </View>
      )}

      <ModerationSheet row={open} onClose={() => setOpenId(null)} onChanged={reload} />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { position: "relative", marginBottom: 12 },
  searchIcon: { position: "absolute", left: 16, top: 16, zIndex: 1 },

  filterStrip: { gap: 8, paddingBottom: 16 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterLabel: { fontFamily: font.medium, fontSize: 12, color: colors.mutedForeground },
  filterLabelActive: { color: colors.primaryForeground, fontFamily: font.semibold },
  filterCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    borderRadius: radius.full,
    backgroundColor: colors.tint100,
    alignItems: "center",
  },
  filterCountActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  filterCountText: { fontFamily: font.bold, fontSize: 11, color: colors.mutedForeground },
});
