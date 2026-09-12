import closetSeed from "@/data/closet.json";
import closetImports from "@/data/closet-imports.json";
import eventsSeed from "@/data/events.json";
import type { CalendarEvent, Garment, Outfit, Interaction, ShoppingResult } from "@/types";
import { isGarment, isEvent, isOutfit, isInteraction, isShoppingResult, records } from "@/lib/validation";

export const STORAGE_KEYS = {
  closet: "rewear_closet", events: "rewear_events", outfits: "rewear_outfits",
  interactions: "rewear_interactions", shoppingHistory: "rewear_shopping_history",
} as const;
export interface StorageResult { ok: boolean; error?: string }
export interface StoredData { closet: Garment[]; events: CalendarEvent[]; warnings: string[] }
const warnings = new Map<string, string>();
const memory = new Map<string, unknown>();

function read<T>(key: string, seed: T, valid: (value: unknown) => value is T): T {
  const fallback = () => structuredClone((memory.get(key) as T | undefined) ?? seed);
  if (typeof window === "undefined") return structuredClone(seed);
  if (memory.has(key)) return fallback();
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      const value = fallback();
      window.localStorage.setItem(key, JSON.stringify(value));
      warnings.delete(key); memory.delete(key); return value;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!valid(parsed)) throw new Error("Invalid saved data");
    warnings.delete(key); memory.delete(key); return parsed;
  } catch {
    warnings.set(key, `Could not read or initialize ${key}. Starter or session data is in use; existing saved data is preserved.`);
    return fallback();
  }
}
function save<T>(key: string, value: T, valid: (value: unknown) => value is T): StorageResult {
  if (!valid(value)) return { ok: false, error: `Invalid data for ${key}. Nothing was saved.` };
  if (typeof window === "undefined") return { ok: false, error: "Browser storage is unavailable during server rendering." };
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null && !valid(JSON.parse(raw))) throw new Error("Protect malformed saved data");
    window.localStorage.setItem(key, JSON.stringify(value));
    warnings.delete(key); memory.delete(key); return { ok: true };
  } catch {
    memory.set(key, structuredClone(value));
    const error = `Changes to ${key} are available for this visit only. Browser storage is blocked, full, or contains unreadable data; existing data was preserved.`;
    warnings.set(key, error); return { ok: false, error };
  }
}
export const getCloset = () => read(STORAGE_KEYS.closet, closetSeed as Garment[], records(isGarment));
export const saveCloset = (value: Garment[]) => save(STORAGE_KEYS.closet, value, records(isGarment));
export const getEvents = () => read(STORAGE_KEYS.events, eventsSeed as CalendarEvent[], records(isEvent));
export const saveEvents = (value: CalendarEvent[]) => save(STORAGE_KEYS.events, value, records(isEvent));
export const getOutfits = () => read<Outfit[]>(STORAGE_KEYS.outfits, [], records(isOutfit));
export const saveOutfits = (value: Outfit[]) => save(STORAGE_KEYS.outfits, value, records(isOutfit));
export const getInteractions = () => read<Interaction[]>(STORAGE_KEYS.interactions, [], records(isInteraction));
export const saveInteractions = (value: Interaction[]) => save(STORAGE_KEYS.interactions, value, records(isInteraction));
export function addInteraction(value: Interaction): StorageResult {
  const existing = getInteractions();
  return saveInteractions(existing.some(i => i.id === value.id) ? existing : [...existing, value]);
}
export const getShoppingHistory = () => read<ShoppingResult[]>(STORAGE_KEYS.shoppingHistory, [], records(isShoppingResult));
export const saveShoppingHistory = (value: ShoppingResult[]) => save(STORAGE_KEYS.shoppingHistory, value, records(isShoppingResult));
export const getStorageWarnings = () => [...warnings.values()];
// Apply only explicit user-requested additions, once per import, preserving saved state.
function importClosetAdditions(closet: Garment[]): Garment[] {
  if (typeof window === "undefined" || warnings.has(STORAGE_KEYS.closet)) return closet;
  let merged = closet;
  for (const batch of closetImports) {
    try {
      if (window.localStorage.getItem(batch.key) === "complete") continue;
      const additions = merged.length ? (closetSeed as Garment[]).filter(g => batch.ids.includes(g.id) && !merged.some(saved => saved.id === g.id)) : [];
      merged = [...merged, ...structuredClone(additions)];
      if (additions.length && !saveCloset(merged).ok) return merged;
      window.localStorage.setItem(batch.key, "complete");
    } catch { return merged; }
  }
  return merged;
}
export function initializeStorage(): StoredData {
  const closet = importClosetAdditions(getCloset()); const events = getEvents();
  getOutfits(); getInteractions(); getShoppingHistory();
  return { closet, events, warnings: getStorageWarnings() };
}
