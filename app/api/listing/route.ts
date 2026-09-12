import { generateStructured } from "@/lib/gemini";
import { apiError, readBody, InputError } from "@/lib/api-validation";
import { isGarment, isRecord, strings } from "@/lib/validation";
import type { ListingResponse } from "@/types";
export const runtime="nodejs";
type Listing=Omit<ListingResponse,"source"|"notice">;
const schema={type:"object",properties:{title:{type:"string"},description:{type:"string"},category:{type:"string"},condition:{type:"string"},suggestedPriceRange:{type:"string"},keywords:{type:"array",items:{type:"string"}}},required:["title","description","category","condition","suggestedPriceRange","keywords"]};
export async function POST(request:Request){try{
 const body=await readBody(request);if(!isGarment(body.garment)||typeof body.condition!=="string"||body.condition.length>200)throw new InputError("Provide the garment and condition.");const g=body.garment;const condition=body.condition;
 const fallback:Listing={title:g.name,description:`${g.name} in ${g.color}, made from ${g.material} with a ${g.pattern} finish. ${g.style.join(", ")} styling. Condition: ${condition}. Add brand, size, measurements, and any flaws before publishing.`,category:g.category,condition,suggestedPriceRange:g.category==="accessory"?"$5–$15 USD (rough estimate)":g.category==="outerwear"?"$25–$60 USD (rough estimate)":"$15–$40 USD (rough estimate)",keywords:[g.category,g.color,"preloved",...g.style]};
 const validate=(value:unknown):value is Listing=>isRecord(value)&&["title","description","category","condition","suggestedPriceRange"].every(k=>typeof value[k]==="string"&&(value[k] as string).length>0&&(value[k] as string).length<4000)&&value.category===g.category&&value.condition===condition&&strings(value.keywords)&&value.keywords.length>0&&value.keywords.length<=20;
 return Response.json(await generateStructured({schema,validate,fallback:()=>fallback,prompt:`Write a useful resale listing using ONLY these known garment facts. Condition must be exactly ${JSON.stringify(condition)}. Category must be exactly ${JSON.stringify(g.category)}. Do not invent brand, size, measurements, original price, authenticity or flaws. State missing details should be added. Give a conservative rough price range in USD, explicitly an estimate, not market research. Garment: ${JSON.stringify(g)}`}));
}catch(error){return apiError(error);}}
