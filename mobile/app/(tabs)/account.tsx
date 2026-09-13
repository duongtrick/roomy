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
  UserRound,
} from "lucide-react-native";
import { BrandHeader, PageHeading } from "@/components/ScreenHeader";
import { Loading, LoadError } from "@/components/AsyncState";
import {
  AccentButton,
  Card,
  Divider,
  Muted,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { claimTenancy } from "@/lib/api/reviews";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/components/Toast";
import { colors, font, radius } from "@/theme";

export default function AccountScreen() {
  const { user, isLandlord, isAdmin, loading, configured, signOut } = useAuth();
  const [claiming, setClaiming] = useState(false);

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
