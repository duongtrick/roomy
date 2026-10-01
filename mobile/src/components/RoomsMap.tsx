import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { MapPin } from "lucide-react-native";
import type { Room } from "@/lib/api/catalogue";
import { TN_REGION } from "@/lib/filters";
import { openDirections } from "@/lib/maps-link";
import { colors, font, radius } from "@/theme";
import { LeafletMap, type MapMarker } from "./LeafletMap";

/**
 * Hai bản đồ hiển thị phòng. Trước đây dựng bằng `react-native-maps`; nay chạy
 * trên `LeafletMap` để không phụ thuộc Google Maps API key. Kiểu props giữ
 * nguyên nên các màn đang dùng không phải sửa gì.
 */

/** `latitudeDelta` 0.06 của vùng Thái Nguyên tương đương mức zoom 13. */
const TN_ZOOM = 13;

export function RoomsMap({
  rooms,
  activeId,
  onSelect,
  style,
}: {
  rooms: Room[];
  activeId: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const markers: MapMarker[] = rooms.map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    title: r.title,
  }));

  return (
    <LeafletMap
      markers={markers}
      activeId={activeId}
      center={{ lat: TN_REGION.latitude, lng: TN_REGION.longitude }}
      zoom={TN_ZOOM}
      onSelect={onSelect}
      style={style}
    />
  );
}

/** Bản đồ tĩnh, không tương tác, dùng ở màn chi tiết phòng. */
export function RoomMiniMap({
  lat,
  lng,
  style,
}: {
  lat: number;
  lng: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (Platform.OS === "web") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở bản đồ"
        onPress={() => {
          void openDirections(lat, lng);
        }}
        style={[styles.webMiniMap, style]}
      >
        <MapPin size={28} color={colors.primary} />
        <Text style={styles.webMiniText}>Mở vị trí trên Google Maps</Text>
      </Pressable>
    );
  }

  return (
    <LeafletMap
      markers={[{ id: "room", lat, lng, title: "" }]}
      center={{ lat, lng }}
      zoom={16}
      interactive={false}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  webMiniMap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius["3xl"],
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
  },
  webMiniText: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors.primaryDeep,
  },
});
