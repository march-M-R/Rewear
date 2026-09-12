export const MAX_UPLOAD_BYTES=10*1024*1024;
export interface PreparedImage { data:string; mimeType:"image/jpeg" }
/** Validate and resize in-browser so image requests stay below API deployment limits. */
export async function prepareImage(file:File):Promise<PreparedImage> {
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Choose a JPG, PNG, or WebP photo.");
 if(file.size>MAX_UPLOAD_BYTES)throw new Error("Choose a photo smaller than 10 MB.");
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file);}catch{throw new Error("This image could not be decoded. Choose another photo.");}
 try{
  if(bitmap.width*bitmap.height>40_000_000)throw new Error("This photo is too large. Choose one below 40 megapixels.");
  const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext("2d");if(!context)throw new Error("Image preparation is unavailable in this browser.");
  context.fillStyle="#f7f6f2";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL("image/jpeg",.82).split(",")[1];
  if(!data||data.length>2_796_204)throw new Error("Please choose a smaller photo.");
  return {mimeType:"image/jpeg",data};
 }finally{bitmap.close();}
}
