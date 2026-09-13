import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin, Search } from "lucide-react-native";
import { reverseLookup, searchPlaces, type Place } from "@/lib/geocode";
import { Field, Muted, TextInput } from "./ui";
import { LeafletMap } from "./LeafletMap";
import { colors, font, radius } from "@/theme";

/**
 * Ghim vị trí phòng trọ: gõ địa chỉ → chọn gợi ý → chỉnh ghim trên bản đồ.
 *
 * Chọn gợi ý điền cả địa chỉ lẫn toạ độ. Chạm lên bản đồ thì **chỉ** đổi toạ
 * độ, giữ nguyên ô địa chỉ đang gõ — địa chỉ tra ngược được hiện riêng bên dưới
 * làm đối chiếu. Nếu chạm cũng ghi đè ô địa chỉ thì mỗi lần chỉnh ghim cho chính
 * xác hơn lại xoá mất địa chỉ chủ trọ vừa nhập tay.
 */

/**
 * Nominatim giới hạn 1 request/giây. 500ms cộng với thời gian gõ giữa các phím
 * giữ nhịp gọi dưới ngưỡng đó một cách thoải mái.
 */
const DEBOUNCE_MS = 500;

type Props = {
  address: string;
  onAddressChange: (value: string) => void;
  lat: string;
  lng: string;
  onCoordsChange: (lat: string, lng: string) => void;
};

/** Làm tròn 6 chữ số ≈ 0.1m — thừa sức cho một địa chỉ, mà chuỗi không dài. */
function fmt(value: number): string {
  return value.toFixed(6);
}

export function LocationPicker({ address, onAddressChange, lat, lng, onCoordsChange }: Props) {
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [pinnedLabel, setPinnedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Khoá tìm kiếm sau khi vừa chọn gợi ý, tránh bật lại danh sách ngay. */
  const skipNextSearch = useRef(false);

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const hasPin = lat.trim() !== "" && lng.trim() !== "" && Number.isFinite(latNum) && Number.isFinite(lngNum);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = address.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      setError(null);
      searchPlaces(q, controller.signal)
        .then(setResults)
        .catch((e: unknown) => {
          if (e instanceof Error && e.name === "AbortError") return;
          setError("Không tìm được địa chỉ. Kiểm tra kết nối mạng.");
          setResults([]);
        })
        .finally(() => setSearching(false));
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [address]);

  const choose = useCallback(
    (place: Place) => {
      skipNextSearch.current = true;
      onAddressChange(place.label);
      onCoordsChange(fmt(place.lat), fmt(place.lng));
      setPinnedLabel(null);
      setResults([]);
    },
    [onAddressChange, onCoordsChange],
  );

  const pick = useCallback(
    (pickedLat: number, pickedLng: number) => {
      onCoordsChange(fmt(pickedLat), fmt(pickedLng));
      setPinnedLabel(null);
      reverseLookup(pickedLat, pickedLng)
        .then((place) => setPinnedLabel(place?.label ?? null))
        .catch(() => setPinnedLabel(null));
    },
    [onCoordsChange],
  );

  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Địa chỉ"
        hint="Gõ tối thiểu 3 ký tự để xem gợi ý, rồi chạm lên bản đồ để chỉnh ghim cho chính xác"
      >
        <View>
          <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            value={address}
            onChangeText={onAddressChange}
            placeholder="VD: 123 Lương Ngọc Quyến, Thái Nguyên"
            style={{ paddingLeft: 42 }}
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          ) : null}
        </View>
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((place) => (
            <Pressable
              key={place.id}
              onPress={() => choose(place)}
              style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
            >
              <MapPin size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{place.name}</Text>
                <Text style={styles.resultLabel} numberOfLines={2}>
                  {place.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <LeafletMap
        markers={hasPin ? [{ id: "pin", lat: latNum, lng: lngNum, title: "" }] : []}
        activeId={hasPin ? "pin" : null}
        center={hasPin ? { lat: latNum, lng: lngNum } : undefined}
        zoom={hasPin ? 17 : 13}
        onPick={pick}
        style={{ height: 240 }}
      />

      {hasPin ? (
        <View style={styles.coordRow}>
          <MapPin size={14} color={colors.primary} />
          <Text style={styles.coords}>
            {latNum.toFixed(6)}, {lngNum.toFixed(6)}
          </Text>
        </View>
      ) : (
        <Muted>Chưa ghim vị trí — chạm lên bản đồ hoặc chọn một gợi ý địa chỉ.</Muted>
      )}

      {pinnedLabel ? <Muted>Vị trí đã ghim: {pinnedLabel}</Muted> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchIcon: { position: "absolute", left: 14, top: 15, zIndex: 1 },
  spinner: { position: "absolute", right: 14, top: 14 },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.destructive },
  results: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  result: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultPressed: { backgroundColor: colors.tint100 },
  resultName: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  resultLabel: { fontFamily: font.regular, fontSize: 12, color: colors.mutedForeground },
  coordRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  coords: { fontFamily: font.medium, fontSize: 13, color: colors.mutedForeground },
});
