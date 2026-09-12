"use client";
import { useWardrobe } from "@/components/WardrobeProvider";
export default function PageShell({ label, title, subtitle, children, aside }: { label: string; title: string; subtitle: string; children: React.ReactNode; aside?: React.ReactNode }) {
  const { data } = useWardrobe();
  return <main id="main-content" className="page-shell">
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow mb-4">{label}</p><h1 className="editorial-title">{title}</h1><p className="mt-4 max-w-xl text-sm leading-6 text-stone-500 sm:text-base">{subtitle}</p></div>{aside}</header>
    {data?.warnings.map(w => <p key={w} role="status" className="mb-5 rounded-2xl bg-stone-200 p-4 text-sm">{w}</p>)}
    {data ? children : <p role="status" className="py-20 text-center text-stone-500">Opening your wardrobe…</p>}
  </main>;
}
