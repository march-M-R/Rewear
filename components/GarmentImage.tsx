"use client";
import Image from "next/image";
import { useState } from "react";
import type { Garment } from "@/types";
export default function GarmentImage({ garment, className = "" }: { garment: Garment; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <div className={`relative overflow-hidden rounded-2xl bg-[#eeece6] ${className}`}>
    {garment.image.startsWith("/closet/") && failed !== garment.image ? <Image src={garment.image} alt={garment.name} fill sizes="(max-width: 640px) 50vw, 30vw" className="object-contain mix-blend-multiply" onError={() => setFailed(garment.image)} /> :
      <div role="img" aria-label={`${garment.name}: image unavailable`} className="flex h-full min-h-24 flex-col items-center justify-center gap-3 p-3 text-center text-stone-500">
        <svg width="48" height="40" viewBox="0 0 64 48" fill="none" aria-hidden="true"><path d="M27 12a5 5 0 1 1 8 4c-2 1-3 2-3 5v3L7 39c-2 1-1 4 1 4h48c2 0 3-3 1-4L32 24" stroke="currentColor" strokeWidth="1.5" /></svg>
        <span className="text-[10px]">Image coming soon</span>
      </div>}
  </div>;
}
