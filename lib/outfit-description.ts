import type { Garment } from "@/types";

/** Keep both newly generated and previously saved outfit copy concise. */
export function outfitDescription(reasoning: string | undefined, garments: Garment[]): string {
  const text = reasoning?.trim() ?? "";
  const hasIds = /\b(?:top|bottom|dress|outerwear|shoes|bag|accessory)_[a-z0-9_]+\b/i.test(text);
  if (text && !hasIds && text.split(/\s+/).length <= 35) return text;
  const base = garments.filter(g => ["dress", "top", "bottom"].includes(g.category));
  const layer = garments.find(g => g.category === "outerwear");
  if (!base.length) return "A coordinated look from your closet, styled for this event.";
  const summary = `${base.map(g => g.name).join(" and ")}${layer ? `, finished with a ${layer.name.toLowerCase()}` : ""}.`;
  return summary.split(/\s+/).length <= 35 ? summary : "A coordinated look from your closet, styled for this event.";
}
