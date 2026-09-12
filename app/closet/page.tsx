"use client";
import { useState } from "react";
import GarmentCard from "@/components/GarmentCard";
import PageShell from "@/components/PageShell";
import { useWardrobe } from "@/components/WardrobeProvider";
import type { GarmentCategory } from "@/types";
const filters: [string, GarmentCategory | "all"][] = [["All","all"],["Tops","top"],["Bottoms","bottom"],["Dresses","dress"],["Outerwear","outerwear"],["Shoes","shoes"],["Bags","bag"],["Accessories","accessory"]];
export default function ClosetPage() {
  const { data } = useWardrobe(); const [category,setCategory] = useState<GarmentCategory|"all">("all");
  const garments=data?.closet.filter(g => category==="all" || g.category===category) ?? [];
  const count=data?.closet.length ?? 0;
  const active=data?.closet.filter(g=>g.status==="active")??[];
  const categoryCount=(value:GarmentCategory)=>active.filter(g=>g.category===value).length;
  const combinations=(categoryCount("dress")+categoryCount("top")*categoryCount("bottom"))*Math.max(1,categoryCount("shoes"));
  const utilized=count ? Math.round((data?.closet.filter(g=>g.timesWorn>0).length ?? 0)/count*100) : 0;
  return <PageShell label="Your closet" title="More than you think." subtitle={`${count} pieces. More outfits than you think.`}>
    <div className="mb-9 grid grid-cols-3 gap-3 rounded-3xl bg-white p-5 sm:p-7"><div><p className="metric">{count}</p><p className="eyebrow mt-2">Pieces</p></div><div><p className="metric">{utilized}%</p><p className="eyebrow mt-2">Closet utilization</p></div><div><p className="metric">{combinations}</p><p className="eyebrow mt-2">Base combinations</p></div></div>
    <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">{filters.map(([label,value])=><button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)} className={`min-h-11 rounded-full px-4 text-[10px] uppercase tracking-widest ${category===value ? "bg-stone-900 text-white":"bg-white text-stone-500 hover:bg-stone-200"}`}>{label}</button>)}</div>
    <div className="my-7 flex flex-wrap justify-between gap-2"><p role="status" className="text-xs text-stone-500">Showing {garments.length} of {count} garments</p><p className="text-[10px] text-stone-500">Utilization reflects recorded wears · combinations count dress or separates with shoes</p></div>
    {garments.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">{garments.map(g=><GarmentCard key={g.id} garment={g}/>)}</div> : <p className="rounded-3xl bg-white p-16 text-center text-stone-500">{count ? "No pieces in this category yet." : "Your saved closet is empty."}</p>}
  </PageShell>;
}
