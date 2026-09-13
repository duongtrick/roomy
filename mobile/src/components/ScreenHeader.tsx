import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font } from "@/theme";
import { Eyebrow, Muted, Display } from "./ui";

/** Brand bar at the top of every tab screen — the RN twin of `<Nav />`. */
export function BrandHeader({ action }: { action?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <Text style={styles.brand}>Roomy</Text>
      <View style={styles.actions}>{action}</View>
    </View>
  );
}

/** Eyebrow + oversized serif headline block that opens each screen's body. */
export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.heading}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Display size={34} style={{ marginTop: eyebrow ? 8 : 0 }}>
        {title}
      </Display>
      {description ? <Muted style={{ marginTop: 12, lineHeight: 21 }}>{description}</Muted> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brand: {
    fontFamily: font.extrabold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: colors.primaryDeep,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  // No horizontal padding: every caller already renders inside a padded list.
  heading: { paddingTop: 20, paddingBottom: 8 },
});
