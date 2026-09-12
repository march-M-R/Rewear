import "server-only";
import { isEvent, isGarment, isInteraction, isRecord, records, strings } from "@/lib/validation";
import type { CalendarEvent, Garment, Interaction } from "@/types";
export class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function readBody(request: Request, maximum = 600_000): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new InputError("Send a JSON request.", 415);
  if (Number(request.headers.get("content-length")) > maximum) throw new InputError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Request body is missing.");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > maximum) { await reader.cancel(); throw new InputError("Request is too large.", 413); }
    chunks.push(value);
  }
  try { const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8")); if (isRecord(value)) return value; } catch { /* Return a safe input error. */ }
  throw new InputError("Request must contain a JSON object.");
}
export function closetInput(value: unknown): Garment[] {
  if (!records(isGarment)(value) || value.length > 200 || value.some(g => !g.id || g.id.length > 100 || g.name.length > 200)) throw new InputError("Invalid closet data.");
  return value;
}
export function eventInput(value: unknown): CalendarEvent {
  if (!isEvent(value) || value.title.length > 200 || value.context.length > 1000 || value.dressCode.length > 500) throw new InputError("Invalid event data.");
  return value;
}
export function interactionInput(value: unknown): Interaction[] {
  if (value === undefined) return [];
  if (!records(isInteraction)(value) || value.length > 1000) throw new InputError("Invalid interaction history.");
  return value.slice(-100);
}
export function idsInput(value: unknown, closet: Garment[], label: string): string[] {
  if (value === undefined) return [];
  if (!strings(value) || value.length > 12 || new Set(value).size !== value.length || value.some(id => !closet.some(g => g.id === id && g.status === "active"))) throw new InputError(`Invalid ${label}.`);
  return value;
}
export function recentOutfitsInput(value: unknown, closet: Garment[]): string[][] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) throw new InputError("Invalid recent outfits.");
  return value.map(ids => idsInput(ids, closet, "recent outfit"));
}
export function apiError(error: unknown): Response {
  return Response.json({ error: error instanceof InputError ? error.message : "Unable to complete this request. Please try again." }, { status: error instanceof InputError ? error.status : 500 });
}
