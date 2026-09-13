import { Stack, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AccentButton, Muted, Display } from "@/components/ui";
import { colors, font } from "@/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Không tìm thấy" }} />
      <View style={styles.screen}>
        <Text style={styles.code}>404</Text>
        <Display size={22} style={{ marginTop: 8 }}>
          Không tìm thấy trang
        </Display>
        <Muted style={{ textAlign: "center", marginTop: 8, marginBottom: 24 }}>
          Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.
        </Muted>
        <AccentButton label="Về trang chủ" onPress={() => router.replace("/")} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: colors.background,
  },
  code: { fontFamily: font.bold, fontSize: 64, color: colors.foreground },
});
