import type { CalendarEvent, Garment, GarmentCategory } from "@/types";

export type { Outfit as DemoLook, Interaction, ShoppingResult } from "@/types";

/** Deliberately simple demo styling. Selects only available closet IDs. */
export function makeLook(closet: Garment[], event: CalendarEvent, version = 0, locked: string[] = [], previous: string[] = []): string[] {
  const active = closet.filter(g => g.status === "active");
  const preserved = active.filter(g => locked.includes(g.id));
  const context = `${event.title} ${event.context} ${event.dressCode}`;
  const fashion = /fashion|creative|expressive/i.test(context);
  const casual = !fashion && /weekend|casual|relaxed/i.test(context);
  const hasDress = active.some(g => g.category === "dress");
  const hasSeparates = active.some(g => g.category === "top") && active.some(g => g.category === "bottom");
  const dress = preserved.some(g => g.category === "dress") || (hasDress && !preserved.some(g => g.category === "top" || g.category === "bottom") && (!hasSeparates || (/date|dinner/i.test(event.title) || (fashion && version % 3 === 2))));
  const categories: GarmentCategory[] = [...(dress ? ["dress" as const] : ["top" as const, "bottom" as const]), "outerwear", "shoes", "bag", "accessory"];
  const result = [...preserved];
  for (const category of categories) {
    if (result.some(g => g.category === category)) continue;
    let pool = active.filter(g => g.category === category);
    const fresh = pool.filter(g => !previous.includes(g.id));
    if (fresh.length) pool = fresh;
    pool.sort((a, b) => Number(b.formality === (fashion ? "smart-casual" : casual ? "casual" : "professional")) - Number(a.formality === (fashion ? "smart-casual" : casual ? "casual" : "professional")));
    const chosen = pool[version % Math.max(pool.length, 1)];
    if (chosen) result.push(chosen);
  }
  return result.map(g => g.id);
}
export function swapGarment(closet: Garment[], ids: string[], id: string, locked: string[], recent: string[][] = []): string[] {
  if (locked.includes(id)) return ids;
  const original = closet.find(g => g.id === id);
  const exposure = (id: string) => recent.reduce((sum,look)=>sum+Number(look.includes(id)),0);
  const replacement = closet.filter(g => g.status === "active" && g.category === original?.category && !ids.includes(g.id)).sort((a,b)=>exposure(a.id)-exposure(b.id))[0];
  return replacement ? ids.map(value => value === id ? replacement.id : value) : ids;
}
export function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", options);
}
export const demoClutterIds = ["top_yellow_01", "bottom_print_01", "dress_red_01", "bag_cobalt_01", "accessory_scarf_01", "shoes_heels_01", "outerwear_print_01", "dress_flower_01"];
