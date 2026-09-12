import { generateStructured } from "@/lib/gemini";
import { apiError, readBody, closetInput, eventInput, interactionInput, idsInput, recentOutfitsInput, InputError } from "@/lib/api-validation";
import { fallbackOutfit, outfitSchema, outfitValidator, validOutfit, sameOutfit, sameBase } from "@/lib/outfits";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const closet = closetInput(body.closet).filter(g => g.status === "active");
    const event = eventInput(body.event); const interactions = interactionInput(body.interactions);
    const previous=idsInput(body.previousGarmentIds,closet,"previous garments");
    const recentOutfits = recentOutfitsInput(body.recentOutfits, closet);
    const fallback = fallbackOutfit(closet, event, [], previous, interactions, recentOutfits);
    const avoidRecent = recentOutfits.some(ids=>sameOutfit(ids,fallback.garmentIds)) ? [] : recentOutfits;
    if (!validOutfit(fallback.garmentIds, closet)) throw new InputError("Your active closet needs a dress or both a top and bottom to make a complete outfit.", 422);
    const validate = outfitValidator(closet,[],previous,previous.length>0&&!sameOutfit(fallback.garmentIds,previous),avoidRecent);
    const canVaryBase = !recentOutfits.some(ids=>sameBase(ids,fallback.garmentIds,closet));
    const result = await generateStructured({ schema: outfitSchema, validate: (value:unknown): value is typeof fallback => validate(value) && (!canVaryBase || !recentOutfits.some(ids=>sameBase(ids,value.garmentIds,closet))), fallback: () => fallback,
      prompt: `Style this event using ONLY the supplied active garment IDs. A complete outfit is either ONE dress OR ONE top plus ONE bottom, never both. At most one outerwear, pair of shoes, and bag; accessories optional. Include suitable shoes if available. Use event context and formality, favor accepted/locked/worn items, and treat specific swaps as stronger dislikes than whole-outfit rejection. Avoid this prior outfit when alternatives exist: ${JSON.stringify(previous)}. Avoid repeating the same dress or top-and-bottom combination across recent and scheduled outfits when alternatives exist; changing only the bag or accessories is not enough. Avoid repeating recent outfits, and rotate individual pieces rather than always picking the highest lifetime counters. Fashion hackathons are creative fashion events, not automatically casual. Explain the selection without invented facts. Write reasoning as one or two short sentences, at most 35 words. Describe the style and event suitability. Never include garment IDs, counter statistics, or a selection-process explanation in reasoning; IDs belong only in garmentIds. Data: ${JSON.stringify({event,closet,interactions,recentOutfits})}`,
    });
    return Response.json(result);
  } catch(error) { return apiError(error); }
}
