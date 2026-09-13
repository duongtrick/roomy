import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Heart, LogIn } from "lucide-react-native";
import { BrandHeader, PageHeading } from "@/components/ScreenHeader";
import { RoomCard } from "@/components/RoomCard";
import { Loading, LoadError } from "@/components/AsyncState";
import { AccentButton, EmptyState } from "@/components/ui";
import { getRooms, type Room } from "@/lib/api/catalogue";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { colors } from "@/theme";

const NO_ROOMS: Room[] = [];

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { ids, reload: reloadFavorites } = useFavorites();
  const { data: rooms, loading, error, reload } = useAsync(getRooms, NO_ROOMS);

  const saved = useMemo(() => rooms.filter((r) => ids.includes(r.id)), [rooms, ids]);

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 16, gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
});
