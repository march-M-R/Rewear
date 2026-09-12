import type { CalendarEvent, Garment, Outfit, Interaction, ShoppingResult, CandidateItem } from "@/types";

export const categories = new Set(["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]);
const seasons = new Set(["spring", "summer", "fall", "winter", "all-season"]);
export const formalities = new Set(["casual", "smart-casual", "professional", "dressy", "formal"]);
const statuses = new Set(["active", "clutter", "revamp", "sell", "donate", "sold", "donated"]);
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export function isGarment(value: unknown): value is Garment {
  if (!isRecord(value) || !isRecord(value.weather)) return false;
  return ["id", "name", "category", "color", "material", "pattern", "formality", "image", "status"].every((key) => typeof value[key] === "string")
    && categories.has(value.category as string)
    && formalities.has(value.formality as string)
    && statuses.has(value.status as string)
    && strings(value.secondaryColors) && strings(value.style) && strings(value.occasions)
    && strings(value.season) && value.season.every((season) => seasons.has(season))
    && ["timesShown", "timesAccepted", "timesRejected", "timesLocked", "timesWorn"].every((key) => Number.isInteger(value[key]) && (value[key] as number) >= 0)
    && (value.lastWorn === null || typeof value.lastWorn === "string")
    && typeof value.weather.minTempF === "number" && Number.isFinite(value.weather.minTempF)
    && typeof value.weather.maxTempF === "number" && Number.isFinite(value.weather.maxTempF)
    && value.weather.minTempF <= value.weather.maxTempF
    && typeof value.weather.rainFriendly === "boolean";
}

export function isEvent(value: unknown): value is CalendarEvent {
  return isRecord(value) && ["id", "title", "date", "time", "context", "dressCode"].every((key) => typeof value[key] === "string");
}

export function records<T extends { id: string }>(check: (value: unknown) => value is T) {
  return (value: unknown): value is T[] => Array.isArray(value)
    && value.every(check) && new Set(value.map((item) => item.id)).size === value.length;
}


export function isOutfit(value: unknown): value is Outfit {
  return isRecord(value) && typeof value.id === "string" && typeof value.eventId === "string"
    && strings(value.garmentIds) && strings(value.lockedIds)
    && ["pending", "love", "nope", "superseded"].includes(value.decision as string);
}
export function isInteraction(value: unknown): value is Interaction {
  return isRecord(value) && typeof value.id === "string" && typeof value.type === "string"
    && strings(value.garmentIds) && typeof value.date === "string";
}
export function isShoppingResult(value: unknown): value is ShoppingResult {
  return isRecord(value) && typeof value.id === "string" && categories.has(value.category as string)
    && ["BUY", "SKIP"].includes(value.verdict as string) && typeof value.match === "number"
    && typeof value.date === "string";
}
export function isCandidate(value: unknown): value is CandidateItem {
  return isRecord(value) && categories.has(value.category as string) && formalities.has(value.formality as string)
    && ["color", "material", "pattern", "silhouette"].every(k => typeof value[k] === "string" && (value[k] as string).length <= 300)
    && strings(value.secondaryColors) && strings(value.style) && value.style.length <= 15;
}
