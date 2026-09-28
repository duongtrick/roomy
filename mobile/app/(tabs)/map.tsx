import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ImageOff, MapPin } from "lucide-react-native";
import { RoomsMap } from "@/components/RoomsMap";
import { Loading, LoadError } from "@/components/AsyncState";
import { Badge, Muted } from "@/components/ui";
import { getRooms, type Room } from "@/lib/api/catalogue";
import { formatVND } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { colors, font, radius, shadow } from "@/theme";

const NO_ROOMS: Room[] = [];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 96;
const CARD_GAP = 12;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;
const SIDE_INSET = (SCREEN_WIDTH - CARD_WIDTH) / 2;

/**
 * Bản đồ full-bleed với thanh thương hiệu nổi phía trên và carousel thẻ phòng
 * trượt ngang phía dưới — cùng một mẫu với Google Maps/Grab, thay cho khối bản
 * đồ đóng khung + danh sách dọc trước đây. Vuốt thẻ và chạm ghim đồng bộ hai
 * chiều qua `activeId`.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { data: rooms, loading, error, reload } = useAsync(getRooms, NO_ROOMS);
  const [activeId, setActiveId] = useState("");
  const listRef = useRef<FlatList<Room>>(null);
  const originIsCarousel = useRef(false);

  useEffect(() => {
    if (rooms.length === 0) {
      setActiveId("");
      return;
    }
    setActiveId((cur) => (rooms.some((r) => r.id === cur) ? cur : rooms[0].id));
  }, [rooms]);

  /**
   * Đổi thẻ đang chọn → lướt carousel tới đúng thẻ đó.
   *
   * Chỉ bỏ qua khi chính cú vuốt carousel vừa đổi `activeId`: lúc đó thẻ đã
   * nằm đúng chỗ, gọi `scrollToOffset` nữa là giành lái với cú snap đang chạy.
   * Mọi nguồn khác — chạm ghim trên bản đồ, danh sách vừa tải xong — đều phải
   * lướt. Cờ này trước đây gác ngược: nó bật lúc chạm ghim, đúng trường hợp
   * duy nhất cần lướt, nên thẻ đứng yên khi chọn ghim.
   *
   * Bản đồ không cần lo ở đây — `LeafletMap` tự bay tới marker mỗi lần
   * `activeId` đổi, kể cả khi lệnh đổi đến từ cú vuốt carousel.
   */
  useEffect(() => {
    if (!activeId) return;
    if (originIsCarousel.current) {
      originIsCarousel.current = false;
      return;
    }
    const index = rooms.findIndex((r) => r.id === activeId);
    if (index < 0) return;
    listRef.current?.scrollToOffset({ offset: index * CARD_STRIDE, animated: true });
  }, [activeId, rooms]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / CARD_STRIDE);
      const room = rooms[index];
      if (!room || room.id === activeId) return;
      // Đặt cờ ngay trước khi đổi, và chỉ khi thật sự có đổi: bật cờ cho một
      // lần `setActiveId` không xảy ra thì nó nằm lại đó và nuốt mất cú lướt
      // của lần chạm ghim kế tiếp.
      originIsCarousel.current = true;
      setActiveId(room.id);
    },
    [rooms, activeId],
  );

  if (error && rooms.length === 0) {
    return (
      <View style={[styles.screen, { padding: 16, paddingTop: insets.top + 24 }]}>
        <LoadError message={error} onRetry={() => void reload()} />
      </View>
    );
  }

  if (loading && rooms.length === 0) {
    return (
      <View style={styles.screen}>
        <Loading label="Đang tải bản đồ…" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <RoomsMap
        rooms={rooms}
        activeId={activeId}
        onSelect={setActiveId}
        style={styles.map}
      />

      <View style={[styles.topBar, { top: insets.top + 10 }]} pointerEvents="box-none">
        <View style={[styles.pill, shadow.lifted]}>
          <Text style={styles.brand}>Roomy</Text>
        </View>
        <View style={[styles.pill, styles.countPill, shadow.lifted]}>
          <MapPin size={13} color={colors.primary} />
          <Text style={styles.countText}>{rooms.length} phòng</Text>
        </View>
      </View>

      {rooms.length === 0 ? (
        <View style={[styles.emptyWrap, { paddingBottom: insets.bottom + 24 }]}>
          <Muted style={{ textAlign: "center" }}>Chưa có phòng nào được đăng.</Muted>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rooms}
          keyExtractor={(r) => r.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.carousel, { bottom: insets.bottom + 16 }]}
          contentContainerStyle={{ paddingHorizontal: SIDE_INSET }}
          snapToInterval={CARD_STRIDE}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, index) => ({
            length: CARD_STRIDE,
            offset: CARD_STRIDE * index,
            index,
          })}
          renderItem={({ item }) => {
            const on = item.id === activeId;
            return (
              <Pressable
                onPress={() => router.push({ pathname: "/room/[id]", params: { id: item.id } })}
                style={({ pressed }) => [
                  styles.card,
                  shadow.lifted,
                  { width: CARD_WIDTH },
                  on && styles.cardActive,
                  pressed && { opacity: 0.92 },
                ]}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.cardImage, styles.imageFallback]}>
                    <ImageOff size={20} color={colors.tint400} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={{ flex: 1, gap: 4 }}>
                    {item.district ? (
                      <Badge label={item.district} bg={colors.primarySoft} fg={colors.accent} />
                    ) : null}
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.price}>
                      {formatVND(item.price)}
                      <Text style={styles.perMonth}>/tháng</Text>
                    </Text>
                  </View>
                  <Text style={styles.cta}>Xem →</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1, borderRadius: 0 },

  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pill: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  countPill: { flexDirection: "row", gap: 6, paddingHorizontal: 14 },
  brand: {
    fontFamily: font.extrabold,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.primaryDeep,
  },
  countText: { fontFamily: font.semibold, fontSize: 12, color: colors.foreground },

  emptyWrap: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    padding: 16,
    borderRadius: radius["2xl"],
    backgroundColor: colors.card,
  },

  carousel: { position: "absolute", left: 0, right: 0, height: 168 },
  card: {
    height: 152,
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius["2xl"],
    overflow: "hidden",
    marginRight: CARD_GAP,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardActive: { borderColor: colors.primary },
  cardImage: { width: 108, height: "100%", backgroundColor: colors.tint200 },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  cardBody: {
    flex: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.foreground,
  },
  price: { fontFamily: font.bold, fontSize: 15, color: colors.primary, marginTop: 2 },
  perMonth: { fontFamily: font.regular, fontSize: 11, color: colors.mutedForeground },
  cta: {
    fontFamily: font.semibold,
    fontSize: 12,
    color: colors.primary,
    paddingBottom: 2,
  },
});
