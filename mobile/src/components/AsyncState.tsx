import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AlertCircle, DatabaseZap } from "lucide-react-native";
import { isSupabaseConfigured } from "@/lib/supabase";
import { colors, radius } from "@/theme";
import { EmptyState, Muted, SecondaryButton } from "./ui";

/** Centred spinner for a first load. */
export function Loading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <View style={styles.centre}>
      <ActivityIndicator color={colors.primary} />
      <Muted size={13} style={{ marginTop: 10 }}>
        {label}
      </Muted>
    </View>
  );
}

/**
 * Failure state for a screen that could not load.
 *
 * A missing `.env` is called out separately: it is the one failure a developer
 * fixes in ten seconds, and it otherwise surfaces as a bare network error that
 * looks like the server is down.
 */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!isSupabaseConfigured) {
    return (
      <EmptyState
        icon={<DatabaseZap size={44} color={colors.tint400} />}
        title="Chưa kết nối Supabase"
        description={
          "Điền EXPO_PUBLIC_SUPABASE_URL và EXPO_PUBLIC_SUPABASE_ANON_KEY vào " +
          "mobile/.env, rồi khởi động lại dev server."
        }
      />
    );
  }

  return (
    <View style={styles.errorCard}>
      <AlertCircle size={20} color={colors.destructive} />
      <Muted size={13} style={{ flex: 1, color: colors.destructive }}>
        {message}
      </Muted>
      {onRetry ? <SecondaryButton label="Thử lại" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    padding: 16,
    borderRadius: radius["2xl"],
    borderWidth: 1,
    borderColor: "#F8C6CB",
    backgroundColor: "#FDE7E9",
  },
});
