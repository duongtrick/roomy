import type { PostgrestError } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../supabase";

/**
 * Thrown when the app has no Supabase keys.
 *
 * Screens catch this to show "chưa cấu hình Supabase" instead of a network
 * error, which is the difference between a developer knowing to fill in
 * `.env` and one hunting a connectivity bug that does not exist.
 */
export class NotConfiguredError extends Error {
  constructor() {
    super(
      "Chưa cấu hình Supabase. Điền EXPO_PUBLIC_SUPABASE_URL và " +
        "EXPO_PUBLIC_SUPABASE_ANON_KEY vào mobile/.env rồi khởi động lại.",
    );
    this.name = "NotConfiguredError";
  }
}

export function assertConfigured(): void {
  if (!isSupabaseConfigured) throw new NotConfiguredError();
}

/**
 * Turns a PostgREST error into something a person can act on.
 *
 * The raw messages leak schema detail ("new row violates row-level security
 * policy for table \"listings\"") and read as a bug rather than a permission
 * problem, so the codes worth distinguishing get their own wording.
 */
export function describe(error: PostgrestError): string {
  switch (error.code) {
    case "23505":
      return "Bản ghi này đã tồn tại.";
    case "23503":
      return "Không thể lưu: bản ghi liên quan không còn tồn tại.";
    case "23514":
      return "Dữ liệu không hợp lệ, vui lòng kiểm tra lại các ô đã nhập.";
    case "42501":
    case "PGRST301":
      return "Bạn không có quyền thực hiện thao tác này.";
    // The project exists and the key works, but the schema was never applied —
    // by far the most likely first-run failure, so it gets the instruction
    // rather than PostgREST's "schema cache" wording.
    case "PGRST205":
      return "Chưa tạo bảng trên Supabase. Chạy supabase/schema.sql trong SQL Editor rồi thử lại.";
    default:
      return error.message;
  }
}

/**
 * Unwraps a Supabase result, throwing a readable Error on failure.
 *
 * PostgREST types `data` as nullable on every builder — it is null whenever
 * `error` is set, and also for a `.single()` that matched nothing. Both are
 * failures at a call site that asked for a row, so they raise here rather than
 * handing back a null the caller would have to re-check.
 */
export function unwrap<T>(result: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (result.error) throw new Error(describe(result.error));
  if (result.data == null) throw new Error("Không tìm thấy dữ liệu.");
  return result.data as NonNullable<T>;
}

/**
 * Same, for a select with embedded relations.
 *
 * `database.types.ts` is hand-written and declares no `Relationships`, so the
 * query builder cannot infer the shape of an embed and types it as
 * `SelectQueryError`. The cast is the boundary where that inference stops and
 * the hand-written row type takes over — keep the two in step by eye.
 */
export function unwrapAs<T>(result: { data: unknown; error: PostgrestError | null }): T {
  if (result.error) throw new Error(describe(result.error));
  return result.data as T;
}

/**
 * The signed-in user's id, for the `owner_id` / `user_id` columns that RLS
 * checks on insert. Reads the cached session rather than calling `getUser()`,
 * which would round-trip to the auth server on every write.
 */
export async function requireUserId(): Promise<string> {
  assertConfigured();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const id = data.session?.user.id;
  if (!id) throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
  return id;
}
