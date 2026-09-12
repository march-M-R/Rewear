"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import GarmentImage from "@/components/GarmentImage";
import type { Garment, RevampIdea } from "@/types";
export default function RevampPreview({garment,idea,compact=false}:{garment:Garment;idea:RevampIdea;compact?:boolean}){
  const [preview,setPreview]=useState<{image:string;notice:string}|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const active=useRef<AbortController|null>(null);
  useEffect(()=>()=>active.current?.abort(),[]);
  async function generate(){if(busy)return;setBusy(true);setError("");const controller=new AbortController();active.current=controller;const timer=setTimeout(()=>controller.abort(),165000);
    try{
      const response=await fetch('/api/revamp-preview',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({garment,idea})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to generate preview.');
      if(result.source!=='openai'||result.garmentId!==garment.id||result.ideaTitle!==idea.title||typeof result.image!=='string'||!result.image.startsWith('data:image/jpeg;base64,'))throw new Error('The image did not match this revamp idea. Please try again.');
      setPreview(result);
    }catch(e){setError(e instanceof Error&&e.name==='AbortError'?'Preview generation stopped or timed out. Please try again.':e instanceof Error?e.message:'Unable to generate preview.');}
    finally{clearTimeout(timer);active.current=null;setBusy(false);}
  }
  return <section aria-label={`Visualise ${idea.title}`} className={compact ? "mt-4 border-t border-stone-200 pt-4" : "my-6 rounded-2xl border border-stone-200 p-4"}>
    {!compact&&<><p className="eyebrow">Before you begin</p><h4 className="mt-2 font-serif text-2xl">See the transformation</h4></>}
    <button disabled={busy} onClick={generate} className={`btn-primary w-full ${compact?"":"mt-4"}`}>{busy?'Creating after-image…':preview?'Generate another preview':'Visualise after revamp'}</button>
    <p className="mt-2 text-xs leading-5 text-stone-500">Uses your garment photo and this DIY plan. Generates one image using your OpenAI API credits.</p>
    {busy&&<p role="status" className="mt-3 text-sm">This may take up to two minutes. Your DIY plan stays unchanged.</p>}
    {error&&<p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    {preview&&<><div className="mt-5 grid grid-cols-2 gap-3"><div><p className="eyebrow mb-2">Before</p><GarmentImage garment={garment} className="aspect-square"/></div><div><p className="eyebrow mb-2">After · AI preview</p><Image unoptimized src={preview.image} alt={`${garment.name} after ${idea.title}`} width={1024} height={1024} className="aspect-square w-full rounded-2xl object-contain"/></div></div><p className="mt-3 text-xs leading-5 text-stone-500">{preview.notice}</p><a href={preview.image} download={`rewear-revamp-${garment.id}.jpg`} className="mt-3 inline-block text-xs underline">Download after-image</a></>}
  </section>;
}
