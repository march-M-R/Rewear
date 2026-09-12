import { swapGarment } from "@/lib/demo";
import { generateStructured } from "@/lib/gemini";
import { apiError, readBody, closetInput, eventInput, interactionInput, idsInput, recentOutfitsInput, InputError } from "@/lib/api-validation";
import { fallbackOutfit, outfitSchema, outfitValidator, validLocks, validOutfit, sameOutfit } from "@/lib/outfits";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body=await readBody(request); const closet=closetInput(body.closet).filter(g=>g.status==="active");
    const event=eventInput(body.event);const interactions=interactionInput(body.interactions);
    const previous=idsInput(body.previousGarmentIds,closet,"previous outfit");const locked=idsInput(body.lockedGarmentIds,closet,"locked garments");
    if(!validLocks(locked,closet)||!validOutfit(previous,closet)||locked.some(id=>!previous.includes(id)))throw new InputError("The previous outfit or locked garment combination is invalid.");
    const recentOutfits=recentOutfitsInput(body.recentOutfits,closet);
    const swap=body.swapGarmentId;
    if(swap!==undefined && (typeof swap!=="string" || !previous.includes(swap) || locked.includes(swap) || previous.some(id=>id!==swap&&!locked.includes(id))))throw new InputError("A swap must preserve every garment except the selected unlocked piece.");
    const fallback=typeof swap==="string"?{garmentIds:swapGarment(closet,previous,swap,locked,recentOutfits),reasoning:"Replaced the selected category while keeping every other garment unchanged."}:fallbackOutfit(closet,event,locked,previous,interactions,recentOutfits);
    if(!validOutfit(fallback.garmentIds,closet,locked))throw new InputError("No complete outfit is possible with these locked pieces.",422);
    const changed=!sameOutfit(fallback.garmentIds,previous);
    const baseValidate=outfitValidator(closet,locked,previous,changed,typeof swap==="string"||recentOutfits.some(ids=>sameOutfit(ids,fallback.garmentIds))?[]:recentOutfits);
    const validate=(value:unknown):value is typeof fallback=>{
      if(!baseValidate(value))return false;
      if(typeof swap==="string"&&changed){const replacements=value.garmentIds.filter(id=>!previous.includes(id));return !value.garmentIds.includes(swap)&&replacements.length===1&&closet.find(g=>g.id===replacements[0])?.category===closet.find(g=>g.id===swap)?.category;}
      return true;
    };
    const result=await generateStructured({schema:outfitSchema,validate,fallback:()=>fallback,prompt:`These garments are locked and MUST remain in the outfit: ${JSON.stringify(locked)}. Replace unlocked garments using ONLY provided closet IDs. Avoid returning the exact previous outfit if an alternative exists. Rotate pieces from recent outfits when locks allow. A fashion hackathon calls for creative styling rather than default casual clothing. Use ONE dress OR ONE top plus ONE bottom. At most one outerwear, shoes, bag. ${typeof swap==="string"?`Replace ONLY ${swap} with another item of the SAME category; preserve every other garment.`:"Preserve all locks."} Write reasoning as one or two short sentences, at most 35 words. Describe the style and event suitability. Never include garment IDs, counter statistics, or a selection-process explanation in reasoning; IDs belong only in garmentIds. Data: ${JSON.stringify({event,closet,previousGarmentIds:previous,interactions,recentOutfits})}`});
    return Response.json(result);
  }catch(error){return apiError(error);}
}
