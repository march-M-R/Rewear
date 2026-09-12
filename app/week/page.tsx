"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWardrobe } from "@/components/WardrobeProvider";
import { outfitDescription } from "@/lib/outfit-description";
import PageShell from "@/components/PageShell";
import GarmentImage from "@/components/GarmentImage";
import { dateLabel } from "@/lib/demo";
import { sourceLabel } from "@/lib/client-api";
import { reusableSuggestion } from "@/lib/weekly-outfits";
import { validOutfit } from "@/lib/outfits";
export default function WeekPage() {
  const { data,ensureLook,markShown } = useWardrobe();
  const [errors,setErrors]=useState<Record<string,string>>({});const [retry,setRetry]=useState(0);
  const calendarEvents=data?.events;
  useEffect(()=>{let cancelled=false;const generate=async()=>{for(const event of calendarEvents??[]){if(cancelled)break;try{const look=await ensureLook(event);if(!cancelled)markShown(look);}catch(error){if(!cancelled)setErrors(old=>({...old,[event.id]:error instanceof Error?error.message:"Unable to style this event."}));}}};void generate();return()=>{cancelled=true;};},[calendarEvents,ensureLook,markShown,retry]);
  const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const events=data?.events ?? []; const active=data?.closet.filter(g=>g.status==="active") ?? [];
  const complete=active.some(g=>g.category==="shoes") && (active.some(g=>g.category==="dress") || (active.some(g=>g.category==="top") && active.some(g=>g.category==="bottom")));
  return <PageShell label="Your week" title="Life happens. Get dressed." subtitle="Your calendar is already styled." aside={<span className="demo-label">✦ Seed calendar · saved weekly fits</span>}>
    <div className="mb-9 flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-white p-6"><p className="font-serif text-2xl">{events[0] ? dateLabel(events[0].date,{month:"long",day:"numeric"}) : "Your week"}{events.length>1 ? ` — ${dateLabel(events[events.length-1].date,{month:"long",day:"numeric",year:"numeric"})}`:""}</p><div className="flex gap-8"><div><span className="metric">{events.length}</span><p className="eyebrow mt-1">Events</p></div><div><span className="metric">{data?.looks.filter(l=>events.some(e=>e.id===l.eventId) && ["pending","love"].includes(l.decision) && validOutfit(l.garmentIds,active) && reusableSuggestion(l,data.looks,events,active)).reduce((ids,l)=>ids.add(l.eventId),new Set<string>()).size ?? 0}</span><p className="eyebrow mt-1">Looks ready</p></div></div></div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.map((event)=>{
      const latest=data?.looks.findLast(l=>l.eventId===event.id && ["pending","love"].includes(l.decision) && validOutfit(l.garmentIds,active)); const saved=latest && data && reusableSuggestion(latest,data.looks,events,active) ? latest : undefined; const ids=saved?.garmentIds.filter(id=>active.some(g=>g.id===id)) ?? []; const isToday=event.date===today;
      return <article key={event.id} className={`rounded-3xl p-5 sm:p-6 ${isToday?"bg-[#e8e4d9] ring-1 ring-stone-400":"bg-white"}`}>
        <div className="mb-6 flex items-center justify-between"><p className="eyebrow">{dateLabel(event.date,{weekday:"short"})} <span className="ml-1 text-stone-900">{dateLabel(event.date,{day:"2-digit"})}</span></p>{isToday && <span className="rounded-full bg-stone-900 px-3 py-1 text-[9px] uppercase tracking-widest text-white">Today</span>}<span className="text-xs text-stone-500">{event.time}</span></div>
        <h2 className="font-serif text-3xl tracking-tight">{event.title}</h2><p className="mt-2 min-h-8 text-xs leading-5 text-stone-500">{event.dressCode}</p><p className="eyebrow mb-3 mt-6">Suggested look</p><div className="grid grid-cols-2 gap-2">{ids.slice(0,4).map(id=>{const g=active.find(g=>g.id===id)!;return <GarmentImage key={id} garment={g} className="aspect-square"/>;})}</div><p className="my-5 text-xs leading-5 text-stone-500">{saved ? outfitDescription(saved.reasoning,active.filter(g=>ids.includes(g.id))) : errors[event.id] ?? (complete?"Styling this event…":"Your active closet needs a complete outfit base.")}</p>{saved&&<p className="mb-3 text-xs text-stone-500">{sourceLabel(saved)}</p>}{errors[event.id]&&<button onClick={()=>{setErrors({});setRetry(r=>r+1);}} className="mb-3 min-h-10 text-xs underline">Retry styling</button>}<Link href={`/fits?event=${event.id}`} className="btn-secondary w-full">View fit ↗</Link>
      </article>;
    })}</div>{!events.length && <p className="py-16 text-center text-stone-500">No events in your saved calendar yet.</p>}
  </PageShell>;
}
