import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { BadgeCheck, GraduationCap, Heart, ImageOff, Sparkles } from "lucide-react-native";
import type { Room } from "@/lib/api/catalogue";
import type { AiRoomMatch } from "@/lib/ai-room-match";
import { ROOM_STATUS_COLOR, ROOM_STATUS_LABEL } from "@/lib/dashboard-types";
import { formatDistance, formatVND, formatVNDExact } from "@/lib/format";
import { VERIFICATION_COLOR, VERIFICATION_LABEL } from "@/lib/verification";
import { useFavorites } from "@/hooks/use-favorites";
import { colors, font, radius, shadow } from "@/theme";
import { Badge } from "./ui";

export function RoomCard({ room, match }: { room: Room; match?: AiRoomMatch | null }) {
  const { has, toggle } = useFavorites();
  const fav = has(room.id);

  return (
    <View style={[styles.card, shadow.card]}>
      <Link href={{ pathname: "/room/[id]", params: { id: room.id } }} asChild>
        <Pressable style={({ pressed }) => [styles.cardLink, pressed && { opacity: 0.9 }]}>
          <View>
            {room.image ? (
              <Image source={{ uri: room.image }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.imageFallback]}>
                <ImageOff size={28} color={colors.tint400} />
              </View>
            )}
          </View>

          <View style={styles.body}>
            <View style={styles.badges}>
              <Badge
                label={ROOM_STATUS_LABEL[room.status]}
                bg={ROOM_STATUS_COLOR[room.status].bg}
                fg={ROOM_STATUS_COLOR[room.status].fg}
              />
              <Badge
                label={VERIFICATION_LABEL[room.verification]}
                bg={VERIFICATION_COLOR[room.verification].bg}
                fg={VERIFICATION_COLOR[room.verification].fg}
                icon={
                  room.verification === "verified" ? (
                    <BadgeCheck size={12} color={VERIFICATION_COLOR.verified.fg} />
                  ) : undefined
                }
              />
              {room.district ? (
                <Badge label={room.district} bg={colors.primarySoft} fg={colors.accent} />
              ) : null}
              {room.size ? <Badge label={`${room.size} m²`} /> : null}
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {room.title}
            </Text>

            {room.distanceToSchool != null ? (
              <View style={styles.schoolRow}>
                <GraduationCap size={14} color={colors.primary} />
                <Text style={styles.schoolText} numberOfLines={1}>
                  Cách {room.school || "trường"} {formatDistance(room.distanceToSchool)}
                </Text>
              </View>
            ) : null}
            {room.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {room.description}
              </Text>
            ) : null}
            {room.electricityRate != null && room.waterRate != null ? (
              <Text style={styles.utilityText} numberOfLines={1}>
                Điện {formatVNDExact(room.electricityRate)}/kWh · Nước{" "}
                {formatVNDExact(room.waterRate)}/m³
              </Text>
            ) : null}
            {match ? <AiMatchBox match={match} /> : null}

            <View style={styles.footer}>
              <Text style={styles.price}>
                {formatVND(room.price)}
                <Text style={styles.perMonth}>/tháng</Text>
              </Text>
              <Text style={styles.cta}>Xem chi tiết →</Text>
            </View>
          </View>
        </Pressable>
      </Link>
      <Pressable
        onPress={() => toggle(room.id)}
        accessibilityRole="button"
        accessibilityLabel={fav ? "Bỏ khỏi yêu thích" : "Lưu vào yêu thích"}
        hitSlop={8}
        style={styles.favButton}
      >
        <Heart
          size={18}
          color={fav ? colors.primary : colors.foreground}
          fill={fav ? colors.primary : "transparent"}
        />
      </Pressable>
    </View>
  );
}

function AiMatchBox({ match }: { match: AiRoomMatch }) {
  const tone =
    match.score >= 82 ? colors.emerald : match.score >= 65 ? colors.blue : colors.amber;

  return (
    <View style={[styles.matchBox, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={styles.matchHead}>
        <Sparkles size={14} color={tone.fg} />
        <Text style={[styles.matchTitle, { color: tone.fg }]}>
          {match.label} · {match.score}/100
        </Text>
      </View>
      {match.reasons.length > 0 ? (
        <Text style={[styles.matchText, { color: tone.fg }]} numberOfLines={2}>
          Hợp vì {match.reasons.join(", ")}.
        </Text>
      ) : null}
      {match.cautions.length > 0 ? (
        <Text style={[styles.matchText, { color: tone.fg }]} numberOfLines={2}>
          Kiểm tra: {match.cautions.join(", ")}.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius["3xl"],
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardLink: { backgroundColor: colors.card },
  image: {
    width: "100%",
    aspectRatio: 16 / 10,
    backgroundColor: colors.tint200,
  },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  favButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.scrim,
  },
  body: { padding: 16, gap: 8 },
  schoolRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  schoolText: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.primary,
  },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  title: {
    fontFamily: font.extrabold,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  description: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  utilityText: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.foreground,
  },
  matchBox: {
    gap: 4,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  matchHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  matchTitle: { fontFamily: font.semibold, fontSize: 12 },
  matchText: { fontFamily: font.regular, fontSize: 11, lineHeight: 16 },
  footer: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  price: { fontFamily: font.bold, fontSize: 20, color: colors.primary },
  perMonth: { fontFamily: font.regular, fontSize: 13, color: colors.mutedForeground },
  cta: { fontFamily: font.semibold, fontSize: 13, color: colors.foreground },
});
