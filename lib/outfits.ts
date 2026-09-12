import type { CalendarEvent, Garment, Interaction } from "@/types";
import { makeLook } from "@/lib/demo";
import { isRecord, strings } from "@/lib/validation";

export function validOutfit(ids: unknown, closet: Garment[], locked: string[] = []): ids is string[] {
  if (!strings(ids) || ids.length < 1 || ids.length > 10 || new Set(ids).size !== ids.length) return false;
  const garments = ids.map(id => closet.find(g => g.id === id && g.status === "active"));
  if (garments.some(g => !g) || locked.some(id => !ids.includes(id))) return false;
  const count = (category: string) => garments.filter(g => g?.category === category).length;
  if (!["top", "bottom", "dress", "outerwear", "shoes", "bag"].every(category => count(category) <= 1)) return false;
  return count("dress") === 1 ? count("top") === 0 && count("bottom") === 0 : count("top") === 1 && count("bottom") === 1;
}
export function outfitBase(ids: string[], closet: Garment[]): string {
  return ids.filter(id => closet.some(g => g.id === id && ["top", "bottom", "dress"].includes(g.category))).sort().join("|");
}
export function sameBase(a: string[], b: string[], closet: Garment[]): boolean {
  const base = outfitBase(a, closet);
  return Boolean(base) && base === outfitBase(b, closet);
}
export function sameOutfit(a: string[], b: string[]) { return a.length === b.length && a.every(id => b.includes(id)); }
export function validLocks(locked: string[], closet: Garment[]): boolean {
  const items = closet.filter(g => locked.includes(g.id));
  if (items.some(g => g.category === "dress") && items.some(g => g.category === "top" || g.category === "bottom")) return false;
  return ["top", "bottom", "dress", "outerwear", "shoes", "bag"].every(category => items.filter(g => g.category === category).length <= 1);
}
export function fallbackOutfit(closet: Garment[], event: CalendarEvent, locked: string[] = [], previous: string[] = [], interactions: Interaction[] = [], recentOutfits: string[][] = []) {
  const recent = recentOutfits.slice(-20);
  const signals = interactions.slice(-60);
  const exposure = (id: string) => recent.reduce((sum, ids, index) => sum + (ids.includes(id) ? 1 + index / Math.max(1,recent.length) : 0), 0);
  const preference = (g: Garment) => {
    const swaps = signals.filter(i => (i.action === "swap" || i.type === "swap") && i.garmentIds.includes(g.id)).length;
    const shown = signals.filter(i => (i.action === "shown" || i.type === "shown") && i.garmentIds.includes(g.id)).length;
    const positive = Math.min(5, (2*g.timesLocked + g.timesAccepted + 2*g.timesWorn) / Math.max(1,g.timesShown));
    return positive - 3 * exposure(g.id) - shown * .4 - swaps * 2 - 3 * g.timesRejected / Math.max(1,g.timesShown);
  };
  const ranked = [...closet].sort((a,b) => preference(b) - preference(a));
  const candidates = Array.from({length:32},(_,version) => makeLook(ranked,event,version,locked,previous)).filter(ids=>validOutfit(ids,closet,locked));
  const changed = candidates.filter(ids=>!sameOutfit(ids,previous));
  const unseen = (changed.length ? changed : candidates).filter(ids=>!recent.some(old=>sameOutfit(old,ids)));
  const available = unseen.length ? unseen : changed.length ? changed : candidates;
  const newBases = available.filter(ids=>!recent.some(old=>sameBase(ids,old,closet)));
  const pool = newBases.length ? newBases : available;
  const fashion = /fashion|creative|expressive/i.test(`${event.title} ${event.context} ${event.dressCode}`);
  const score = (ids:string[]) => {
    const pieces = ids.map(id=>closet.find(g=>g.id===id)!);
    const unlocked = pieces.filter(g=>!locked.includes(g.id));
    const accents = new Set(pieces.filter(g=>! /black|white|cream|ivory|gray|grey|beige|tan|camel|navy|indigo|denim|brown|chocolate|silver|gold/i.test(g.color)).map(g=>g.color));
    return unlocked.reduce((sum,g)=>sum+preference(g)+(fashion&&g.style.some(s=>/statement|sculptural|modern|tailored|sleek/i.test(s))?1:0),0)/Math.max(1,unlocked.length) - Math.max(0,accents.size-2)*2;
  };
  pool.sort((a,b)=>score(b)-score(a));
  const garmentIds = pool[0] ?? [];
  const reasoning = `Selected from your active closet for ${event.title.toLowerCase()}. ${fashion ? "Expressive pieces and neutral anchors suit the creative dress code. " : ""}${locked.length ? `${locked.length} locked pieces preserved. ` : ""}${recent.length ? "Recent looks were considered to rotate less-used pieces into this outfit. " : ""}${previous.length && sameOutfit(garmentIds,previous) ? "No different complete look is available with these locks." : "All pieces come from your available wardrobe."}`;
  return { garmentIds, reasoning };
}
export function outfitValidator(closet: Garment[], locked: string[] = [], previous: string[] = [], mustChange = false, recent: string[][] = []) {
  return (value: unknown): value is { garmentIds: string[]; reasoning: string } => isRecord(value)
    && typeof value.reasoning === "string" && value.reasoning.length > 0 && value.reasoning.length <= 2000
    && validOutfit(value.garmentIds, closet, locked) && (!mustChange || !sameOutfit(value.garmentIds, previous)) && !recent.some(ids=>sameOutfit(ids,value.garmentIds as string[]));
}
export const outfitSchema = { type: "object", properties: { garmentIds: { type: "array", items: { type: "string" } }, reasoning: { type: "string" } }, required: ["garmentIds", "reasoning"], additionalProperties: false };
