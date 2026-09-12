import type { CandidateItem, Garment, CalendarEvent, Interaction, ShopAnalysis } from "@/types";
import { makeLook } from "@/lib/demo";
import { validOutfit } from "@/lib/outfits";
export const CANDIDATE_ID="__candidate__";
const neutral=(color:string)=>/black|white|cream|gray|grey|beige|tan|camel|navy|denim|brown/i.test(color);
const norm=(text:string)=>text.trim().toLowerCase();
const rank={casual:0,"smart-casual":1,professional:2,dressy:2,formal:3};
const overlap=(a:string[],b:string[])=>a.some(x=>b.some(y=>norm(x)===norm(y)));
export function candidateGarment(item:CandidateItem):Garment {
 return {id:CANDIDATE_ID,name:"Potential purchase",...item,season:["all-season"],occasions:[],weather:{minTempF:0,maxTempF:110,rainFriendly:false},image:"",timesShown:0,timesAccepted:0,timesRejected:0,timesLocked:0,timesWorn:0,lastWorn:null,status:"active"};
}
function pairs(item:CandidateItem,g:Garment):boolean {
 if(item.category===g.category)return false;
 if((item.category==="dress"&&["top","bottom"].includes(g.category))||(g.category==="dress"&&["top","bottom"].includes(item.category)))return false;
 return Math.abs(rank[item.formality]-rank[g.formality])<=1&&(neutral(item.color)||neutral(g.color)||norm(item.color)===norm(g.color)||overlap(item.secondaryColors,[g.color,...g.secondaryColors]));
}
function similarity(item:CandidateItem,g:Garment):number {
 if(item.category!==g.category)return 0;
 return 35+(norm(item.color)===norm(g.color)&&item.color!=="unknown"?30:0)+(item.formality===g.formality?15:0)+(overlap(item.style,g.style)?10:0)+(item.pattern===g.pattern&&item.pattern!=="unknown"?10:0);
}
export function candidateOutfits(item:CandidateItem,closet:Garment[],events:CalendarEvent[]) {
 const candidate=candidateGarment(item);const available=[candidate,...closet.filter(g=>g.status==="active"&&g.id!==CANDIDATE_ID)];
 const result:ShopAnalysis["outfits"]=[];
 const fallbackEvent:CalendarEvent={id:"daily",title:"Everyday",date:"2026-09-12",time:"09:00 AM",context:"Everyday outfit",dressCode:"smart-casual"};
 for(let index=0;index<12&&result.length<3;index++){
  const event=events[index%Math.max(events.length,1)]??fallbackEvent;
  const ids=makeLook(available,event,index,[CANDIDATE_ID]);
  if(!validOutfit(ids,available,[CANDIDATE_ID]))continue;
  if(result.some(r=>r.garmentIds.length===ids.length&&r.garmentIds.every(id=>ids.includes(id))))continue;
  result.push({garmentIds:ids,reasoning:`Your potential ${item.category} stays fixed, paired with existing pieces for ${event.title.toLowerCase()}.`});
 }
 return result;
}
/** Scores are transparent product heuristics, not calibrated scientific probabilities. */
export function wardrobeImpact(item:CandidateItem,closet:Garment[],events:CalendarEvent[],interactions:Interaction[]=[]):Omit<ShopAnalysis,"source"|"notice"> {
 const active=closet.filter(g=>g.status==="active");
 const compatible=active.filter(g=>pairs(item,g));
 const similar=active.filter(g=>similarity(item,g)>=65).sort((a,b)=>similarity(item,b)-similarity(item,a));
 const redundancy=active.length?Math.max(0,...active.map(g=>similarity(item,g))):0;
 const family=active.filter(g=>g.category===item.category||overlap(item.style,g.style));
 const positive=family.reduce((sum,g)=>sum+g.timesAccepted+g.timesLocked*2+g.timesWorn*2,0);
 const swaps=interactions.filter(i=>(i.action==="swap"||i.type==="swap")&&i.garmentIds.some(id=>family.some(g=>g.id===id))).length;
 const negative=family.reduce((sum,g)=>sum+g.timesRejected*.35,0)+swaps*2;
 const styleMatch=positive+negative?Math.round(100*positive/(positive+negative)):50;
 const compatibility=active.length?Math.round(100*compatible.length/active.length):0;
 const existingCategory=active.filter(g=>g.category===item.category).length;
 const wardrobeNeed=Math.max(0,100-existingCategory*20-(similar.length?20:0));
 const eventMatch=(event:CalendarEvent)=>/work|office|client|professional|network/i.test(event.title+" "+event.dressCode)?rank[item.formality]>=1:/date|dinner|party/i.test(event.title)?rank[item.formality]>=1:rank[item.formality]<=2;
 const matchedEvents=events.filter(eventMatch);
 const upcomingUtility=events.length?Math.round(100*matchedEvents.length/events.length):0;
 const wardrobeImpact=Math.round(.30*compatibility+.25*styleMatch+.20*(100-redundancy)+.15*wardrobeNeed+.10*upcomingUtility);
 const outfits=candidateOutfits(item,active,events);
 const verdict=wardrobeImpact>=60&&redundancy<80&&outfits.length>0?"buy":"skip";
 const reasons=[`${compatible.length} of ${active.length} active pieces plausibly pair by category, color, and formality.`,`${similar.length} close functional ${similar.length===1?"duplicate":"duplicates"} by category, color, formality, pattern, and style.`,`${existingCategory} active ${item.category} pieces already owned.`,`${matchedEvents.length} of ${events.length} events match this level of formality.`,positive+negative?`Style match uses accepts + 2×locks + 2×wears, balanced against 0.35×rejections + 2×specific swaps.`:"No related behavior yet; style match starts at a neutral 50."];
 return {item,styleMatch,compatibility,redundancy,wardrobeNeed,wardrobeImpact,upcomingUtility,verdict,similarGarmentIds:similar.map(g=>g.id),compatibleGarmentIds:compatible.map(g=>g.id),reasoning:verdict==="buy"?`This piece adds useful outfit options with ${compatible.length} existing items and ${similar.length} close duplicates.`:`This piece offers limited extra utility: ${similar.length} close duplicates, ${compatible.length} plausible pairings, and a Wardrobe Impact of ${wardrobeImpact}/100.`,reasons,outfits};
}
