import { generateStructured } from "@/lib/gemini";
import { apiError, readBody, InputError } from "@/lib/api-validation";
import { isGarment, isRecord, strings } from "@/lib/validation";
import { localGarmentImage } from "@/lib/images";
import { revampIdeas } from "@/lib/circular";
import type { RevampIdea } from "@/types";
export const runtime="nodejs";
const schema={type:"object",properties:{ideas:{type:"array",minItems:3,maxItems:3,items:{type:"object",properties:{title:{type:"string"},description:{type:"string"},difficulty:{type:"string",enum:["Easy","Medium"]},timeMinutes:{type:"integer"},materials:{type:"array",items:{type:"string"}},steps:{type:"array",items:{type:"string"}}},required:["title","description","difficulty","timeMinutes","materials","steps"]}}},required:["ideas"]};
function validRevamp(value:unknown):value is {ideas:RevampIdea[]} {
 return isRecord(value)&&Array.isArray(value.ideas)&&value.ideas.length===3&&value.ideas.every(i=>isRecord(i)&&typeof i.title==="string"&&i.title.length>0&&typeof i.description==="string"&&["Easy","Medium"].includes(i.difficulty as string)&&typeof i.timeMinutes==="number"&&Number.isInteger(i.timeMinutes)&&i.timeMinutes>0&&i.timeMinutes<=180&&strings(i.materials)&&i.materials.length>0&&i.materials.length<=15&&strings(i.steps)&&i.steps.length>=3&&i.steps.length<=12&&i.steps.every(s=>s.length>5&&s.length<1500));
}
export async function POST(request:Request){try{
 const body=await readBody(request);if(!isGarment(body.garment))throw new InputError("Invalid garment.");const garment=body.garment;
 const result=await generateStructured({schema,validate:validRevamp,image:await localGarmentImage(garment.image),prompt:`Generate exactly three realistic, simple DIY transformations for this garment. Use the photo when present, but do not assume hidden construction. Respect the material: no casual cutting of leather, fine silk, jewelry or footwear; prefer reversible changes or professional alterations when necessary. No hazardous chemicals or heat treatments. Each idea needs useful numbered steps, tools/materials, estimated minutes, and Easy or Medium difficulty. Be practical rather than inventing a transformation. Garment data: ${JSON.stringify(garment)}`,fallback:()=>({ideas:revampIdeas(garment).map(i=>({title:i.title,description:`A material-aware way to refresh ${garment.name.toLowerCase()}.`,difficulty:i.difficulty as "Easy"|"Medium",timeMinutes:parseInt(i.time),materials:i.materials,steps:i.steps}))})});
 return Response.json(result);
}catch(error){return apiError(error);}}
