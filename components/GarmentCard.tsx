"use client";
import { useState } from "react";
import type { Garment } from "@/types";
import GarmentImage from "@/components/GarmentImage";
import Modal from "@/components/Modal";
export default function GarmentCard({ garment }: { garment: Garment }) {
  const [details,setDetails] = useState(false);
  return <article className="group min-w-0">
    <button type="button" onClick={() => setDetails(true)} aria-label={`View details: ${garment.name}`} className="relative block w-full text-left"><GarmentImage garment={garment} className="aspect-[4/5]"/><span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-5 py-3 text-[9px] uppercase tracking-widest shadow-sm md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">View details ↗</span></button>
    <div className="mt-4 flex flex-wrap justify-between gap-1"><p className="eyebrow">{garment.category}</p><p className="text-[9px] uppercase tracking-wider text-stone-500">{garment.formality.replaceAll("-"," ")}</p></div><h2 className="mt-2 text-sm font-medium leading-5">{garment.name}</h2><p className="mt-1 text-xs capitalize text-stone-500">{garment.color}</p><p className="mt-3 text-[11px] capitalize text-stone-500">{garment.style.join(" · ")}</p>
    {details && <Modal title={garment.name} onClose={() => setDetails(false)}><div className="grid gap-6 sm:grid-cols-2"><GarmentImage garment={garment} className="aspect-[4/5]"/><div><p className="eyebrow">The details</p><dl className="mt-4 space-y-3 text-sm">{[["Category",garment.category],["Color",[garment.color,...garment.secondaryColors].join(", ")],["Material",garment.material],["Pattern",garment.pattern],["Formality",garment.formality],["Season",garment.season.join(", ")],["Status",garment.status],["Times worn",String(garment.timesWorn)],["Last worn",garment.lastWorn ? new Date(garment.lastWorn).toLocaleDateString() : "Not yet"]].map(([k,v]) => <div key={k}><dt className="text-xs text-stone-500">{k}</dt><dd className="mt-1 capitalize">{v}</dd></div>)}</dl></div></div><p className="mt-6 text-sm text-stone-500">Made for {garment.occasions.join(", ")}.</p></Modal>}
  </article>;
}
