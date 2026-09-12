import type { CalendarEvent, Garment, Outfit } from "@/types";
import { sameBase, outfitBase, validOutfit } from "@/lib/outfits";

export const OUTFIT_GENERATOR_VERSION = 3;

export function reusableSuggestion(look: Outfit, looks: Outfit[], events: CalendarEvent[], closet: Garment[]): boolean {
  if (!validOutfit(look.garmentIds, closet, look.lockedIds)) return false;
  // User choices are intentional, even when they repeat a piece or a complete look.
  if (look.decision === "love" || look.wornAt || look.lockedIds.length) return true;
  if (look.generatorVersion !== OUTFIT_GENERATOR_VERSION) return false;
  const index = events.findIndex(event => event.id === look.eventId);
  const earlier = events.slice(0, index).map(event => looks.findLast(other => other.eventId === event.id && ["pending", "love"].includes(other.decision) && validOutfit(other.garmentIds, closet)));
  if (!earlier.some(other => other && sameBase(other.garmentIds, look.garmentIds, closet))) return true;
  const used = new Set(earlier.filter((other): other is Outfit=>Boolean(other)).map(other=>outfitBase(other.garmentIds,closet)));
  const active = closet.filter(g=>g.status==="active");
  const alternative = active.some(g=>g.category==="dress"&&!used.has(g.id)) || active.filter(g=>g.category==="top").some(top=>active.some(bottom=>bottom.category==="bottom"&&!used.has([top.id,bottom.id].sort().join("|"))));
  return !alternative;
}

export function saveSuggestion(looks: Outfit[], next: Outfit): Outfit[] {
  return [...looks.map(old => old.eventId === next.eventId && old.decision === "pending" && !old.lockedIds.length && !old.wornAt ? {...old, decision: "superseded" as const} : old), next];
}
