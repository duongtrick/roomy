import { supabase } from "../supabase";
import { assertConfigured, requireUserId, unwrap } from "./errors";

/**
 * Saved rooms.
 *
 * Only ids are stored and fetched; the screens already hold the room list, so
 * pulling the rows again through a join would duplicate data the client has.
 */

export async function getFavoriteIds(): Promise<string[]> {
  assertConfigured();
  const { data } = await supabase.auth.getSession();
  // Favourites are per account — signed out, there is nothing to show.
  if (!data.session) return [];

  const rows = unwrap(await supabase.from("favorites").select("listing_id"));
  return rows.map((r) => r.listing_id);
}

export async function addFavorite(listingId: string): Promise<void> {
  const userId = await requireUserId();
  unwrap(
    await supabase
      .from("favorites")
      .insert({ user_id: userId, listing_id: listingId })
      .select("listing_id"),
  );
}

export async function removeFavorite(listingId: string): Promise<void> {
  const userId = await requireUserId();
  unwrap(
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId)
      .select("listing_id"),
  );
}
