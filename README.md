# REWEAR

Wear more. Own less. Buy better.

A functional hackathon prototype built with the existing Next.js App Router, TypeScript, and Tailwind frontend. Shared JSON seeds the wardrobe; browser localStorage holds runtime state. No database or authentication is required.

## Run

```bash
npm install
cp .env.example .env.local
# Set GEMINI_API_KEY in .env.local to enable live Gemini.
npm run dev -- --webpack
```

Open http://localhost:3000/week. Without a key, the same flows use explicitly labeled deterministic fallbacks. Restart the server after changing environment variables. `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`. Never use a `NEXT_PUBLIC_` variable for the key; `.env.local` is ignored by Git.

```bash
npm run lint
node --test tests/*.test.mjs
npm run build -- --webpack
npm start
```

Webpack is the known working build configuration in this environment.

## Exact demo journey

1. Open **WEEK**. Seven mock events receive validated outfits; existing event outfits are reused.
2. Choose **VIEW FIT**. **NOPE** records rejection and requests another look; **LOVE IT** saves a look. Saved looks support **I WORE THIS**, once per look.
3. Lock a garment, then **REMIX THE REST**. Locked IDs stay fixed. **SWAP** replaces one unlocked category while preserving the other garments. Refresh to check persistence.
4. Open **CLUTTER**. Three seed garments qualify through historical rejection values, with counts and explanations. For older saved wardrobes, use **ADD DEMO HISTORY TO MY WARDROBE** if needed; it preserves items and lifecycle decisions.
5. Choose **REVAMP**, generate three ideas, select one, and start its materials/steps flow.
6. Choose **SELL**, specify condition, generate a listing, and **COPY LISTING**. Prices are rough estimates; add unknown size/brand/measurements before publishing elsewhere.
7. Choose **DONATE** and add an item to the persistent donation bag. **Keep in closet** reverses a lifecycle decision.
8. Open **SHOP** and upload a JPG, PNG, or WebP. Enter accurate category/color/style/formality hints for use if photo analysis is unavailable. Analyze to receive a computed BUY/SKIP result.
9. For BUY, **SHOW ME HOW I'D WEAR IT** shows up to three distinct outfits with the candidate fixed. For SKIP, inspect similar owned garments. Results depend on wardrobe state, not a selectable verdict.

## What runs where

| Feature | Implementation |
|---|---|
| Outfit generation and remix | Server Gemini structured JSON, validated against active closet IDs, outfit structure, and locks; deterministic fallback |
| Revamp and resale listing | Server Gemini, optional available local garment image for revamp; structured validated fallbacks |
| Shopping analysis | Server Gemini image attribute extraction and qualitative wardrobe reasoning; validates referenced closet IDs |
| Wardrobe impact | Deterministic compatibility, preference, redundancy, category need, and upcoming-event heuristics |
| Shopping outfit previews | Deterministic valid combinations containing the fixed candidate and existing closet IDs |
| Counters, locks, decisions, wear dates | Deterministic browser state |
| Clutter | Derived from shown >= 4 and rejected/shown >= 0.70; score also considers swaps and positive signals |
| Calendar | Seven seeded events behind `lib/calendar.ts`; no Google OAuth |
| Donation resources | Predefined organization types; no location search, booking, or marketplace APIs |

Shopping scores are product heuristics, not scientifically validated measurements. Impact weights are 30% compatibility, 25% style match, 20% inverse redundancy, 15% wardrobe need, and 10% upcoming utility. BUY additionally requires impact >= 60, redundancy < 80, and a valid candidate outfit. A provider failure never masquerades as live Gemini; without photo analysis, only the entered item hints are evaluated.

## Persistence and behavior

Missing keys initialize once: `rewear_closet`, `rewear_events`, `rewear_outfits`, `rewear_interactions`, and `rewear_shopping_history`. Valid saved values, including empty arrays, are preserved. SSR, malformed JSON, unavailable storage, and quota errors are handled without erasing corrupt saved data; session memory and a notice keep the UI usable when persistence fails. JSON seed files are never written by runtime interactions.

A recommendation increments shown once. LOVE increments acceptance, NOPE penalizes unlocked items, a specific SWAP is a stronger negative signal, and LOCK is positive evidence. Recording wear updates counters/date once per saved look. Lifecycle decisions and shopping verdicts create interaction records. Candidate photos stay in session memory and are sent to the server for analysis, but are not written to localStorage.

Client upload limit is 10 MB with type and pixel checks; images resize to at most 1400 pixels and 2 MB before transmission. Server routes validate MIME signatures, size, body shape, IDs, and generated output. Requests have finite timeouts and visible loading/error states.

## Server routes

All are POST: `/api/outfit`, `/api/remix`, `/api/revamp`, `/api/listing`, `/api/shop`. The reusable `lib/gemini.ts` is server-only and uses the key in a request header. It follows Google's [structured JSON output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en) and [image input](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding) documentation.

See [validation and changed files](docs/VALIDATION.md) for tested behavior and remaining limitations.

## Reference wardrobe addition

The initial Runway to Reality import added six pieces from the reference. A one-time `rewear_import_runway_to_reality_v1` marker appends only these six missing IDs to existing nonempty wardrobes without replacing history or decisions. Intentionally empty wardrobes stay empty. New pieces start with zero behavioral counters; materials remain unknown where the reference does not establish them. Product images are generated illustrations of the reference styles, not verified retailer photographs.

## Fashion Week variety expansion

The shared wardrobe now has 48 pieces. Twelve additional garments broaden the neutral, burgundy, cobalt, denim, and metallic options. `data/closet-imports.json` lists the explicitly requested import batches; each merges missing items once into existing nonempty browser closets without replacing saved counters or decisions.

Outfit and remix requests include up to 20 recent looks. The deterministic selector evaluates multiple valid combinations, penalizes recently shown pieces, considers positive and negative history, and avoids recent complete looks when alternatives exist. Gemini receives the same history; repeated responses are rejected when an unseen fallback is available. Swaps prefer less recently used replacements. Fashion/creative context overrides the old blanket casual-hackathon rule, and accessories participate in outfit selection. Existing saved looks remain intact; choose NEW FIT or REMIX to explore the expanded closet.

## OpenAI styling and personal outfit previews

Set `OPENAI_API_KEY` in **`.env.local`**, not `.env.example`, then restart the server. OpenAI takes priority for structured styling and analysis when configured; existing Gemini support remains available without an OpenAI key. Optional defaults are `OPENAI_TEXT_MODEL=gpt-4.1-mini` and `OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst`.

1. Open FITS, choose the calendar date, then the event for that day.
2. Use **New fit for this event** to request a fresh combination; existing locks/remix and recent-look validation still apply.
3. In **See this look on me**, upload a clear full-body JPG, PNG, or WebP (up to 10 MB before resizing).
4. Click **Generate my outfit preview**. The server sends your photo first, then selected garment images and the event context to OpenAI's image-edit endpoint. One button click requests one image.
5. Download the preview or remix the outfit and generate another. The old preview hides when the outfit changes.

Photos and generated previews remain in tab memory, not localStorage, Git, or a database. A photo can be reused while switching events in FITS; refreshing clears it. Generating a preview sends the photo and garment references to OpenAI and uses API credits. The output is an approximate visualization, not a guarantee of likeness, garment accuracy, sizing, or fit. API errors show a retryable message; no fake person-image fallback is used.

Routes: `POST /api/try-on`, `GET /api/ai/status` (configuration booleans only). Source labels distinguish OpenAI, Gemini, and deterministic fallbacks. Implementation follows the official [OpenAI image-generation guide](https://developers.openai.com/api/docs/guides/image-generation) and [structured-output guide](https://developers.openai.com/api/docs/guides/structured-outputs).

## Revamp after-image previews

Open CLUTTER → REVAMP, select a DIY idea, then choose **Preview this revamp**. The server uses the original garment photo and that idea's exact materials/steps to request one OpenAI after-image. The modal shows **Before / After**, supports downloading the result, and labels the image as an AI approximation. Generating a preview does not start the revamp or change the closet item. Previews remain in modal memory; download one to keep it.

`POST /api/revamp-preview` validates the garment and DIY plan, requires an available local garment image, and uses the shared server-only image helper. Missing images, provider errors, and timeouts produce clear errors rather than fake previews. The image model and key use the same OpenAI environment settings as personal outfit previews.
