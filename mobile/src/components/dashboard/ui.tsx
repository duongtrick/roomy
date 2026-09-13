import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, font, radius } from "@/theme";
import { Muted, Display } from "../ui";

/** Section header used at the top of every dashboard tab. */
export function TabHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <View style={styles.tabHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Display size={22}>{title}</Display>
        {typeof subtitle === "string" ? (
          <Muted size={13} style={{ marginTop: 4 }}>
            {subtitle}
          </Muted>
        ) : (
          subtitle
        )}
      </View>
      {action}
    </View>
  );
}

/**
 * One record rendered as a card.
 *
 * The web dashboard fell back to a table above `lg`; on a phone there is no
 * such breakpoint, so the card list the web used below it is the only layout
 * here — a 10-column table on a 375pt screen pushed most of its content off
 * behind a horizontal scroll nobody discovers.
 */
export function RecordCard({
  title,
  subtitle,
  badge,
  rows,
  actions,
  onPress,
  style,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  rows: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <>
      <View style={styles.recordHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {typeof title === "string" ? (
            <Text style={styles.recordTitle} numberOfLines={1}>
              {title}
            </Text>
          ) : (
            title
          )}
          {typeof subtitle === "string" ? (
            <Text style={styles.recordSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          )}
        </View>
        {badge}
      </View>

      {rows.length > 0 ? (
        <View style={styles.recordRows}>
          {rows.map((r) => (
            <View key={r.label} style={styles.recordCell}>
              <Text style={styles.recordCellLabel}>{r.label}</Text>
              {typeof r.value === "string" ? (
                <Text style={styles.recordCellValue} numberOfLines={1}>
                  {r.value}
                </Text>
              ) : (
                r.value
              )}
            </View>
          ))}
        </View>
      ) : null}

      {actions ? <View style={styles.recordActions}>{actions}</View> : null}
    </>
  );

  if (!onPress) return <View style={[styles.record, style]}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.record, pressed && { opacity: 0.85 }, style]}
    >
      {body}
    </Pressable>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },

  record: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius["2xl"],
    padding: 16,
    backgroundColor: colors.card,
    gap: 12,
  },
  recordHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  recordTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  recordSubtitle: {
    fontFamily: font.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  recordRows: { flexDirection: "row", flexWrap: "wrap", rowGap: 10, columnGap: 12 },
  recordCell: { width: "47%", minWidth: 0 },
  recordCellLabel: {
    fontFamily: font.regular,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  recordCellValue: { fontFamily: font.medium, fontSize: 13, color: colors.foreground },
  recordActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },

  stat: {
    flexGrow: 1,
    flexBasis: "47%",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius["2xl"],
    padding: 16,
    backgroundColor: colors.card,
  },
  statLabel: {
    fontFamily: font.medium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    marginTop: 8,
  },
  statValue: { fontFamily: font.extrabold, fontSize: 24, color: colors.foreground },
  statSub: { fontFamily: font.regular, fontSize: 11, color: colors.mutedForeground },
});
