import { generateStructured } from "@/lib/gemini";
import { apiError, readBody, closetInput, eventInput, interactionInput, InputError } from "@/lib/api-validation";
import { imageInput } from "@/lib/images";
import { categories, formalities, isCandidate, isRecord, strings } from "@/lib/validation";
import { wardrobeImpact, CANDIDATE_ID } from "@/lib/shop-analysis";
import type { CandidateItem } from "@/types";
export const runtime="nodejs";
const schema={type:"object",properties:{item:{type:"object",properties:{category:{type:"string",enum:[...categories]},color:{type:"string"},secondaryColors:{type:"array",items:{type:"string"}},style:{type:"array",items:{type:"string"}},material:{type:"string"},pattern:{type:"string"},formality:{type:"string",enum:[...formalities]},silhouette:{type:"string"}},required:["category","color","secondaryColors","style","material","pattern","formality","silhouette"]},wardrobeReasoning:{type:"string"},referencedGarmentIds:{type:"array",items:{type:"string"}}},required:["item","wardrobeReasoning","referencedGarmentIds"]};
export async function POST(request:Request){try{
 const body=await readBody(request,3_500_000);const image=imageInput(body.image);const closet=closetInput(body.closet);
 if(closet.some(g=>g.id===CANDIDATE_ID))throw new InputError("The closet uses a reserved candidate ID.");
 if(!Array.isArray(body.events)||body.events.length>50)throw new InputError("Invalid calendar events.");
 const events=body.events.map(eventInput);const interactions=interactionInput(body.interactions);
 if(!isCandidate(body.fallbackItem))throw new InputError("Provide the item's category, color, style and formality for fallback analysis.");
 const fallbackItem=body.fallbackItem;
 const attributes=await generateStructured({schema,image,validate:(v:unknown):v is {item:CandidateItem;wardrobeReasoning:string;referencedGarmentIds:string[]}=>isRecord(v)&&isCandidate(v.item)&&typeof v.wardrobeReasoning==="string"&&v.wardrobeReasoning.length>0&&v.wardrobeReasoning.length<2000&&strings(v.referencedGarmentIds)&&v.referencedGarmentIds.every(id=>closet.some(g=>g.id===id&&g.status==="active")),fallback:()=>({item:fallbackItem,wardrobeReasoning:"Photo analysis was unavailable. The entered item details were compared with saved wardrobe history.",referencedGarmentIds:[]}),prompt:`Analyze the garment in this photo, extracting category, primary/secondary colors, style tags, likely material, pattern, formality, and silhouette. If material cannot be determined visually, say unknown. Do not identify people or brands. Focus on the garment. Then explain qualitatively what this garment could add to this specific wardrobe, considering accepted/locked/worn pieces, swaps, duplicates, and upcoming events. Use only known garment facts and supplied IDs; list any referenced IDs. Do NOT compute numerical scores, assert a purchase verdict, or invent wear evidence. User hints: ${JSON.stringify(fallbackItem)}. Wardrobe context: ${JSON.stringify({closet:closet.filter(g=>g.status==="active"),events,interactions})}.`});
 const analysis=wardrobeImpact(attributes.item,closet,events,interactions);
 return Response.json({...analysis,semanticReasoning:attributes.wardrobeReasoning,source:attributes.source,...(attributes.source==="fallback"?{notice:`${attributes.notice} The photo was not analyzed; scoring uses the item details you entered.`}:{notice:`Attributes were extracted by ${attributes.source === "openai" ? "OpenAI" : "Gemini"}. Scores use transparent product heuristics, not scientific measurements.`})});
}catch(error){return apiError(error);}}
