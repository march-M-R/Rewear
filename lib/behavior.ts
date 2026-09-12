import type { Garment, Interaction } from "@/types";
/** Whole-outfit rejection is weak evidence; specific swaps are weighted more heavily in scoring. */
export function applyInteraction(closet: Garment[], interaction: Interaction): Garment[] {
  const action = interaction.action ?? ({ love:"accept", nope:"reject", worn:"wear" }[interaction.type] ?? interaction.type);
  const locked = interaction.lockedGarmentIds ?? [];
  return closet.map(g => {
    if (!interaction.garmentIds.includes(g.id)) return g;
    if (action === "shown") return { ...g, timesShown:g.timesShown+1 };
    if (action === "accept") return { ...g, timesAccepted:g.timesAccepted+1 };
    if ((action === "reject" && !locked.includes(g.id)) || action === "swap") return { ...g, timesRejected:g.timesRejected+1 };
    if (action === "lock") return { ...g, timesLocked:g.timesLocked+1 };
    if (action === "wear") return { ...g, timesWorn:g.timesWorn+1,lastWorn:interaction.timestamp??interaction.date };
    return g;
  });
}
