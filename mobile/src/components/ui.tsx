import { useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronDown, X } from "lucide-react-native";
import { colors, font, radius, shadow } from "@/theme";

/* ------------------------------------------------------------------ text */

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Display({
  children,
  size = 24,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[styles.display, { fontSize: size, lineHeight: Math.round(size * 1.2) }, style]}
    >
      {children}
    </Text>
  );
}

export function Eyebrow({
  children,
  color = colors.primary,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.eyebrow, { color }, style]}>{children}</Text>;
}

export function Muted({
  children,
  size = 14,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: font.regular, fontSize: size, color: colors.mutedForeground }, style]}
    >
      {children}
    </Text>
  );
}

/* ---------------------------------------------------------------- badges */

export function Badge({
  label,
  bg = colors.tint100,
  fg = colors.mutedForeground,
  border,
  icon,
}: {
  label: string;
  bg?: string;
  fg?: string;
  border?: string;
  icon?: ReactNode;
}) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: border ?? "transparent", borderWidth: border ? 1 : 0 },
      ]}
    >
      {icon}
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/* --------------------------------------------------------------- buttons */

type ButtonProps = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: "md" | "lg";
};

export function PrimaryButton({ label, onPress, icon, disabled, style, size = "md" }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        size === "lg" && styles.buttonLg,
        { backgroundColor: colors.primaryDeep },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonLabel, { color: colors.primaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

export function AccentButton({ label, onPress, icon, disabled, style, size = "md" }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        size === "lg" && styles.buttonLg,
        { backgroundColor: colors.primary },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonLabel, { color: colors.primaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  disabled,
  style,
  size = "md",
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        size === "lg" && styles.buttonLg,
        styles.buttonOutline,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

/** Square 44px icon button — the minimum comfortable touch target. */
export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

/* ----------------------------------------------------------------- forms */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/**
 * Controls are 48pt tall throughout. The web build shrank them to 40px on
 * pointer devices; on a phone there is no such case, so one size is enough.
 */
export function TextInput({ style, multiline, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <RNTextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={colors.tint400}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        styles.control,
        multiline && styles.controlMultiline,
        focused && styles.controlFocused,
        style,
      ]}
    />
  );
}

export type Option = { label: string; value: string };

/**
 * Stand-in for `<select>`: a control that opens a sheet of options.
 *
 * A platform `Picker` was avoided on purpose — it renders as a wheel on iOS
 * and a dropdown on Android, so the same screen would look different on each,
 * and neither matches the rest of this form styling.
 */
export function Select({
  value,
  options,
  onChange,
  placeholder = "— Chọn —",
  title,
  disabled,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={({ pressed }) => [
          styles.control,
          styles.selectControl,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.selectValue,
            !current && { color: colors.tint400, fontFamily: font.regular },
          ]}
        >
          {current?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </Pressable>

      <Sheet open={open} title={title ?? "Chọn"} onClose={() => setOpen(false)}>
        <View style={{ paddingBottom: 8 }}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
              >
                <Text style={[styles.optionLabel, active && { fontFamily: font.semibold }]}>
                  {o.label}
                </Text>
                {active ? <Check size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

/* ---------------------------------------------------------------- sheets */

/**
 * Bottom sheet used for every dialog and form in the app.
 *
 * `Modal` is used rather than a router modal route so a sheet can be opened
 * from inside a screen that is itself already presented modally — the
 * dashboard's room detail opens the meter form that way.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng" />
        <View style={[styles.sheet, shadow.lifted, { maxHeight: "88%" }]}>
          <View style={styles.grabHandleWrap}>
            <View style={styles.grabHandle} />
          </View>

          <View style={styles.sheetHeader}>
            <Display size={20} style={{ flex: 1 }} numberOfLines={1}>
              {title}
            </Display>
            <IconButton onPress={onClose} accessibilityLabel="Đóng">
              <X size={20} color={colors.mutedForeground} />
            </IconButton>
          </View>

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingVertical: 18,
              paddingBottom: footer ? 18 : 18 + insets.bottom,
              gap: 16,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {footer ? (
            <View style={[styles.sheetFooter, { paddingBottom: 12 + insets.bottom }]}>{footer}</View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------ empty/misc */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={{ marginBottom: 12 }}>{icon}</View>
      <Display size={22} style={{ textAlign: "center", marginBottom: 8 }}>
        {title}
      </Display>
      <Muted style={{ textAlign: "center", marginBottom: action ? 20 : 0 }}>{description}</Muted>
      {action}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  title: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: colors.foreground,
  },
  display: {
    fontFamily: font.extrabold,
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: radius.full,
  },
  buttonLg: { height: 54 },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buttonLabel: {
    fontFamily: font.semibold,
    fontSize: 15,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },

  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },

  fieldLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  fieldHint: { fontFamily: font.regular, fontSize: 11, color: colors.mutedForeground },
  fieldError: { fontFamily: font.medium, fontSize: 12, color: colors.destructive },

  control: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.foreground,
  },
  controlMultiline: {
    height: undefined,
    minHeight: 96,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  controlFocused: { borderColor: colors.primary },
  selectControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectValue: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 15,
    color: colors.foreground,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.foreground,
  },

  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius["3xl"],
    borderTopRightRadius: radius["3xl"],
    overflow: "hidden",
  },
  grabHandleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 2 },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 20,
    paddingRight: 12,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.card,
  },

  empty: {
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: radius["3xl"],
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius["2xl"],
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
