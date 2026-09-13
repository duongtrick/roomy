import { Alert } from "react-native";

/**
 * Promise-shaped replacement for the web build's `window.confirm`.
 *
 * `Alert.alert` is callback-based and, on Android, dismissing by tapping
 * outside skips both buttons — `onDismiss` is wired so the promise always
 * settles rather than leaving the caller hanging.
 */
export function confirm(
  message: string,
  { title = "Xác nhận", confirmLabel = "Xoá", destructive = true } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Huỷ", style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
