import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { BadgeCheck, GraduationCap, LogIn, Search, Sparkles, X } from "lucide-react-native";
import { BrandHeader } from "@/components/ScreenHeader";
import { RoomCard } from "@/components/RoomCard";
import { Loading, LoadError } from "@/components/AsyncState";
import {
  AccentButton,
  Card,
  Display,
  Field,
  IconButton,
  Muted,
  Select,
  TextInput,
} from "@/components/ui";
import { getRooms, type Room } from "@/lib/api/catalogue";
import { askRoomySearch, type AiSearchIntent } from "@/lib/api/ai";
import { aiRoomMatch } from "@/lib/ai-room-match";
import {
  ANY_AREA,
  DISTANCE_BANDS,
  PRICE_BANDS,
  SORT_OPTIONS,
  matchesQuery,
  sortRooms,
  type SortKey,
} from "@/lib/filters";
import { formatDistance, formatVND } from "@/lib/format";
import { suggestRooms } from "@/lib/suggest";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { colors, font, radius, shadow } from "@/theme";

/** Stable identity so `useAsync` does not refetch on every render. */
const NO_ROOMS: Room[] = [];

export default function HomeScreen() {
  const { user } = useAuth();
  const { ids: favouriteIds } = useFavorites();
  const { data: rooms, loading, error, reload } = useAsync(getRooms, NO_ROOMS);

  const [query, setQuery] = useState("");
  const [ask, setAsk] = useState("");
  const [intent, setIntent] = useState<AiSearchIntent | null>(null);
  const [askingAi, setAskingAi] = useState(false);
  const [area, setArea] = useState<string>(ANY_AREA);
  const [bandIdx, setBandIdx] = useState(0);
  const [distanceIdx, setDistanceIdx] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");

  // The area list comes from the rooms actually on offer rather than a fixed
  // list, so a filter can never point at an empty result.
  const areas = useMemo(
    () => [ANY_AREA, ...new Set(rooms.map((r) => r.area).filter(Boolean))],
    [rooms],
  );

  const filtered = useMemo(() => {
    const band = PRICE_BANDS[bandIdx];
    const maxDistance = DISTANCE_BANDS[distanceIdx].max;
    const matches = rooms.filter((r) => {
      if (area !== ANY_AREA && r.area !== area) return false;
      // Keep the labels and boundaries consistent: "dưới" / "trên" are
      // exclusive, while the middle band includes both endpoints.
      if (bandIdx === 1 && r.price >= band.max) return false;
      if (bandIdx === 2 && (r.price < band.min || r.price > band.max)) return false;
      if (bandIdx === 3 && r.price <= band.min) return false;
      if (intent?.maxPrice != null && r.price > intent.maxPrice) return false;
      // Chưa khai khoảng cách thì không lọt qua bất kỳ mốc hẹp nào.
      if (maxDistance !== Infinity && (r.distanceToSchool ?? Infinity) >= maxDistance) return false;
      if (intent?.maxDistance != null && (r.distanceToSchool ?? Infinity) > intent.maxDistance) {
        return false;
      }
      if (verifiedOnly && r.verification !== "verified") return false;
      if (intent?.verifiedOnly && r.verification !== "verified") return false;
      if (availableOnly && r.status !== "available") return false;
      if (intent?.availableOnly && r.status !== "available") return false;
      return matchesQuery(r, intent?.keyword || query);
    });
    return sortRooms(matches, sort);
  }, [rooms, area, bandIdx, distanceIdx, verifiedOnly, availableOnly, query, intent, sort]);

  const suggestions = useMemo(() => suggestRooms(filtered, favouriteIds), [filtered, favouriteIds]);

  const activeFilters =
    (area !== ANY_AREA ? 1 : 0) +
    (bandIdx !== 0 ? 1 : 0) +
    (distanceIdx !== 0 ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (availableOnly ? 1 : 0) +
    (intent ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const resetFilters = () => {
    setQuery("");
    setAsk("");
    setIntent(null);
    setArea(ANY_AREA);
    setBandIdx(0);
    setDistanceIdx(0);
    setVerifiedOnly(false);
    setAvailableOnly(false);
    setSort("newest");
  };

  const applyRoomyQuery = async () => {
    const text = ask.trim();
    if (!text) return;
    setAskingAi(true);
    try {
      const next = await askRoomySearch(text);
      setIntent(next);
      setQuery(next.keyword);
    } finally {
      setAskingAi(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BrandHeader
        action={
          user ? null : (
            <IconButton onPress={() => router.push("/auth")} accessibilityLabel="Đăng nhập">
              <LogIn size={20} color={colors.foreground} />
            </IconButton>
          )
        }
      />

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading && rooms.length > 0}
            onRefresh={() => void reload()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 24 }}>
            <Display size={36} style={{ lineHeight: 44 }}>
              Tìm phòng trọ <Text style={{ color: colors.primary }}>lý tưởng</Text> tại Thái Nguyên.
            </Display>

            <Card style={[styles.searchCard, shadow.card]}>
              <View style={styles.askBox}>
                <View style={styles.searchWrap}>
                  <Sparkles size={16} color={colors.primary} style={styles.searchIcon} />
                  <TextInput
                    value={ask}
                    onChangeText={setAsk}
                    placeholder="Hỏi Roomy: phòng dưới 2 triệu gần ICTU còn trống"
                    style={{ paddingLeft: 42 }}
                    returnKeyType="search"
                    onSubmitEditing={() => void applyRoomyQuery()}
                  />
                </View>
                <AccentButton
                  label={askingAi ? "Đang hỏi…" : "Hỏi Roomy"}
                  icon={<Sparkles size={16} color={colors.primaryForeground} />}
                  disabled={!ask.trim() || askingAi}
                  onPress={() => void applyRoomyQuery()}
                />
              </View>

              {intent ? (
                <View style={styles.intentBox}>
                  <View style={styles.intentRow}>
                    <IntentChip label={intent.source === "llm" ? "AI hiểu ý" : "AI dự phòng"} />
                    {intent.audience === "freshman" ? <IntentChip label="Tân sinh viên" /> : null}
                    {intent.maxPrice != null ? (
                      <IntentChip label={`Dưới ${formatVND(intent.maxPrice)}`} />
                    ) : null}
                    {intent.maxDistance != null ? (
                      <IntentChip label={`Gần ${formatDistance(intent.maxDistance)}`} />
                    ) : null}
                    {intent.availableOnly ? <IntentChip label="Còn trống" /> : null}
                    {intent.verifiedOnly ? <IntentChip label="Đã xác thực" /> : null}
                    {intent.keyword ? <IntentChip label={intent.keyword} /> : null}
                  </View>
                  <Text style={styles.intentNote}>{intent.note}</Text>
                  {intent.priorities.length > 0 ? (
                    <View style={{ gap: 4 }}>
                      {intent.priorities.map((item) => (
                        <Text key={item} style={styles.intentPriority}>• {item}</Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.searchWrap}>
                <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
                <TextInput
                  value={query}
                  onChangeText={(value) => {
                    setQuery(value);
                    setIntent(null);
                  }}
                  placeholder="Tìm theo tên phòng, khu vực, tiện ích…"
                  style={{ paddingLeft: 42, paddingRight: query ? 42 : 14 }}
                  returnKeyType="search"
                />
                {query ? (
                  <Pressable
                    onPress={() => setQuery("")}
                    hitSlop={8}
                    style={styles.clearIcon}
                    accessibilityLabel="Xoá từ khoá"
                  >
                    <X size={16} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.pair}>
                <View style={{ flex: 1 }}>
                  <Field label="Khu vực">
                    <Select
                      title="Khu vực"
                      value={area}
                      onChange={setArea}
                      options={areas.map((a) => ({ label: a, value: a }))}
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Giá thuê">
                    <Select
                      title="Khoảng giá"
                      value={String(bandIdx)}
                      onChange={(v) => setBandIdx(Number(v))}
                      options={PRICE_BANDS.map((b, i) => ({ label: b.label, value: String(i) }))}
                    />
                  </Field>
                </View>
              </View>

              <View style={styles.pair}>
                <View style={{ flex: 1 }}>
                  <Field label="Cách trường">
                    <Select
                      title="Khoảng cách tới trường"
                      value={String(distanceIdx)}
                      onChange={(v) => setDistanceIdx(Number(v))}
                      options={DISTANCE_BANDS.map((b, i) => ({ label: b.label, value: String(i) }))}
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Sắp xếp">
                    <Select
                      title="Sắp xếp"
                      value={sort}
                      onChange={(v) => setSort(v as SortKey)}
                      options={SORT_OPTIONS}
                    />
                  </Field>
                </View>
              </View>

              <View style={styles.toggleRow}>
                <FilterChip
                  label="Đã xác thực"
                  icon={
                    <BadgeCheck
                      size={13}
                      color={verifiedOnly ? colors.primaryForeground : colors.mutedForeground}
                    />
                  }
                  on={verifiedOnly}
                  onPress={() => setVerifiedOnly((v) => !v)}
                />
                <FilterChip
                  label="Còn trống"
                  on={availableOnly}
                  onPress={() => setAvailableOnly((v) => !v)}
                />
                {activeFilters > 0 ? (
                  <Pressable onPress={resetFilters} hitSlop={6} style={styles.resetChip}>
                    <X size={13} color={colors.mutedForeground} />
                    <Text style={styles.resetLabel}>Xoá lọc</Text>
                  </Pressable>
                ) : null}
              </View>

              <AccentButton
                label="Xem trên bản đồ"
                icon={<Search size={16} color={colors.primaryForeground} />}
                onPress={() => router.push("/map")}
              />
            </Card>

            {error ? <LoadError message={error} onRetry={() => void reload()} /> : null}

            {suggestions.length > 0 ? (
              <View style={{ gap: 12 }}>
                <View style={styles.suggestHead}>
                  <Sparkles size={16} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Gợi ý cho bạn</Text>
                </View>
                <Muted size={12}>
                  Xếp hạng theo mức xác thực, khoảng cách tới trường, giá so với mặt bằng chung và
                  đánh giá của người thuê trước.
                </Muted>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingVertical: 2 }}
                >
                  {suggestions.map((s) => (
                    <SuggestionCard key={s.room.id} room={s.room} reasons={s.reasons} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {activeFilters > 0 ? "Kết quả tìm kiếm" : "Phòng trống mới nhất"}
              </Text>
              <Text style={styles.count}>{filtered.length} kết quả</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <RoomCard room={item} match={intent ? aiRoomMatch(item, intent) : null} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
        ListEmptyComponent={
          loading ? (
            <Loading label="Đang tải danh sách phòng…" />
          ) : error ? null : (
            <Muted style={{ fontFamily: font.italic, fontSize: 15, paddingVertical: 24 }}>
              {rooms.length === 0
                ? "Chưa có phòng nào được đăng."
                : "Chưa có phòng phù hợp. Hãy thử mở rộng khu vực, khoảng giá hoặc khoảng cách."}
            </Muted>
          )
        }
        ListFooterComponent={
          filtered.length === 0 ? null : (
            <View style={{ gap: 16, paddingTop: 28 }}>
              <View style={styles.quote}>
                <Text style={styles.quoteText}>
                  “Tôi đã tìm được căn phòng ưng ý chỉ sau 2 ngày sử dụng Roomy. Thông tin rất minh
                  bạch.”
                </Text>
                <View style={styles.quoteAuthor}>
                  <View style={styles.avatar} />
                  <View>
                    <Text style={styles.quoteName}>Minh Anh</Text>
                    <Text style={styles.quoteRole}>Sinh viên ĐH Thái Nguyên</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.footerNote}>© 2026 Roomy Vietnam · Thái Nguyên City Office</Text>
            </View>
          )
        }
      />
    </View>
  );
}

function IntentChip({ label }: { label: string }) {
  return (
    <View style={styles.intentChip}>
      <Text style={styles.intentLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({
  label,
  icon,
  on,
  onPress,
}: {
  label: string;
  icon?: React.ReactNode;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={[styles.chip, on && styles.chipOn]}
    >
      {icon}
      <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Thẻ gợi ý — hẹp hơn thẻ phòng thường và luôn kèm lý do được chọn, để phần
 * "gợi ý" không thành một danh sách thứ hai không rõ vì sao lại xuất hiện.
 */
function SuggestionCard({ room, reasons }: { room: Room; reasons: string[] }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/room/[id]", params: { id: room.id } })}
      style={({ pressed }) => [styles.suggestCard, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.suggestTitle} numberOfLines={2}>
        {room.title}
      </Text>
      <Text style={styles.suggestPrice}>
        {formatVND(room.price)}
        <Text style={styles.suggestPer}>/tháng</Text>
      </Text>
      {room.distanceToSchool != null ? (
        <View style={styles.schoolRow}>
          <GraduationCap size={13} color={colors.primary} />
          <Text style={styles.suggestMeta} numberOfLines={1}>
            {formatDistance(room.distanceToSchool)} tới {room.school || "trường"}
          </Text>
        </View>
      ) : null}
      <View style={styles.reasonWrap}>
        {reasons.map((r) => (
          <View key={r} style={styles.reason}>
            <Text style={styles.reasonText}>{r}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 40 },
  searchCard: { gap: 14, borderRadius: radius["2xl"] },
  askBox: { gap: 10 },
  pair: { flexDirection: "row", gap: 12 },

  searchWrap: { justifyContent: "center" },
  searchIcon: { position: "absolute", left: 16, zIndex: 1 },
  clearIcon: { position: "absolute", right: 14, zIndex: 1 },

  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.tint100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontFamily: font.medium, fontSize: 12, color: colors.mutedForeground },
  chipLabelOn: { color: colors.primaryForeground, fontFamily: font.semibold },
  resetChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6 },
  resetLabel: { fontFamily: font.medium, fontSize: 12, color: colors.mutedForeground },
  intentRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  intentBox: {
    gap: 8,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.tint50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intentChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  intentLabel: { fontFamily: font.semibold, fontSize: 11, color: colors.primaryDeep },
  intentNote: { fontFamily: font.medium, fontSize: 12, lineHeight: 18, color: colors.foreground },
  intentPriority: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },

  suggestHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  suggestCard: {
    width: 210,
    gap: 6,
    padding: 14,
    borderRadius: radius["2xl"],
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  suggestTitle: {
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.foreground,
  },
  suggestPrice: { fontFamily: font.bold, fontSize: 16, color: colors.primary },
  suggestPer: { fontFamily: font.regular, fontSize: 11, color: colors.mutedForeground },
  schoolRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  suggestMeta: { flex: 1, fontFamily: font.medium, fontSize: 11, color: colors.mutedForeground },
  reasonWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  reason: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reasonText: { fontFamily: font.medium, fontSize: 10, color: colors.primaryDeep },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  sectionTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.foreground },
  count: { fontFamily: font.medium, fontSize: 12, color: colors.mutedForeground },

  quote: {
    backgroundColor: colors.accent,
    borderRadius: radius["3xl"],
    padding: 24,
    gap: 20,
  },
  quoteText: {
    fontFamily: font.italic,
    fontSize: 16,
    lineHeight: 24,
    color: colors.accentForeground,
  },
  quoteAuthor: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.onAccentFill,
  },
  quoteName: { fontFamily: font.bold, fontSize: 12, color: colors.accentForeground },
  quoteRole: { fontFamily: font.regular, fontSize: 10, color: colors.onAccentDim },

  footerNote: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    textAlign: "center",
    paddingTop: 12,
  },
});
