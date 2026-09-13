import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/hooks/use-auth";
import { FavoritesProvider } from "@/hooks/use-favorites";
import { ToastProvider } from "@/components/Toast";
import { loadAppFonts } from "@/theme/fonts";
import { colors, font } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The splash is held only long enough to register the fonts, and even that
    // is bounded by `loadAppFonts` swallowing its own failures. Data now comes
    // from Supabase, so each screen shows its own loading state instead of the
    // app blocking on a network round-trip before it will draw anything.
    void loadAppFonts().finally(() => {
      setReady(true);
      void SplashScreen.hideAsync();
    });
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* Inside the toast host: a failed favourite rolls back with a toast. */}
          <ToastProvider>
            <FavoritesProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  contentStyle: { backgroundColor: colors.background },
                  headerStyle: { backgroundColor: colors.background },
                  headerShadowVisible: false,
                  headerTintColor: colors.foreground,
                  headerTitleStyle: { fontFamily: font.semibold, fontSize: 17 },
                  headerBackButtonDisplayMode: "minimal",
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="room/[id]" options={{ headerShown: false }} />
                <Stack.Screen
                  name="book/[roomId]"
                  options={{
                    presentation: "modal",
                    title: "Đặt lịch xem phòng",
                  }}
                />
                <Stack.Screen name="auth" options={{ presentation: "modal", title: "Tài khoản" }} />
                <Stack.Screen name="dashboard" options={{ title: "Quản lý phòng trọ" }} />
                <Stack.Screen name="admin" options={{ title: "Quản trị hệ thống" }} />
              </Stack>
            </FavoritesProvider>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
