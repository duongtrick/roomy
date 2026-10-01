import { useCallback, useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Check,
  GraduationCap,
  Heart,
  ImageOff,
  MapPin,
  Navigation,
  Phone,
  ShieldQuestion,
  Star,
} from "lucide-react-native";
import { RoomMiniMap } from "@/components/RoomsMap";
import { ReviewComposer } from "@/components/ReviewComposer";
import { toast } from "@/components/Toast";
import { Loading, LoadError } from "@/components/AsyncState";
import {
  AccentButton,
  Badge,
  Card,
  Display,
  Divider,
  Muted,
  SecondaryButton,
} from "@/components/ui";
import { getRoom, getRooms, type Room } from "@/lib/api/catalogue";
import { getReviewState, type ReviewState } from "@/lib/api/reviews";
import { ROOM_STATUS_COLOR, ROOM_STATUS_LABEL } from "@/lib/dashboard-types";
import { formatDistance, formatVND, formatVNDExact } from "@/lib/format";
import { hasCoords, openDirections } from "@/lib/maps-link";
import { VERIFICATION_COLOR, VERIFICATION_LABEL, VERIFICATION_NOTE } from "@/lib/verification";
import { useAsync } from "@/hooks/use-async";
import { useFavorites } from "@/hooks/use-favorites";
import { colors, font, radius, shadow } from "@/theme";

type Detail = { room: Room | null; related: Room[] };
const EMPTY: Detail = { room: null, related: [] };
const NO_REVIEW: ReviewState = { canReview: false, mine: null };

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { has, toggle } = useFavorites();
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [id]);

  // One fetcher for both so the screen has a single loading and error state
  // rather than a header that renders while the "related" strip is still
  // spinning underneath it.
  const fetcher = useCallback(async (): Promise<Detail> => {
    if (!id) return EMPTY;
    const [room, all] = await Promise.all([getRoom(id), getRooms()]);
    return { room, related: all.filter((r) => r.id !== id).slice(0, 3) };
  }, [id]);

  const { data, loading, error, reload } = useAsync(fetcher, EMPTY);

  // Quyền đánh giá tải riêng: nó phụ thuộc vào người đang đăng nhập chứ không
  // phải vào căn phòng, và một lỗi ở đây không được phép làm hỏng cả trang.
  const reviewFetcher = useCallback(
    () => (id ? getReviewState(id) : Promise.resolve(NO_REVIEW)),
    [id],
  );
  const { data: reviewState, reload: reloadReviewState } = useAsync(reviewFetcher, NO_REVIEW);

  const room = data.room;

  if (loading && !room) {
    return (
      <View style={styles.screen}>
        <BackButton top={insets.top + 8} />
        <Loading label="Đang tải thông tin phòng…" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <BackButton top={insets.top + 8} />
        <View style={{ padding: 16, paddingTop: insets.top + 64 }}>
          <LoadError message={error} onRetry={() => void reload()} />
        </View>
      </View>
    );
  }

  if (!room) {
    return (
      <View style={[styles.screen, styles.missing]}>
        <Display size={26} style={{ textAlign: "center" }}>
          Không tìm thấy phòng
        </Display>
        <Muted style={{ textAlign: "center", marginTop: 8, marginBottom: 24 }}>
          Phòng bạn tìm kiếm không tồn tại hoặc đã được gỡ khỏi danh sách.
        </Muted>
        <AccentButton label="Về trang chủ" onPress={() => router.replace("/")} />
      </View>
    );
  }

  const fav = has(room.id);
  const phone = room.landlord.phone.replace(/\s/g, "");
  const cover = room.gallery[active] ?? room.image;
  const canBook = room.status === "available";

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom + 76 }}
      >
        <View>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.hero} resizeMode="cover" />
          ) : (
            <View style={[styles.hero, styles.imageFallback]}>
              <ImageOff size={36} color={colors.tint400} />
            </View>
          )}

          <View style={[styles.heroBar, { top: insets.top + 8 }]}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              style={styles.circleButton}
              accessibilityLabel="Quay lại"
            >
              <ArrowLeft size={20} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={() => toggle(room.id)}
              style={styles.circleButton}
              accessibilityLabel={fav ? "Bỏ khỏi yêu thích" : "Lưu vào yêu thích"}
            >
              <Heart
                size={20}
                color={fav ? colors.primary : colors.foreground}
                fill={fav ? colors.primary : "transparent"}
              />
            </Pressable>
          </View>
        </View>

        {room.gallery.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbs}
          >
            {room.gallery.map((src, i) => (
              <Pressable key={src} onPress={() => setActive(i)}>
                <Image
                  source={{ uri: src }}
                  style={[styles.thumb, active === i && styles.thumbActive]}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.body}>
          <View style={styles.badges}>
            <Badge
              label={ROOM_STATUS_LABEL[room.status]}
              bg={ROOM_STATUS_COLOR[room.status].bg}
              fg={ROOM_STATUS_COLOR[room.status].fg}
            />
            {room.district ? (
              <Badge label={room.district} bg={colors.primarySoft} fg={colors.accent} />
            ) : null}
            {room.size ? <Badge label={`${room.size} m²`} /> : null}
          </View>

          <Display size={28} style={{ lineHeight: 34 }}>
            {room.title}
          </Display>

          <View style={{ gap: 8 }}>
            <View style={styles.metaRow}>
              <MapPin size={15} color={colors.mutedForeground} />
              <Muted size={13} style={{ flex: 1 }}>
                {room.address}
              </Muted>
            </View>

            {room.distanceToSchool != null ? (
              <View style={styles.metaRow}>
                <GraduationCap size={15} color={colors.primary} />
                <Text style={styles.schoolText}>
                  Cách {room.school || "trường"} {formatDistance(room.distanceToSchool)}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.verifyBox,
                {
                  backgroundColor: VERIFICATION_COLOR[room.verification].bg,
                  borderColor: VERIFICATION_COLOR[room.verification].border,
                },
              ]}
            >
              {room.verification === "verified" ? (
                <BadgeCheck size={18} color={VERIFICATION_COLOR.verified.fg} />
              ) : (
                <ShieldQuestion size={18} color={VERIFICATION_COLOR[room.verification].fg} />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.verifyTitle, { color: VERIFICATION_COLOR[room.verification].fg }]}
                >
                  {VERIFICATION_LABEL[room.verification]}
                </Text>
                <Text
                  style={[styles.verifyNote, { color: VERIFICATION_COLOR[room.verification].fg }]}
                >
                  {VERIFICATION_NOTE[room.verification]}
                </Text>
              </View>
            </View>
          </View>

          <Card style={[styles.priceCard, shadow.card]}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
              <Text style={styles.price}>{formatVND(room.price)}</Text>
              <Muted size={14}>/tháng</Muted>
            </View>
            <Text style={styles.priceNote}>Giá đã bao gồm phí dịch vụ</Text>

            {phone ? (
              <SecondaryButton
                label="Gọi chủ trọ"
                size="lg"
                icon={<Phone size={16} color={colors.foreground} />}
                onPress={() => void Linking.openURL(`tel:${phone}`)}
              />
            ) : null}

            <Divider style={{ marginVertical: 4 }} />

            <Text style={styles.blockLabel}>Chủ nhà trọ</Text>
            <View style={styles.landlord}>
              <View style={styles.landlordAvatar}>
                <Text style={styles.landlordInitial}>{room.landlord.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.landlordName}>{room.landlord.name}</Text>
                {room.landlord.rating > 0 ? (
                  <View style={styles.metaRow}>
                    <Star size={12} color={colors.primary} fill={colors.primary} />
                    <Muted size={12}>{room.landlord.rating} đánh giá</Muted>
                  </View>
                ) : null}
              </View>
              {room.landlord.phone ? (
                <Text style={styles.phone}>{room.landlord.phone}</Text>
              ) : null}
            </View>
          </Card>

          {room.description ? (
            <Section title="Mô tả">
              <Muted style={{ lineHeight: 22 }}>{room.description}</Muted>
            </Section>
          ) : null}

          {room.electricityRate != null && room.waterRate != null ? (
            <Section title="Chi phí sử dụng">
              <View style={styles.costGrid}>
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Điện</Text>
                  <Text style={styles.costValue}>{formatVNDExact(room.electricityRate)}/kWh</Text>
                </View>
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Nước</Text>
                  <Text style={styles.costValue}>{formatVNDExact(room.waterRate)}/m³</Text>
                </View>
              </View>
            </Section>
          ) : null}

          {room.amenities.length > 0 ? (
            <Section title="Tiện ích">
              <View style={styles.amenityGrid}>
                {room.amenities.map((a) => (
                  <View key={a} style={styles.amenity}>
                    <Check size={16} color={colors.primary} />
                    <Text style={styles.amenityLabel} numberOfLines={1}>
                      {a}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          <Section title="Đánh giá từ người thuê" meta={`${room.reviews.length} nhận xét`}>
            <ReviewComposer
              listingId={room.id}
              state={reviewState}
              onSaved={async () => {
                await Promise.all([reload(), reloadReviewState()]);
              }}
            />

            {room.reviews.length === 0 ? (
              <Muted size={13}>Chưa có đánh giá nào cho phòng này.</Muted>
            ) : (
              <View style={{ gap: 12 }}>
                {room.reviews.map((r) => (
                  <Card key={r.id} style={{ gap: 8 }}>
                    <View style={styles.reviewHead}>
                      <Text style={styles.reviewAuthor}>{r.author}</Text>
                      <Text style={styles.reviewDate}>{r.date}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {Array.from({ length: r.rating }).map((_, k) => (
                        <Star key={k} size={14} color={colors.primary} fill={colors.primary} />
                      ))}
                    </View>
                    <Text style={styles.reviewBody}>“{r.comment}”</Text>
                  </Card>
                ))}
              </View>
            )}
          </Section>

          <Section title="Vị trí trên bản đồ">
            <RoomMiniMap lat={room.lat} lng={room.lng} style={{ height: 180 }} />
            <SecondaryButton
              label="Chỉ đường"
              icon={<Navigation size={16} color={colors.primary} />}
              style={{ marginTop: 12 }}
              onPress={() => {
                if (!hasCoords(room.lat, room.lng)) {
                  toast.error("Phòng này chưa có toạ độ bản đồ.");
                  return;
                }
                openDirections(room.lat, room.lng).catch(() =>
                  toast.error("Không mở được Google Maps trên thiết bị này."),
                );
              }}
            />
          </Section>

          {data.related.length > 0 ? (
            <Section title="Có thể bạn quan tâm">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {data.related.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => router.push({ pathname: "/room/[id]", params: { id: r.id } })}
                    style={({ pressed }) => [styles.related, pressed && { opacity: 0.85 }]}
                  >
                    {r.image ? (
                      <Image source={{ uri: r.image }} style={styles.relatedImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.relatedImage, styles.imageFallback]}>
                        <ImageOff size={20} color={colors.tint400} />
                      </View>
                    )}
                    <Display size={15} numberOfLines={2} style={{ marginTop: 8 }}>
                      {r.title}
                    </Display>
                    <Text style={styles.relatedPrice}>
                      {formatVND(r.price)}
                      <Text style={{ fontFamily: font.regular, color: colors.mutedForeground }}>
                        /tháng
                      </Text>
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.stickyBar, shadow.lifted, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stickyLabel}>Giá thuê</Text>
          <Text style={styles.stickyPrice}>
            {formatVND(room.price)}
            <Text style={styles.stickyPerMonth}>/tháng</Text>
          </Text>
        </View>
        <AccentButton
          label={canBook ? "Đặt lịch xem phòng" : ROOM_STATUS_LABEL[room.status]}
          size="lg"
          icon={<Calendar size={16} color={colors.primaryForeground} />}
          disabled={!canBook}
          style={{ flex: 1.3 }}
          onPress={() => router.push({ pathname: "/book/[roomId]", params: { roomId: room.id } })}
        />
      </View>
    </View>
  );
}

function BackButton({ top }: { top: number }) {
  return (
    <View style={[styles.heroBar, { top }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={styles.circleButton}
        accessibilityLabel="Quay lại"
      >
        <ArrowLeft size={20} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.sectionHead}>
        <Display size={20} style={{ flex: 1 }}>
          {title}
        </Display>
        {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  missing: { justifyContent: "center", paddingHorizontal: 32 },

  hero: { width: "100%", height: 300, backgroundColor: colors.tint200 },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  heroBar: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 2,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.scrim,
  },

  thumbs: { gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  thumb: {
    width: 96,
    height: 68,
    borderRadius: radius.lg,
    backgroundColor: colors.tint200,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbActive: { borderColor: colors.primary },

  body: { paddingHorizontal: 16, paddingTop: 8, gap: 24 },
  schoolText: { fontFamily: font.medium, fontSize: 13, color: colors.primary, flex: 1 },
  verifyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginTop: 4,
  },
  verifyTitle: { fontFamily: font.semibold, fontSize: 13 },
  verifyNote: { fontFamily: font.regular, fontSize: 11, lineHeight: 16, marginTop: 2, opacity: 0.9 },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  priceCard: { gap: 12, borderRadius: radius["3xl"], padding: 20 },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  stickyLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  stickyPrice: { fontFamily: font.extrabold, fontSize: 20, color: colors.primary },
  stickyPerMonth: { fontFamily: font.regular, fontSize: 12, color: colors.mutedForeground },
  price: { fontFamily: font.extrabold, fontSize: 32, color: colors.primary },
  priceNote: {
    fontFamily: font.regular,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  blockLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  landlord: { flexDirection: "row", alignItems: "center", gap: 12 },
  landlordAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  landlordInitial: { fontFamily: font.extrabold, fontSize: 19, color: colors.accentForeground },
  landlordName: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  phone: { fontFamily: font.medium, fontSize: 12, color: colors.mutedForeground },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  sectionMeta: { fontFamily: font.medium, fontSize: 11, color: colors.mutedForeground },

  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: "47%",
    flexGrow: 1,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  amenityLabel: { flexShrink: 1, fontFamily: font.medium, fontSize: 14, color: colors.foreground },

  costGrid: { flexDirection: "row", gap: 10 },
  costItem: {
    flex: 1,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  costLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  costValue: {
    marginTop: 6,
    fontFamily: font.semibold,
    fontSize: 15,
    color: colors.foreground,
  },

  reviewHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewAuthor: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  reviewDate: { fontFamily: font.medium, fontSize: 11, color: colors.mutedForeground },
  reviewBody: {
    fontFamily: font.italic,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },

  related: { width: 160 },
  relatedImage: {
    width: 160,
    height: 120,
    borderRadius: radius["2xl"],
    backgroundColor: colors.tint200,
  },
  relatedPrice: { fontFamily: font.bold, fontSize: 13, color: colors.primary, marginTop: 4 },
});
