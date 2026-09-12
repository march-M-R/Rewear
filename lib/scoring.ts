import type { Garment, Interaction } from "@/types";
export interface ClutterScore { candidate: boolean; score: number; rejectionRate: number; swapCount: number; reasons: string[] }
export function clutterScore(garment: Garment, interactions: Interaction[] = [], now = Date.now()): ClutterScore {
  const rejectionRate = garment.timesShown ? Math.min(1,garment.timesRejected/garment.timesShown) : 0;
  const swapCount = interactions.filter(i => (i.action === "swap" || i.type === "swap") && i.garmentIds.includes(garment.id)).length;
  const reasons = [`Rejected or swapped in ${garment.timesRejected} of ${garment.timesShown} recommendations (${Math.round(rejectionRate*100)}%).`];
  if (swapCount) reasons.push(`${swapCount} direct swaps: stronger evidence than rejecting an entire outfit.`);
  if (!garment.timesLocked) reasons.push("Never locked into a look.");
  if (!garment.timesWorn) reasons.push("No recorded wears.");
  const age = garment.lastWorn ? (now-Date.parse(garment.lastWorn))/86400000 : 0;
  if (age>90) reasons.push(`Last recorded wear was ${Math.floor(age)} days ago.`);
  if (garment.timesLocked) reasons.push(`Locked ${garment.timesLocked} times; this positive signal reduces the score.`);
  if (garment.timesAccepted) reasons.push(`Accepted ${garment.timesAccepted} times.`);
  const score = Math.round(Math.max(0,Math.min(100,rejectionRate*70+Math.min(swapCount*7,21)+(garment.timesWorn===0?10:0)+(age>90?5:0)+(garment.timesLocked===0?5:0)-Math.min(garment.timesLocked*3+garment.timesWorn*2,20))));
  return { candidate:["active","clutter"].includes(garment.status)&&garment.timesShown>=4&&rejectionRate>=.7, score, rejectionRate, swapCount, reasons };
}
