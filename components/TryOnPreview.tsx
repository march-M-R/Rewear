"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CalendarEvent, Garment } from "@/types";
import { prepareImage, type PreparedImage } from "@/lib/upload";
export interface PersonalPhoto extends PreparedImage { id:string }
interface Preview {image:string;notice:string;eventId:string;garmentIds:string[];source:string}
export default function TryOnPreview({event,garments,closet,photo,onPhotoChange,disabled}:{event:CalendarEvent;garments:Garment[];closet:Garment[];photo:PersonalPhoto|null;onPhotoChange:(photo:PersonalPhoto|null)=>void;disabled:boolean}){
  const [busy,setBusy]=useState(false);const [preparing,setPreparing]=useState(false);const [error,setError]=useState("");
  const [configured,setConfigured]=useState<boolean|null>(null);
  const [preview,setPreview]=useState<{key:string;result:Preview}|null>(null);
  const request=useRef<AbortController|null>(null);
  const key=JSON.stringify([event.id,event.date,event.time,garments.map(g=>g.id).sort(),photo?.id]);
  useEffect(()=>{let active=true;fetch('/api/ai/status',{signal:AbortSignal.timeout(5000),cache:'no-store'}).then(r=>r.json()).then(value=>{if(active)setConfigured(Boolean(value.openaiConfigured));}).catch(()=>{});return()=>{active=false;request.current?.abort();};},[]);
  async function upload(file?:File){if(!file)return;setPreparing(true);setError("");try{onPhotoChange({...await prepareImage(file),id:crypto.randomUUID()});setPreview(null);}catch(e){setError(e instanceof Error?e.message:'Unable to read photo.');}finally{setPreparing(false);}}
  async function generate(){if(!photo||busy)return;setBusy(true);setError("");const controller=new AbortController();request.current=controller;const timer=setTimeout(()=>controller.abort(),165000);
    try{
      const response=await fetch('/api/try-on',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({photo:{data:photo.data,mimeType:photo.mimeType},event,closet,garmentIds:garments.map(g=>g.id)})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to generate preview.');
      if(result.source!=='openai'||result.eventId!==event.id||!Array.isArray(result.garmentIds)||result.garmentIds.length!==garments.length||!garments.every(g=>result.garmentIds.includes(g.id))||typeof result.image!=='string'||!result.image.startsWith('data:image/jpeg;base64,'))throw new Error('The preview did not match the selected outfit.');
      setConfigured(true);setPreview({key,result});
    }catch(e){setError(e instanceof Error&&e.name==='AbortError'?'Preview generation stopped or timed out. Please try again.':e instanceof Error?e.message:'Preview unavailable.');}
    finally{clearTimeout(timer);request.current=null;setBusy(false);}
  }
  const current=preview?.key===key?preview.result:null;
  return <section className="mt-8 border-t border-stone-200 pt-7">
    <p className="eyebrow">Your event, on you</p><h3 className="mt-2 font-serif text-3xl">See this look on me</h3>
    <p className="mt-3 text-sm leading-6 text-stone-500">Upload a clear full-body photo. Preview these exact selected pieces for {event.title} on {event.date} at {event.time}.</p>
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <label className={`btn-secondary ${busy||preparing?'pointer-events-none opacity-50':''}`}>{photo?'Change my photo':'Upload my photo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy||preparing} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>
      {photo&&<><Image unoptimized src={`data:${photo.mimeType};base64,${photo.data}`} alt="Your outfit reference photo" width={64} height={80} className="h-20 w-16 rounded-lg object-cover"/><button disabled={busy} className="text-xs underline" onClick={()=>{onPhotoChange(null);setPreview(null);}}>Remove photo</button></>}
      <button className="btn-primary" disabled={!photo||busy||preparing||disabled} onClick={generate}>{busy?'Creating your preview…':current?'Generate another preview':'Generate my outfit preview'}</button>
    </div>
    <p className="mt-3 text-xs leading-5 text-stone-500">Your photo and selected garment images are sent to OpenAI when you generate a preview. Photos stay in this tab’s memory. Each preview uses your OpenAI API credits. AI visuals are a styling approximation, not a size or fit guarantee.</p>
    {configured===false&&<p className="mt-3 text-sm text-stone-600">OpenAI is not connected yet. Set OPENAI_API_KEY in .env.local and restart the app.</p>}
    {(busy||preparing)&&<p role="status" className="mt-3 text-sm">{preparing?'Preparing your photo…':'Creating one preview for this event. This may take up to two minutes.'}</p>}
    {error&&<p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    {current&&<div className="mt-6"><Image unoptimized src={current.image} alt={`AI-generated preview of you wearing the selected outfit for ${event.title}`} width={1024} height={1536} className="mx-auto max-h-[800px] w-auto max-w-full rounded-2xl"/><p className="mt-3 text-xs text-stone-500">OpenAI-generated · {current.notice}</p><a href={current.image} download={`rewear-${event.date}-${event.id}.jpg`} className="btn-secondary mt-4">Download preview</a></div>}
  </section>;
}
