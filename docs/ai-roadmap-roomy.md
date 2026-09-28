# Roomy code review and AI roadmap

## Context from contest profile

Roomy is positioned as a smart room search and room management product for students and workers in Thai Nguyen. The contest profile frames the MVP around transparent listings, map search, verified information, tenant reviews, viewing bookings, saved rooms, and landlord tooling. Current budget is small, so the first AI work should reuse Supabase and the existing Expo app instead of adding a separate backend.

## Code review

### What is strong

- Architecture is small and readable: Expo Router screens call typed API modules, and Supabase owns auth, RLS, views, and integrity rules.
- The public catalogue is already shaped for fast browsing through `public_listings`, so the app avoids per-card follow-up queries.
- Search and recommendations are deliberately simple in `src/lib/filters.ts` and `src/lib/suggest.ts`. This is a good base for an AI layer because the current deterministic behavior can stay as fallback.
- Security-sensitive flows are mostly in database policies and triggers: role assignment, moderation, listing verification, tenancy claim, review eligibility, invoice totals, and active lease uniqueness.
- The README explains setup, demo accounts, moderation, RLS, and known `npm audit` noise well enough for judges or future maintainers.

### Findings

1. Public review rows exposed `author_id`.

   `public.reviews` grants public select for reviews of published listings, and `public_listings` embedded `author_id` inside `reviews`. The mobile catalogue type ignores it, so this stable profile UUID is not needed by the public app. Fixed by removing it from the public view while keeping admin review data intact.

   Files: `mobile/supabase/schema.sql`, `mobile/src/lib/database.types.ts`

2. Existing projects need patch-based privacy cleanup.

   `schema.sql` is cleanly cumulative, but projects that already ran older SQL rely on patch order. Fixed by adding `mobile/supabase/patches/2026-09-28-public-review-privacy.sql`.

3. Search runs entirely client-side.

   This is fine for the current 15-room demo and early MVP. It will become weak when listings grow, because ranking cannot use semantic intent like "phong yen tinh gan truong co may lanh duoi 3 trieu" unless each field is parsed manually. Move only the ranking step server-side first; keep current filters as guardrails.

4. `database.types.ts` is hand-written.

   Acceptable for competition MVP, but AI search will add vector columns/functions. At that point, manual drift risk rises. Generate Supabase types once a real project exists.

## AI feature ladder

### Step 1: AI search assistant

User types natural Vietnamese: "phong gan ICTU duoi 3 trieu co may lanh, uu tien da xac thuc". Server parses intent into existing filters and a semantic query.

Implementation:

- Add `listing_search_documents` table or materialized view containing public title, description, area, district, amenities, school, price band, distance, verification, and review summary.
- Add `embedding vector(...)` with `pgvector`.
- Generate embeddings in a Supabase Edge Function when a listing is approved or public content changes.
- Add an RPC such as `match_public_listings(query_embedding, max_price, max_distance, required_amenities, verified_only)`.
- In the app, add one "Tìm bằng AI" field above existing filters. If AI request fails, fall back to `matchesQuery`.

Why first: it matches the contest story, needs no payment/identity changes, and improves the core user problem.

### Step 2: Explainable recommendations

Replace part of `suggestRooms` scoring with semantic similarity between user intent and listing text, but keep visible reasons. Reasons should come from structured fields, not opaque model prose: "Duoi 3 trieu", "Cach truong 800 m", "Co may lanh", "Da xac thuc".

Implementation:

- Keep current deterministic score as baseline.
- Add `intentScore` from vector similarity.
- Blend score: `0.55 * rules + 0.45 * intent`.
- Store no personal profile at first; use current session query and favourites only.

### Step 3: Landlord listing copilot

Help landlords turn rough notes into a public title, public description, amenities, and warning flags.

Implementation:

- Edge Function receives draft listing fields.
- Model returns strict JSON: title, description, amenities, missing_fields, risk_flags.
- Client shows suggestions for landlord approval. Do not auto-publish.

Useful contest angle: raises listing quality and standardizes information, one of Roomy's stated differentiators.

### Step 4: Review and moderation assistant

Admin screen gets AI hints for duplicate listings, suspicious price/address mismatch, abusive review text, and missing verification evidence.

Implementation:

- Use deterministic checks first: missing address, extreme price, duplicate phone/address, no image, unverifiable coordinates.
- Use model only for text classification and summary.
- Keep human approval required.

### Step 5: Tenant support chat

Chat answers only from Roomy data and policy text: how to book, how reviews work, what "verified" means, how to claim tenancy.

Implementation:

- Retrieval over README/product policy plus public listings.
- No legal advice, no payment handling, no landlord impersonation.

## Minimal technical design

### Data

Add only these pieces first:

- `listing_search_documents(listing_id, content, updated_at)`
- `listing_embeddings(listing_id, embedding, updated_at)`
- RPC `match_public_listings(...)`
- Edge Function `ai-search`
- Edge Function `embed-listing`

### Security

- AI provider key stays in Supabase Edge Function secrets, never in Expo env.
- Function checks only public listings for tenant search.
- Landlord copilot requires authenticated user and ownership of draft/listing.
- Admin AI tools require `is_admin()`.
- Store AI logs without phone numbers and without free-form tenant notes.

### Sources checked

- OpenAI embeddings docs: https://platform.openai.com/docs/guides/embeddings
- OpenAI structured outputs docs: https://platform.openai.com/docs/guides/structured-outputs
- Supabase vector columns docs: https://supabase.com/docs/guides/ai/vector-columns
- Supabase Edge Functions docs: https://supabase.com/docs/guides/functions

## Suggested commit plan

1. Fix public review privacy.
2. Add database vector/RPC scaffold.
3. Add Edge Function for embeddings and AI search.
4. Add mobile AI search UI with fallback.
5. Add landlord listing copilot after search works.

## Skipped

- No new AI SDK dependency in the mobile app. Add only when the app must call a non-Supabase backend directly, which it should avoid.
- No vector implementation in this review commit. Add when Supabase project secrets and model choice are confirmed.
