"use client";
import Link from "next/link";
import GarmentImage from "@/components/GarmentImage";
import { useWardrobe } from "@/components/WardrobeProvider";
export default function Home() {
  const { data } = useWardrobe();
  const featured = ["top_white_01", "bottom_denim_01", "bag_black_01", "shoes_sneakers_01"].flatMap(id => data?.closet.find(g => g.id === id) ?? []);
  return <main id="main-content" className="page-shell">
    <section className="grid items-center gap-10 pb-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-20">
      <div><p className="eyebrow mb-7">REWEAR / Wardrobe intelligence</p><h1 className="font-serif text-[clamp(3.2rem,5.6vw,5.7rem)] leading-[1.02] tracking-[-0.05em]">Your closet is full.<br/><span className="text-stone-500">Your options shouldn’t feel empty.</span></h1><p className="mt-7 max-w-sm text-base leading-7 text-stone-500">AI that helps you wear more, own less, and buy better.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/week" className="btn-primary">Style my week <span>↗</span></Link><Link href="/closet" className="btn-secondary">Explore my closet</Link></div><p className="mt-6 text-xs text-stone-500">A new perspective on the pieces you already own.</p></div>
      <div className="relative rounded-[2rem] bg-[#e9e5dc] p-6 sm:p-8"><div className="mb-5 flex items-center justify-between"><span className="eyebrow">Already in your closet</span><span className="font-serif text-xl italic">The everyday edit</span></div><div className="grid grid-cols-2 gap-3">{featured.map((g,i) => <GarmentImage key={g.id} garment={g} className={`aspect-square ${i===1 ? "rotate-2" : i===2 ? "-rotate-2" : ""}`} />)}</div><div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-widest"><span>Less shopping. More styling.</span><span>01 / 03</span></div></div>
    </section>
    <section aria-label="What REWEAR does" className="grid gap-4 md:grid-cols-3">{[{n:"01",title:"Plan",text:"Your week, styled around your life.",href:"/week"},{n:"02",title:"Learn",text:"Every swipe teaches us what you actually wear.",href:"/fits"},{n:"03",title:"Circulate",text:"Revamp, sell, or donate what no longer serves you.",href:"/clutter"}].map(f => <Link href={f.href} key={f.title} className="group rounded-3xl bg-white p-7 hover:bg-[#eeece6]"><div className="flex justify-between"><span className="eyebrow">{f.n} / {f.title}</span><span aria-hidden="true">↗</span></div><p className="mt-8 max-w-64 font-serif text-3xl tracking-tight">{f.text}</p></Link>)}</section>
    <section className="flex flex-wrap items-end justify-between gap-8 py-16 md:py-24"><div><p className="eyebrow mb-5">Small wardrobe. Bigger possibilities.</p><h2 className="font-serif text-5xl tracking-tight sm:text-6xl">{data?.closet.length ?? 30} pieces.<br/><span className="text-stone-500">Hundreds of possibilities.</span></h2></div><Link href="/closet" className="btn-secondary">Rediscover your closet ↗</Link></section>
  </main>;
}
