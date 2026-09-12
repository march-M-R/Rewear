"use client";
import { useEffect, useId, useRef } from "react";
export default function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} aria-labelledby={id} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl bg-[#f7f6f2] p-6 text-stone-900 shadow-2xl backdrop:bg-black/40 sm:p-10">
    <div className="mb-7 flex items-start justify-between gap-5"><h2 id={id} className="font-serif text-3xl sm:text-4xl">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-xl">×</button></div>
    {children}
  </dialog>;
}
