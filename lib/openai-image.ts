import "server-only";
import type { InlineImage } from "@/lib/gemini";
import { InputError } from "@/lib/api-validation";
import { isRecord } from "@/lib/validation";

/** Shared server-only image editing for try-on and revamp previews. */
export async function editGarmentImage(prompt:string,images:{image:InlineImage;name:string}[],size="1024x1536"):Promise<string>{
  const key=process.env.OPENAI_API_KEY;
  if(!key)throw new InputError("Add OPENAI_API_KEY to .env.local and restart the server to generate previews.",503);
  const form=new FormData();
  form.set("model",process.env.OPENAI_IMAGE_MODEL||"gpt-image-2.5-sunburst");
  form.set("size",size);form.set("quality","medium");form.set("output_format","jpeg");form.set("output_compression","80");form.set("n","1");form.set("prompt",prompt);
  for(const {image,name} of images)form.append("image[]",new Blob([new Uint8Array(Buffer.from(image.data,"base64"))],{type:image.mimeType}),name);
  const response=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(150000),cache:"no-store"});
  if(!response.ok){
    const message=response.status===401?"The OpenAI key was rejected. Check the server key and restart.":response.status===429?"OpenAI quota or rate limit reached. Check API billing or try again later.":response.status===403?"This OpenAI project does not have access to the image model.":"OpenAI could not create this preview. Please try again later.";
    throw new InputError(message,502);
  }
  const result:unknown=await response.json();
  const first=isRecord(result)&&Array.isArray(result.data)?result.data[0]:undefined;
  if(!isRecord(first)||typeof first.b64_json!=="string"||first.b64_json.length>4_000_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(first.b64_json))throw new InputError("OpenAI returned an unreadable preview. Please try again.",502);
  const bytes=Buffer.from(first.b64_json,"base64");
  if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw new InputError("OpenAI returned an invalid preview image.",502);
  return `data:image/jpeg;base64,${first.b64_json}`;
}
