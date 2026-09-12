"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWardrobe } from "@/components/WardrobeProvider";
import { outfitDescription } from "@/lib/outfit-description";
import PageShell from "@/components/PageShell";
import TryOnPreview, { type PersonalPhoto } from "@/components/TryOnPreview";
import GarmentImage from "@/components/GarmentImage";
import { dateLabel, type DemoLook } from "@/lib/demo";
import { sourceLabel } from "@/lib/client-api";
import type { CalendarEvent } from "@/types";

function FitStudio({ event, photo, onPhotoChange }: { event: CalendarEvent; photo:PersonalPhoto|null; onPhotoChange:(photo:PersonalPhoto|null)=>void }) {
  const { data, ensureLook, remixLook, markShown, decide: recordDecision, toggleLock, wear } = useWardrobe();
  const [look,setLook]=useState<DemoLook|null>(null);
  const [busy,setBusy]=useState(true);const [message,setMessage]=useState("");
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{try{const next=await ensureLook(event);if(!cancelled){setLook(next);markShown(next);}}catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"Unable to load this fit.");}finally{if(!cancelled)setBusy(false);}};
    void load();return()=>{cancelled=true;};
  },[event,ensureLook,markShown]);
  async function fresh(){setBusy(true);setMessage("");try{const next=await ensureLook(event,true);setLook(next);markShown(next);return true;}catch(error){setMessage(error instanceof Error?error.message:"Please try again.");return false;}finally{setBusy(false);}}
  async function remix(swapId?:string){if(!look)return;setBusy(true);setMessage("");try{const next=await remixLook(event,look,swapId);setLook(next);markShown(next);setMessage(swapId?"One piece swapped. The rest stays yours.":"Your locked pieces stayed. Here is a new combination.");}catch(error){setMessage(error instanceof Error?error.message:"Unable to remix. Your fit is unchanged.");}finally{setBusy(false);}}
  async function decide(decision:"love"|"nope"){if(!look||busy)return;recordDecision(look,decision);setLook({...look,decision});const changed=await fresh();if(changed)setMessage(decision==="love"?"Loved and saved. Here’s another possibility.":"Rejection recorded. Locked pieces were not penalized.");}
  if(!look)return <div className="mx-auto max-w-4xl rounded-[2rem] bg-white p-10 text-center"><p role="status">{busy?"Styling your event…":message}</p>{!busy&&<button className="btn-primary mt-5" onClick={fresh}>Try again</button>}</div>;
  const garments=look.garmentIds.flatMap(id=>data!.closet.find(g=>g.id===id && g.status==="active") ?? []);
  return <><div className="mx-auto max-w-4xl rounded-[2rem] bg-white p-5 sm:p-8"><div className="mb-7 flex flex-wrap justify-between gap-4"><div><p className="eyebrow mb-2">{dateLabel(event.date,{weekday:"long"})} / {dateLabel(event.date,{month:"short",day:"numeric"})}</p><h2 className="font-serif text-3xl sm:text-4xl">{event.title}</h2><p className="mt-2 text-xs text-stone-500">{event.context}</p></div><span className="demo-label self-start">✦ {sourceLabel(look)}</span></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{garments.map(g=>{const locked=look.lockedIds.includes(g.id);return <div key={g.id} className={`rounded-2xl p-2 ${locked?"bg-[#e7e4db] ring-1 ring-stone-600":"bg-[#f7f6f2]"}`}><GarmentImage garment={g} className="aspect-square"/><h3 className="mx-1 mt-3 min-h-9 text-xs leading-5">{g.name}</h3><div className="mt-2 flex flex-wrap justify-between gap-1"><button aria-pressed={locked} aria-label={`${locked?"Unlock":"Lock"} ${g.name}`} disabled={busy || look.decision!=="pending"} onClick={()=>setLook(toggleLock(look,g.id))} className="min-h-10 rounded-full bg-white px-3 text-[9px] uppercase tracking-wider">{locked?"▣ Locked":"◇ Lock"}</button><button disabled={busy || look.decision!=="pending" || locked || !data!.closet.some(other=>other.status==="active" && other.category===g.category && !look.garmentIds.includes(other.id))} onClick={()=>remix(g.id)} className="min-h-10 px-3 text-[9px] uppercase tracking-wider">Swap ↻</button></div></div>;})}</div>
    {!garments.length && <p className="py-10 text-center text-stone-500">There are no active garments to style.</p>}
    <p className="my-7 text-center font-serif text-xl italic text-stone-500">{outfitDescription(look.reasoning,garments)}</p><div className="flex justify-center gap-3"><button disabled={busy || !garments.length || look.decision!=="pending"} onClick={()=>decide("nope")} className="btn-secondary min-w-32"><span className="text-xl">×</span> Nope</button><button disabled={busy || !garments.length || look.decision!=="pending"} onClick={()=>decide("love")} className="btn-primary min-w-40"><span className="text-xl">♡</span> Love it</button></div><button disabled={busy || !garments.length || look.decision!=="pending"} onClick={()=>remix()} className="mx-auto mt-5 block min-h-11 text-[10px] uppercase tracking-widest underline underline-offset-4">↻ Remix the rest</button><p role="status" className="mt-3 min-h-5 text-center text-xs text-stone-500">{busy?"Styling… your current fit stays visible.":message}</p>{look.notice&&<p className="mt-2 text-center text-xs text-stone-500">{look.notice}</p>}<button disabled={busy} onClick={fresh} className="btn-secondary mx-auto mt-3 flex">New fit for this event</button>
    <TryOnPreview event={event} garments={garments} closet={data!.closet} photo={photo} onPhotoChange={onPhotoChange} disabled={busy||!garments.length}/>
    </div><p className="my-7 text-center text-xs text-stone-500">Every swipe teaches REWEAR your real style.</p>
    {!!data!.looks.filter(l=>l.decision==="love").length && <section className="mx-auto mt-12 max-w-4xl"><h2 className="font-serif text-3xl">Your loved looks</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{data!.looks.filter(l=>l.decision==="love").slice(-4).map(saved=><div key={saved.id} className="rounded-2xl bg-white p-5"><p className="eyebrow">{data!.events.find(e=>e.id===saved.eventId)?.title ?? "Saved look"}</p><div className="my-3 flex gap-1">{saved.garmentIds.slice(0,4).flatMap(id=>{const g=data!.closet.find(g=>g.id===id);return g?<GarmentImage key={id} garment={g} className="aspect-square w-1/4"/>:[];})}</div><button disabled={!!saved.wornAt} onClick={()=>{wear(saved);setMessage("Wear recorded in your closet.");}} className="btn-secondary w-full">{saved.wornAt?"Wear recorded":"I wore this"}</button></div>)}</div></section>}
  </>;
}
function FitsContent(){
  const params=useSearchParams();const {data}=useWardrobe();
  const [selected,setSelected]=useState("");const [day,setDay]=useState("");const [photo,setPhoto]=useState<PersonalPhoto|null>(null);
  const requested=data?.events.find(e=>e.id===params.get("event"));
  const now=new Date();const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const selectedDay=day||requested?.date||(data?.events.some(e=>e.date===today)?today:data?.events[0]?.date)||today;
  const daily=data?.events.filter(e=>e.date===selectedDay)??[];
  const event=daily.find(e=>e.id===(selected||requested?.id))??daily[0];
  return <PageShell label="Weekly fits" title="A little more you." subtitle="Outfits for your day. Preview them on you." aside={data&&<div className="flex flex-wrap gap-3"><label className="eyebrow">Day<input aria-label="Outfit date" type="date" value={selectedDay} onChange={e=>{setDay(e.target.value);setSelected("");}} className="ml-2 rounded-full bg-white px-3 py-3 text-xs"/></label><label className="eyebrow">Event<select value={event?.id??""} onChange={e=>setSelected(e.target.value)} className="ml-2 max-w-56 rounded-full bg-white px-4 py-3 text-xs normal-case tracking-normal">{daily.map(e=><option key={e.id} value={e.id}>{e.time} · {e.title}</option>)}</select></label></div>}>
    {event?<FitStudio key={event.id} event={event} photo={photo} onPhotoChange={setPhoto}/>:<p className="py-16 text-center">No events on this day. Choose a date from your weekly calendar.</p>}
  </PageShell>;
}
export default function FitsPage(){return <Suspense fallback={<main id="main-content" className="page-shell">Opening Weekly Fits…</main>}><FitsContent/></Suspense>;}
