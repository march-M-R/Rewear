import type { Provenance } from "@/types";
export async function postJson<T>(url: string, data: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: AbortSignal.timeout(25000) });
  const value = await response.json();
  if (!response.ok) throw new Error(typeof value.error === "string" ? value.error : "Request failed. Please try again.");
  return value as T;
}
export function sourceLabel(value?: Partial<Provenance> | null) { return value?.source === "openai" ? "OpenAI" : value?.source === "gemini" ? "Gemini" : "Deterministic fallback"; }
