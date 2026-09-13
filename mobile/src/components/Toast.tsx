import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, CheckCircle2, Info } from "lucide-react-native";
import { colors, font, radius, shadow } from "@/theme";

/**
 * Replacement for the web build's `sonner`.
 *
 * Same call sites (`toast.success(...)`), but the queue lives in a provider
 * mounted once at the root: the module-level `emit` is bound when that
 * provider mounts, so `toast.*` can be called from plain functions and event
 * handlers without threading a hook through.
 */
type Kind = "success" | "error" | "info";
type Item = { id: number; kind: Kind; message: string };

const DURATION_MS = 3200;

let emit: ((kind: Kind, message: string) => void) | null = null;
let nextId = 1;

export const toast = {
  success: (message: string) => emit?.("success", message),
  error: (message: string) => emit?.("error", message),
  info: (message: string) => emit?.("info", message),
};

const KIND_STYLE: Record<Kind, { fg: string; bg: string; border: string; Icon: typeof Info }> = {
  success: {
    fg: colors.emerald.fg,
    bg: colors.emerald.bg,
    border: colors.emerald.border,
    Icon: CheckCircle2,
  },
  error: {
    fg: colors.destructive,
    bg: "#FDE7E9",
    border: "#F8C6CB",
    Icon: AlertCircle,
  },
  info: { fg: colors.blue.fg, bg: colors.blue.bg, border: colors.blue.border, Icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    setItems((cur) => cur.filter((i) => i.id !== id));
  }, []);

  useEffect(() => {
    emit = (kind, message) => {
      const item: Item = { id: nextId++, kind, message };
      // Cap the stack: three is already more than fits comfortably on a phone.
      setItems((cur) => [...cur.slice(-2), item]);
    };
    return () => {
      emit = null;
    };
  }, []);

  return (
    <View style={styles.root}>
      {children}
      <View pointerEvents="box-none" style={[styles.layer, { top: insets.top + 8 }]}>
        {items.map((item) => (
          <ToastRow key={item.id} item={item} onDone={() => dismiss(item.id)} />
        ))}
      </View>
    </View>
  );
}

function ToastRow({ item, onDone }: { item: Item; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const { fg, bg, border, Icon } = KIND_STYLE[item.kind];

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(onDone);
    }, DURATION_MS);

    return () => clearTimeout(timer);
    // `onDone` is recreated per render; re-running would restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bg, borderColor: border },
        shadow.card,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        },
      ]}
    >
      <Icon size={18} color={fg} />
      <Text style={[styles.message, { color: fg }]} numberOfLines={3}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  layer: {
    position: "absolute",
    left: 12,
    right: 12,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 19,
  },
});
