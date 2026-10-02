import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react-native";
import { BrandHeader, PageHeading } from "@/components/ScreenHeader";
import { Loading, LoadError } from "@/components/AsyncState";
import {
  AccentButton,
  Card,
  Divider,
  Field,
  Muted,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { claimTenancy } from "@/lib/api/reviews";
import { errorMessage } from "@/lib/errors";
import { triageMaintenance, type MaintenanceTriage } from "@/lib/maintenance-triage";
import { toast } from "@/components/Toast";
import { colors, font, radius } from "@/theme";

export default function AccountScreen() {
  const { user, isLandlord, isAdmin, loading, configured, signOut } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [maintenanceText, setMaintenanceText] = useState("");
  const [maintenance, setMaintenance] = useState<MaintenanceTriage | null>(null);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Đã đăng xuất");
  };

  /**
   * Nhận các hồ sơ người thuê mà chủ trọ đã ghi đúng email của tài khoản này.
   *
   * Đây là bước mở khoá quyền viết đánh giá: app không tự nối hồ sơ vào tài
   * khoản vì chỉ có chủ tài khoản mới xác nhận được "email đó đúng là của
   * tôi", và nếu chủ trọ tự nối được thì họ tự cấp quyền khen phòng mình.
   */
  const handleClaim = async () => {
    setClaiming(true);
    try {
      const linked = await claimTenancy();
      if (linked > 0) {
        toast.success(`Đã nhận ${linked} hồ sơ thuê. Giờ bạn viết được đánh giá cho phòng đó.`);
      } else {
        toast.info("Chưa có hồ sơ nào ghi email này. Nhờ chủ trọ điền email bạn đang đăng nhập.");
      }
    } catch (e) {
      toast.error(errorMessage(e, "Không nhận được hồ sơ"));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        contentContainerStyle={[styles.content, !user && !loading && styles.contentCentered]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeading
          eyebrow="Tài khoản"
          title={user ? "Xin chào" : "Tham gia Roomy"}
          description={
            user
              ? "Quản lý thông tin cá nhân và truy cập bảng điều khiển chủ trọ."
              : "Đăng nhập để lưu phòng yêu thích, đặt lịch xem và quản lý phòng cho thuê."
          }
        />

        {!configured ? (
          <LoadError message="Chưa cấu hình Supabase." />
        ) : loading ? (
          <Loading label="Đang kiểm tra phiên đăng nhập…" />
        ) : user ? (
          <>
            <Card style={{ gap: 14 }}>
              <View style={styles.identity}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user.full_name ?? user.email).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {user.full_name ?? "Người dùng Roomy"}
                  </Text>
                  <Text style={styles.role}>
                    {isAdmin ? "Quản trị viên" : isLandlord ? "Chủ trọ" : "Người tìm trọ"}
                  </Text>
                </View>
              </View>

              <Divider />

              <View style={styles.row}>
                <Mail size={16} color={colors.mutedForeground} />
                <Muted size={13}>{user.email}</Muted>
              </View>
              {user.phone ? (
                <View style={styles.row}>
                  <Phone size={16} color={colors.mutedForeground} />
                  <Muted size={13}>{user.phone}</Muted>
                </View>
              ) : null}
            </Card>

            {isAdmin ? (
              <PrimaryButton
                label="Bảng quản trị hệ thống"
                icon={<ShieldCheck size={16} color={colors.primaryForeground} />}
                onPress={() => router.push("/admin")}
              />
            ) : null}

            {isLandlord ? (
              <PrimaryButton
                label="Quản lý phòng trọ"
                icon={<LayoutDashboard size={16} color={colors.primaryForeground} />}
                onPress={() => router.push("/dashboard")}
              />
            ) : null}

            {isAdmin ? null : (
              <>
                <Card style={{ gap: 12 }}>
                  <View style={styles.cardTitleRow}>
                    <Wrench size={16} color={colors.primary} />
                    <Text style={styles.claimTitle}>Trợ lý báo sự cố</Text>
                  </View>
                  <Muted size={12} style={{ lineHeight: 18 }}>
                    Mô tả lỗi trong phòng, Roomy phân loại mức ưu tiên và soạn tin nhắn gửi chủ trọ.
                  </Muted>
                  <Field label="Mô tả sự cố">
                    <TextInput
                      value={maintenanceText}
                      onChangeText={(value) => {
                        setMaintenanceText(value);
                        setMaintenance(null);
                      }}
                      placeholder="VD: ổ điện gần bàn học bị chập và có mùi khét"
                      multiline
                      maxLength={240}
                    />
                  </Field>
                  <SecondaryButton
                    label="Phân loại sự cố"
                    icon={<Sparkles size={16} color={colors.foreground} />}
                    onPress={() => {
                      const result = triageMaintenance(maintenanceText);
                      setMaintenance(result);
                      if (!result) toast.info("Mô tả thêm một chút để Roomy phân loại chính xác hơn.");
                    }}
                  />
                  {maintenance ? <MaintenanceCard result={maintenance} /> : null}
                </Card>

                <Card style={{ gap: 12 }}>
                  <Text style={styles.claimTitle}>Bạn đang thuê một phòng trên Roomy?</Text>
                  <Muted size={12} style={{ lineHeight: 18 }}>
                    Nhờ chủ trọ điền email {user.email} vào hồ sơ người thuê của bạn, rồi bấm nút
                    dưới đây. Chỉ người đã thuê mới viết được đánh giá cho phòng.
                  </Muted>
                  <SecondaryButton
                    label={claiming ? "Đang kiểm tra…" : "Nhận hồ sơ thuê của tôi"}
                    icon={<KeyRound size={16} color={colors.foreground} />}
                    disabled={claiming}
                    onPress={() => void handleClaim()}
                  />
                </Card>
              </>
            )}

            <SecondaryButton
              label="Đăng xuất"
              icon={<LogOut size={16} color={colors.foreground} />}
              onPress={() => void handleSignOut()}
            />
          </>
        ) : (
          <>
            <Card style={{ alignItems: "center", gap: 14, paddingVertical: 28 }}>
              <View style={styles.avatar}>
                <UserRound size={24} color={colors.accentForeground} />
              </View>
              <Muted style={{ textAlign: "center", lineHeight: 20 }}>
                Chưa đăng nhập. Tạo tài khoản để lưu phòng, đặt lịch xem và quản lý phòng cho thuê.
              </Muted>
            </Card>

            <AccentButton
              label="Đăng nhập / Đăng ký"
              icon={<LogIn size={16} color={colors.primaryForeground} />}
              onPress={() => router.push("/auth")}
            />
          </>
        )}

        <Text style={styles.footerNote}>© 2026 Roomy Vietnam · Thái Nguyên City Office</Text>
      </ScrollView>
    </View>
  );
}

function MaintenanceCard({ result }: { result: MaintenanceTriage }) {
  const tone =
    result.priority === "urgent"
      ? { bg: colors.tint100, fg: colors.destructive, border: colors.borderStrong }
      : result.priority === "soon"
        ? colors.amber
        : colors.blue;

  return (
    <View style={[styles.maintenanceBox, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.maintenanceTitle, { color: tone.fg }]}>
        {result.title} · {result.category}
      </Text>
      <Text style={[styles.maintenanceText, { color: tone.fg }]}>{result.note}</Text>
      <View style={{ gap: 6 }}>
        {result.questions.map((item) => (
          <Text key={item} style={[styles.maintenanceText, { color: tone.fg }]}>
            • {item}
          </Text>
        ))}
      </View>
      <View style={styles.messageBox}>
        <Text style={styles.messageText}>{result.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  contentCentered: { flexGrow: 1, justifyContent: "center" },

  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: font.extrabold,
    fontSize: 22,
    color: colors.accentForeground,
  },
  name: { fontFamily: font.semibold, fontSize: 16, color: colors.foreground },
  claimTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  role: { fontFamily: font.regular, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  maintenanceBox: {
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  maintenanceTitle: { fontFamily: font.semibold, fontSize: 13 },
  maintenanceText: { fontFamily: font.regular, fontSize: 12, lineHeight: 18 },
  messageBox: {
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  messageText: { fontFamily: font.medium, fontSize: 12, lineHeight: 18, color: colors.foreground },

  footerNote: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    textAlign: "center",
    paddingTop: 20,
  },
});
