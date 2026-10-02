import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { Check, LogIn, Sparkles } from "lucide-react-native";
import {
  AccentButton,
  Card,
  Display,
  EmptyState,
  Field,
  Muted,
  SecondaryButton,
  Select,
  TextInput,
} from "@/components/ui";
import { DateField } from "@/components/DateField";
import { Loading, LoadError } from "@/components/AsyncState";
import { toast } from "@/components/Toast";
import { createBooking, statusLabel, TIME_SLOTS, type Booking } from "@/lib/api/bookings";
import { getRoom, type Room } from "@/lib/api/catalogue";
import { formatDate, today } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { buildBookingNote } from "@/lib/booking-note-assistant";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/hooks/use-auth";
import { colors, font, radius } from "@/theme";

const SLOTS: readonly string[] = TIME_SLOTS;

const schema = z.object({
  name: z.string().trim().min(2, "Vui lòng nhập họ tên (ít nhất 2 ký tự)").max(80, "Tên quá dài"),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => /^(0|\+84)\d{9,10}$/.test(value.replace(/\s+/g, "")),
      "Số điện thoại không hợp lệ",
    )
    .transform((value) => value.replace(/\s+/g, "")),
  date: z.string().superRefine((d, ctx) => {
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Vui lòng chọn ngày" });
    } else if (d < today()) {
      ctx.addIssue({ code: "custom", message: "Ngày phải từ hôm nay trở đi" });
    }
  }),
  // `z.enum` would reject the empty initial value with its own wording; a
  // refine keeps the "please choose" message the user actually needs.
  time: z.string().refine((t) => SLOTS.includes(t), "Vui lòng chọn khung giờ"),
  note: z.string().trim().max(280, "Ghi chú tối đa 280 ký tự").optional(),
});

export default function BookScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user, loading: authLoading } = useAuth();

  const fetcher = useCallback(
    async (): Promise<Room | null> => (roomId ? getRoom(roomId) : null),
    [roomId],
  );
  const { data: room, loading, error, reload } = useAsync<Room | null>(fetcher, null);

  const [form, setForm] = useState({ name: "", phone: "", date: "", time: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Booking | null>(null);

  // Prefill from the profile — the landlord needs a name and number, and the
  // account already has both.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || (user.full_name ?? ""),
      phone: f.phone || (user.phone ?? ""),
    }));
  }, [user]);

  const set = <K extends keyof typeof form>(k: K, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const onSubmit = async () => {
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errs[issue.path[0] as string] = issue.message;
      }
      setErrors(errs);
      return;
    }
    if (!room) return;

    setSubmitting(true);
    try {
      setSubmitted(
        await createBooking({
          listingId: room.id,
          name: result.data.name,
          phone: result.data.phone,
          date: result.data.date,
          time: result.data.time,
          note: result.data.note ?? null,
        }),
      );
    } catch (e) {
      toast.error(errorMessage(e, "Không gửi được yêu cầu"));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (loading && !room)) {
    return (
      <View style={styles.screen}>
        <Loading />
      </View>
    );
  }

  // Bookings are rows owned by an account: RLS has no way to attribute an
  // anonymous one, so the screen asks for a sign-in before the form.
  if (!user) {
    return (
      <View style={[styles.screen, { padding: 20, justifyContent: "center" }]}>
        <EmptyState
          icon={<LogIn size={44} color={colors.tint400} />}
          title="Cần đăng nhập"
          description="Đặt lịch xem phòng cần tài khoản để chủ trọ biết ai đang hỏi và phản hồi lại bạn."
          action={<AccentButton label="Đăng nhập" onPress={() => router.replace("/auth")} />}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { padding: 20 }]}>
        <LoadError message={error} onRetry={() => void reload()} />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={[styles.screen, { justifyContent: "center", padding: 32 }]}>
        <Display size={22} style={{ textAlign: "center" }}>
          Không tìm thấy phòng
        </Display>
        <SecondaryButton label="Đóng" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (room.status !== "available") {
    return (
      <View style={[styles.screen, { justifyContent: "center", padding: 32 }]}>
        <Display size={22} style={{ textAlign: "center" }}>
          Phòng hiện không nhận lịch xem
        </Display>
        <Muted style={{ textAlign: "center", marginTop: 8, marginBottom: 24 }}>
          Phòng đã có người thuê hoặc đang được bảo trì. Vui lòng chọn phòng khác.
        </Muted>
        <SecondaryButton label="Đóng" onPress={() => router.back()} />
      </View>
    );
  }

  if (submitted) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <View style={styles.tick}>
            <Check size={26} color={colors.accentForeground} />
          </View>
          <Display size={24}>Đã gửi yêu cầu</Display>
          <Muted style={{ textAlign: "center", lineHeight: 20 }}>
            Yêu cầu đã được gửi tới chủ trọ. Bạn sẽ thấy trạng thái đổi thành “Đã xác nhận” ở mục
            Lịch khi họ duyệt.
          </Muted>
        </View>

        <Card style={{ gap: 10, backgroundColor: colors.tint50 }}>
          <SummaryRow label="Phòng" value={submitted.roomTitle} />
          <SummaryRow
            label="Thời gian"
            value={`${formatDate(submitted.date)} · ${submitted.time}`}
          />
          <SummaryRow label="Liên hệ" value={`${submitted.name} · ${submitted.phone}`} />
          <SummaryRow label="Trạng thái" value={statusLabel(submitted.status)} />
        </Card>

        <View style={{ gap: 10 }}>
          <AccentButton
            label="Xem lịch của tôi"
            size="lg"
            // `replace` swaps the modal for the tab in one step; a `back()`
            // followed by a `push` races the dismissal animation.
            onPress={() => router.replace("/bookings")}
          />
          <SecondaryButton label="Đóng" size="lg" onPress={() => router.back()} />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Display size={24}>Đặt lịch xem phòng</Display>
          <Muted style={{ marginTop: 6 }} numberOfLines={2}>
            {room.title}
          </Muted>
        </View>

        <Field label="Họ và tên" error={errors.name}>
          <TextInput
            value={form.name}
            onChangeText={(v) => set("name", v)}
            placeholder="Nguyễn Văn A"
            maxLength={80}
            autoComplete="name"
          />
        </Field>

        <Field label="Số điện thoại" error={errors.phone}>
          <TextInput
            value={form.phone}
            onChangeText={(v) => set("phone", v)}
            placeholder="0912345678"
            keyboardType="phone-pad"
            maxLength={16}
            autoComplete="tel"
          />
        </Field>

        <Field label="Ngày xem" error={errors.date}>
          <DateField
            value={form.date}
            onChange={(v) => set("date", v)}
            minimumDate={new Date()}
            placeholder="Chọn ngày xem"
          />
        </Field>

        <Field label="Khung giờ" error={errors.time}>
          <Select
            title="Khung giờ"
            value={form.time}
            onChange={(v) => set("time", v)}
            options={TIME_SLOTS.map((t) => ({ label: t, value: t }))}
            placeholder="Chọn giờ"
          />
        </Field>

        <Field label="Ghi chú (tuỳ chọn)" hint={`${form.note.length}/280`} error={errors.note}>
          <SecondaryButton
            label="Gợi ý ghi chú"
            icon={<Sparkles size={16} color={colors.foreground} />}
            onPress={() => set("note", buildBookingNote(room))}
            style={{ alignSelf: "flex-start", marginBottom: 8 }}
          />
          <TextInput
            value={form.note}
            onChangeText={(v) => set("note", v)}
            placeholder="Ví dụ: cần xem bếp và ban công..."
            maxLength={280}
            multiline
          />
        </Field>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <SecondaryButton label="Hủy" onPress={() => router.back()} style={{ flex: 1 }} />
          <AccentButton
            label={submitting ? "Đang gửi…" : "Gửi yêu cầu"}
            disabled={submitting}
            onPress={() => void onSubmit()}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48, gap: 18 },

  tick: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  summaryLabel: {
    flexShrink: 0,
    width: 92,
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    paddingTop: 2,
  },
  summaryValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.foreground,
  },
});
