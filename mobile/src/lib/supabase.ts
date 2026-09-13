import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether the app has been pointed at a Supabase project yet.
 *
 * The keys are read at build time, so a missing `.env` cannot be recovered
 * from at runtime. Rather than let every screen fail with an opaque network
 * error, callers check this and show a "chưa cấu hình" state — see
 * `src/lib/api/errors.ts`.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The client is created even when the keys are missing so that importing this
 * module never throws; the placeholder URL simply fails every request, and
 * `isSupabaseConfigured` is what code should branch on.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  url ?? "http://localhost:54321",
  anonKey ?? "public-anon-key-not-configured",
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // There is no URL bar to read a callback fragment out of.
      detectSessionInUrl: false,
    },
  },
);

/**
 * Refresh the access token only while the app is in front.
 *
 * Left running, the timer fires in the background and either wastes wake-ups
 * or races the OS suspending the process mid-request.
 */
if (isSupabaseConfigured) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

/** Public URL for a file in the room photo bucket. */
export function photoUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  return supabase.storage.from("room-photos").getPublicUrl(storagePath).data.publicUrl;
}
