import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import { colors, font, radius } from "@/theme";
import { PrimaryButton, SecondaryButton, Sheet } from "./ui";
import { formatDate } from "@/lib/format";

/**
 * `<input type="date">` equivalent. Value is an ISO `YYYY-MM-DD` string, the
 * same shape the storage layer and every formatter already expect.
 *
 * The two platforms are split deliberately: Android's picker is a modal
 * dialog that closes itself on pick, while iOS renders inline and needs its
 * own confirm affordance — presenting the iOS one in a sheet keeps the
 * "choose, then commit" flow explicit instead of writing on every scroll tick.
 */
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function parse(value: string | null | undefined): Date {
  if (value) {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return new Date();
}

export function DateField({
  value,
  onChange,
  minimumDate,
  placeholder = "Chọn ngày",
  clearable = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
  placeholder?: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parse(value));

  const openPicker = () => {
    setDraft(parse(value));
    setOpen(true);
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === "set" && date) onChange(toISO(date));
  };

  return (
    <>
      <View style={styles.control}>
        <Pressable
          onPress={openPicker}
          style={({ pressed }) => [styles.controlMain, pressed && { opacity: 0.75 }]}
        >
          <Calendar size={16} color={colors.mutedForeground} />
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value ? formatDate(value) : placeholder}
          </Text>
        </Pressable>
        {clearable && value ? (
          <Pressable onPress={() => onChange("")} hitSlop={10}>
            <Text style={styles.clear}>Xoá</Text>
          </Pressable>
        ) : null}
      </View>

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="calendar"
          minimumDate={minimumDate}
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS !== "android" ? (
        <Sheet open={open} title={placeholder} onClose={() => setOpen(false)}>
          <View style={{ alignItems: "center" }}>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              minimumDate={minimumDate}
              locale="vi-VN"
              onChange={(_, date) => date && setDraft(date)}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SecondaryButton label="Huỷ" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            <PrimaryButton
              label="Chọn"
              onPress={() => {
                onChange(toISO(draft));
                setOpen(false);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </Sheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  controlMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  value: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  placeholder: { fontFamily: font.regular, color: colors.tint400 },
  clear: { fontFamily: font.semibold, fontSize: 12, color: colors.mutedForeground },
});
