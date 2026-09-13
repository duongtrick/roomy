import { loadAsync } from "expo-font";

/**
 * Registers the Poppins faces under the names `theme.font` refers to.
 *
 * The files are FZ Poppins — a Vietnamese-localised cut of Poppins — so
 * accented characters come from the same family instead of dropping to the
 * system face glyph-by-glyph the way Google's Poppins does.
 *
 * Seven of the family's eighteen styles are bundled: the ones the UI actually
 * asks for. Adding another means dropping the `.ttf` into `assets/fonts` and
 * naming it here and in `theme.font`.
 *
 * `loadAsync` is used rather than the `useFonts` hook on purpose — the hook
 * suspends, and a suspended root layout renders nothing *and* never runs its
 * effects, so the splash-screen gate below it could never open.
 */
const FONT_ASSETS = {
  "Poppins-Regular": require("../../assets/fonts/Poppins-Regular.ttf"),
  "Poppins-Italic": require("../../assets/fonts/Poppins-Italic.ttf"),
  "Poppins-Medium": require("../../assets/fonts/Poppins-Medium.ttf"),
  "Poppins-SemiBold": require("../../assets/fonts/Poppins-SemiBold.ttf"),
  "Poppins-Bold": require("../../assets/fonts/Poppins-Bold.ttf"),
  "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
  "Poppins-Black": require("../../assets/fonts/Poppins-Black.ttf"),
};

/** Resolves once the faces are registered; never rejects. */
export async function loadAppFonts(): Promise<void> {
  try {
    await loadAsync(FONT_ASSETS);
  } catch (error) {
    // A missing or corrupt file must not keep the app on the splash screen —
    // fall through and let the system face stand in.
    console.warn("Font loading failed, falling back to the system face", error);
  }
}
