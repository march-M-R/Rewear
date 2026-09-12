import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { WardrobeProvider } from "@/components/WardrobeProvider";
import "./globals.css";
export const metadata: Metadata = { title: "REWEAR — Wear more. Own less. Buy better.", description: "Wardrobe intelligence that helps you make more of the clothes you already own." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="h-full antialiased"><body className="flex min-h-full flex-col font-sans"><a href="#main-content" className="sr-only focus:not-sr-only focus:p-4">Skip to content</a><WardrobeProvider><Navbar />{children}<footer className="mx-auto flex w-full max-w-[1440px] flex-wrap justify-between gap-4 border-t border-stone-200 px-5 py-7 text-[9px] uppercase tracking-[0.2em] text-stone-500 sm:px-8 lg:px-14"><span>REWEAR — A more considered closet.</span><span>Wear more. Own less. Buy better.</span></footer></WardrobeProvider></body></html>;
}
