import "server-only";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { InlineImage } from "@/lib/gemini";
import { InputError } from "@/lib/api-validation";
import { isRecord } from "@/lib/validation";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
function detect(bytes: Buffer): InlineImage["mimeType"] | null {
  if(bytes.length<12)return null;
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return "image/png";
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "image/jpeg";
  if(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP")return "image/webp";
  return null;
}
export function imageInput(value:unknown):InlineImage {
  if(!isRecord(value)||typeof value.data!=="string"||!["image/jpeg","image/png","image/webp"].includes(value.mimeType as string))throw new InputError("Upload a JPG, PNG, or WebP image.");
  if(value.data.length>Math.ceil(MAX_IMAGE_BYTES/3)*4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data))throw new InputError("Image is too large or invalid. Limit: 2 MB after resizing.",413);
  const bytes=Buffer.from(value.data,"base64");
  if(bytes.length>MAX_IMAGE_BYTES)throw new InputError("Image is too large.",413);
  if(detect(bytes)!==value.mimeType)throw new InputError("Image contents do not match the declared file type.");
  return {data:value.data,mimeType:value.mimeType as InlineImage["mimeType"]};
}
export async function localGarmentImage(image:string,maximum=MAX_IMAGE_BYTES):Promise<InlineImage|undefined> {
  if(!/^\/closet\/[a-z0-9_-]+\.(png|jpe?g|webp)$/i.test(image))return;
  try{const file=path.join(process.cwd(),"public",image);if((await stat(file)).size>maximum)return;const bytes=await readFile(file);const mimeType=detect(bytes);if(mimeType)return {mimeType,data:bytes.toString("base64")};}catch{/* Missing images do not block text-based styling. */}
}
