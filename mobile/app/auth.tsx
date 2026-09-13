import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Lock, Mail, Phone, UserRound } from "lucide-react-native";
import { AccentButton, Display, Field, Muted, TextInput } from "@/components/ui";
import { LoadError } from "@/components/AsyncState";
import { toast } from "@/components/Toast";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage } from "@/lib/errors";
import { colors, font, radius } from "@/theme";

type Mode = "login" | "signup";
type Role = "tenant" | "landlord";

export default function AuthScreen() {
  const { user, configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("tenant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // `onAuthStateChange` lands after the request resolves, so leaving is driven
  // by the session rather than by the submit handler.
  useEffect(() => {
    if (user) router.back();
  }, [user]);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const result = await signUp({ email, password, full_name: fullName, phone, role });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.needsConfirmation) {
          toast.info("Kiểm tra email để xác nhận tài khoản, rồi đăng nhập.");
          setMode("login");
          return;
        }
        toast.success("Đăng ký thành công!");
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Đăng nhập thành công!");
      }
    } catch (err) {
      toast.error(errorMessage(err, "Có lỗi xảy ra"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!configured) {
    return (
      <View style={[styles.screen, { padding: 20, justifyContent: "center" }]}>
        <LoadError message="Chưa cấu hình Supabase." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.segment}>
          {(["login", "signup"] as const).map((m) => {
            const on = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.segmentItem, on && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentLabel, on && styles.segmentLabelActive]}>
                  {m === "login" ? "Đăng nhập" : "Đăng ký"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View>
          <Display size={26}>{mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản"}</Display>
          <Muted style={{ marginTop: 6 }}>
            {mode === "login"
              ? "Tiếp tục hành trình tìm chốn an cư."
              : "Tham gia cộng đồng Roomy hôm nay."}
          </Muted>
        </View>

        {mode === "signup" ? (
          <>
            <Field label="Bạn là">
              <View style={styles.roleRow}>
                {(
                  [
                    { key: "tenant", label: "🔍 Người tìm trọ" },
                    { key: "landlord", label: "🏠 Chủ trọ" },
                  ] as const
                ).map((r) => {
                  const on = role === r.key;
                  return (
                    <Pressable
                      key={r.key}
                      onPress={() => setRole(r.key)}
                      style={[styles.roleItem, on && styles.roleItemActive]}
                    >
                      <Text style={[styles.roleLabel, on && { color: colors.primary }]}>
                        {r.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="Họ và tên">
              <IconInput
                icon={<UserRound size={16} color={colors.mutedForeground} />}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
              />
            </Field>

            <Field label="Số điện thoại">
              <IconInput
                icon={<Phone size={16} color={colors.mutedForeground} />}
                value={phone}
                onChangeText={setPhone}
                placeholder="0912 345 678"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </Field>
          </>
        ) : null}

        <Field label="Email">
          <IconInput
            icon={<Mail size={16} color={colors.mutedForeground} />}
            value={email}
            onChangeText={setEmail}
            placeholder="ban@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </Field>

        <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự">
          <IconInput
            icon={<Lock size={16} color={colors.mutedForeground} />}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••"
            secureTextEntry
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </Field>

        <AccentButton
          label={submitting ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
          disabled={submitting}
          onPress={() => void submit()}
          size="lg"
        />

        {mode === "signup" ? (
          <Muted size={11} style={{ textAlign: "center" }}>
            Vai trò chọn ở đây quyết định bạn thấy bảng điều khiển chủ trọ hay không, và không tự
            đổi được về sau.
          </Muted>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Text field with a leading glyph. */
function IconInput({
  icon,
  ...props
}: { icon: React.ReactNode } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.iconInput}>
      <View style={styles.iconInputGlyph}>{icon}</View>
      <TextInput {...props} style={styles.iconInputControl} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48, gap: 20 },

  segment: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: radius.full,
    backgroundColor: colors.tint100,
  },
  segmentItem: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  segmentItemActive: { backgroundColor: colors.card },
  segmentLabel: { fontFamily: font.medium, fontSize: 14, color: colors.mutedForeground },
  segmentLabelActive: { fontFamily: font.semibold, color: colors.foreground },

  roleRow: { flexDirection: "row", gap: 10 },
  roleItem: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  roleItemActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  roleLabel: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
  },

  iconInput: { justifyContent: "center" },
  iconInputGlyph: { position: "absolute", left: 16, zIndex: 1 },
  iconInputControl: { paddingLeft: 44 },
});
