import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Heart, LogIn, Sparkles } from "lucide-react-native";
import { BrandHeader, PageHeading } from "@/components/ScreenHeader";
import { RoomCard } from "@/components/RoomCard";
import { Loading, LoadError } from "@/components/AsyncState";
import { AccentButton, Card, EmptyState } from "@/components/ui";
import { getRooms, type Room } from "@/lib/api/catalogue";
import {
  compareFavorites,
  FAVORITE_PROFILE_LABEL,
  type FavoriteCompareResult,
  type FavoriteProfile,
} from "@/lib/favorite-compare";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { colors, font } from "@/theme";

const NO_ROOMS: Room[] = [];
const PROFILES: FavoriteProfile[] = ["freshman", "budget", "safe"];

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { ids, reload: reloadFavorites } = useFavorites();
  const { data: rooms, loading, error, reload } = useAsync(getRooms, NO_ROOMS);
  const [profile, setProfile] = useState<FavoriteProfile>("freshman");

  const saved = useMemo(() => rooms.filter((r) => ids.includes(r.id)), [rooms, ids]);
  const comparison = useMemo(() => compareFavorites(saved, profile), [saved, profile]);

  // Favourites live on the account now, so there is nothing to show — and
  // nothing to fetch — until someone signs in.
  if (!user) {
    return (
      <View style={styles.screen}>
        <BrandHeader />
        <View style={styles.body}>
          <PageHeading
            eyebrow="Bộ sưu tập của bạn"
            title="Phòng đã lưu"
            description="Đăng nhập để lưu phòng và xem lại trên mọi thiết bị."
          />
          <EmptyState
            icon={<Heart size={44} color={colors.tint400} />}
            title="Chưa đăng nhập"
            description="Phòng yêu thích được lưu theo tài khoản, không còn nằm riêng trên máy này."
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
        data={saved}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && rooms.length > 0}
            onRefresh={() => {
              void reload();
              void reloadFavorites();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <PageHeading
              eyebrow="Bộ sưu tập của bạn"
              title="Phòng đã lưu"
              description="Theo dõi và so sánh những căn phòng bạn quan tâm."
            />
            {error ? (
              <View style={{ paddingBottom: 16 }}>
                <LoadError message={error} onRetry={() => void reload()} />
              </View>
            ) : null}
            {comparison ? (
              <FavoriteCompareCard
                comparison={comparison}
                profile={profile}
                onProfileChange={setProfile}
              />
            ) : null}
          </>
        }
        renderItem={({ item }) => <RoomCard room={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? null : (
            <EmptyState
              icon={<Heart size={44} color={colors.tint400} />}
              title="Chưa có phòng nào được lưu."
              description="Chạm vào biểu tượng trái tim trên một phòng để lưu lại và so sánh sau."
              action={<AccentButton label="Khám phá phòng trọ" onPress={() => router.push("/")} />}
            />
          )
        }
      />
    </View>
  );
}

function FavoriteCompareCard({
  comparison,
  profile,
  onProfileChange,
}: {
  comparison: FavoriteCompareResult;
  profile: FavoriteProfile;
  onProfileChange: (profile: FavoriteProfile) => void;
}) {
  return (
    <Card style={styles.compareCard}>
      <View style={styles.compareHead}>
        <View style={styles.compareTitleRow}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={styles.compareTitle}>{comparison.title}</Text>
        </View>
        <Text style={styles.compareSummary}>{comparison.summary}</Text>
      </View>
      <View style={styles.profileRow}>
        {PROFILES.map((item) => {
          const active = item === profile;
          return (
            <Pressable
              key={item}
              onPress={() => onProfileChange(item)}
              style={[styles.profileChip, active && styles.profileChipActive]}
            >
              <Text style={[styles.profileText, active && styles.profileTextActive]}>
                {FAVORITE_PROFILE_LABEL[item]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.recommendBox}>
        <Text style={styles.recommendTitle}>
          Nên xem trước: {comparison.recommendation.title} · {comparison.recommendation.score}/100
        </Text>
        <Text style={styles.compareText}>
          Hợp vì {comparison.recommendation.reasons.join(", ")}.
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        {comparison.picks.map((item) => (
          <Text key={item} style={styles.compareText}>• {item}</Text>
        ))}
      </View>
      {comparison.cautions.length > 0 ? (
        <View style={styles.cautionBox}>
          {comparison.cautions.map((item) => (
            <Text key={item} style={styles.cautionText}>• {item}</Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 16, gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  compareCard: { gap: 12, marginBottom: 16, backgroundColor: colors.tint50 },
  compareHead: { gap: 4 },
  compareTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  compareTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  compareSummary: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  compareText: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.foreground,
  },
  profileRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  profileChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  profileChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  profileText: { fontFamily: font.semibold, fontSize: 12, color: colors.foreground },
  profileTextActive: { color: colors.primaryForeground },
  recommendBox: {
    gap: 4,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.emerald.bg,
    borderWidth: 1,
    borderColor: colors.emerald.border,
  },
  recommendTitle: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 18,
    color: colors.emerald.fg,
  },
  cautionBox: {
    gap: 4,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.amber.bg,
    borderWidth: 1,
    borderColor: colors.amber.border,
  },
  cautionText: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.amber.fg,
  },
});
