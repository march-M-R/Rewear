"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = ["week", "fits", "closet", "clutter", "shop"];
export default function Navbar() {
  const pathname = usePathname();
  return <header className="border-b border-stone-200/70 bg-[#f7f6f2]">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between px-5 pt-5 sm:px-8 md:py-5 lg:px-14">
      <Link href="/" aria-label="REWEAR home" className="text-2xl font-semibold tracking-[-0.08em]">REWEAR<span className="ml-1 align-top text-xs">®</span></Link>
      <nav aria-label="Main navigation" className="order-3 mt-5 flex w-full justify-between gap-3 md:order-none md:mt-0 md:w-auto md:gap-9">
        {links.map(name => <Link key={name} href={`/${name}`} aria-current={pathname === `/${name}` ? "page" : undefined} className={`border-b-2 pb-4 pt-2 text-[10px] font-medium tracking-[0.18em] md:rounded-full md:border-0 md:px-4 md:py-2.5 ${pathname === `/${name}` ? "border-stone-900 text-stone-900 md:bg-[#e8e5dd]" : "border-transparent text-stone-500 hover:text-stone-900"}`}>{name.toUpperCase()}</Link>)}
      </nav>
      <div role="img" aria-label="Demo wardrobe profile" title="Your demo wardrobe" className="flex size-9 items-center justify-center rounded-full border border-stone-300"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg></div>
    </div>
  </header>;
}
