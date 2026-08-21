/**
 * Pulls a human-readable message off an unknown thrown value.
 *
 * Replaces the `catch (e: any) => e.message` pattern, which crashes when a
 * non-Error is thrown (a string, or a rejected fetch returning undefined).
 */
export function errorMessage(error: unknown, fallback = "Đã xảy ra lỗi"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
