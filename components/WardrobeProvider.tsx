"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as storage from "@/lib/storage";
import type { CalendarEvent, Garment, GarmentStatus, Interaction, InteractionAction, Outfit, OutfitResponse, ShoppingResult } from "@/types";
import { validOutfit, fallbackOutfit } from "@/lib/outfits";
import { localCalendar } from "@/lib/calendar";
import { swapGarment } from "@/lib/demo";
import { applyInteraction } from "@/lib/behavior";
import { OUTFIT_GENERATOR_VERSION, reusableSuggestion, saveSuggestion } from "@/lib/weekly-outfits";
import { postJson } from "@/lib/client-api";

interface State extends storage.StoredData { looks: Outfit[]; interactions: Interaction[]; shopping: ShoppingResult[] }
interface Actions {
  data: State | null;
  saveLook: (look: Outfit) => void;
  ensureLook: (event: CalendarEvent, force?: boolean) => Promise<Outfit>;
  remixLook: (event: CalendarEvent, look: Outfit, swapId?: string) => Promise<Outfit>;
  markShown: (look: Outfit) => void;
  decide: (look: Outfit, decision: "love" | "nope") => void;
  toggleLock: (look: Outfit, garmentId: string) => Outfit;
  wear: (look: Outfit) => void;
  status: (id: string, value: GarmentStatus, detail?: string) => void;
  saveShopping: (result: ShoppingResult) => void;
  addDemoHistory: () => void;
}
function recentLooks(state: State): string[][] {
  const history = [...state.looks.map(l=>l.garmentIds), ...state.interactions.filter(i=>(i.action??i.type)==="shown").map(i=>i.garmentIds)];
  return history.map(ids=>ids.filter(id=>state.closet.some(g=>g.id===id&&g.status==="active"))).filter(ids=>ids.length).slice(-20);
}
const Context = createContext<Actions | null>(null);
export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<State | null>(null);
  const current = useRef<State | null>(null);
  const requests = useRef(new Map<string, Promise<Outfit>>());
  useEffect(() => {
    const refresh = () => {
      const seed = storage.initializeStorage();
      const state = { ...seed, events:localCalendar.getEvents(), looks: storage.getOutfits(), interactions: storage.getInteractions(), shopping: storage.getShoppingHistory() };
      current.current = state; setData(state);
    };
    refresh(); window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const commit = useCallback((patch: Partial<State>) => {
    if (!current.current) return;
    if (patch.closet) storage.saveCloset(patch.closet);
    if (patch.looks) storage.saveOutfits(patch.looks);
    if (patch.interactions) storage.saveInteractions(patch.interactions);
    if (patch.shopping) storage.saveShoppingHistory(patch.shopping);
    const next = { ...current.current, ...patch, warnings: storage.getStorageWarnings() };
    current.current = next; setData(next);
  }, []);
  const saveLook = useCallback((look: Outfit) => {
    if (!current.current) return;
    commit({ looks: [...current.current.looks.filter(l => l.id !== look.id), look] });
  }, [commit]);
  const record = useCallback((action: InteractionAction, ids: string[], outfit?: Outfit, detail?: string) => {
    const state = current.current; if (!state) return;
    const date = new Date().toISOString();
    const locked = outfit?.lockedIds ?? [];
    const event: Interaction = { id: crypto.randomUUID(), action, type: action, garmentIds: ids, date, timestamp: date, ...(outfit ? { outfitId: outfit.id, lockedGarmentIds: locked } : {}), ...(ids.length === 1 ? { garmentId: ids[0] } : {}), ...(detail ? { detail } : {}) };
    commit({ closet:applyInteraction(state.closet,event), interactions: [...state.interactions, event] });
  }, [commit]);
  const ensureLook = useCallback(async (event: CalendarEvent, force = false): Promise<Outfit> => {
    const state = current.current; if (!state) throw new Error("The wardrobe is still loading.");
    const existing = state.looks.findLast(l => l.eventId === event.id && ["pending", "love"].includes(l.decision) && validOutfit(l.garmentIds, state.closet, l.lockedIds));
    if (existing && !force && reusableSuggestion(existing,state.looks,state.events,state.closet)) return existing;
    const scheduled = state.events.filter(e=>e.id!==event.id).map(e=>state.looks.findLast(l=>l.eventId===e.id&&["pending","love"].includes(l.decision)))
      .filter((l): l is Outfit=>Boolean(l)).map(l=>l.garmentIds.filter(id=>state.closet.some(g=>g.id===id&&g.status==="active")));
    const recentOutfits = [...recentLooks(state),...scheduled].slice(-20);
    const previous=force ? state.looks.findLast(l=>l.eventId===event.id)?.garmentIds.filter(id=>state.closet.some(g=>g.id===id&&g.status==="active"))??[] : [];
    const key = event.id;
    const pending = requests.current.get(key); if (pending) return pending;
    const task = (async () => {
      let result: OutfitResponse;
      try { result = await postJson<OutfitResponse>("/api/outfit", { event, closet: state.closet, interactions: state.interactions.slice(-100), previousGarmentIds:previous, recentOutfits }); }
      catch { result = { ...fallbackOutfit(state.closet, event, [], previous, state.interactions, recentOutfits), source: "fallback", notice: "The server could not be reached. Using a local deterministic fallback." }; }
      if (!validOutfit(result.garmentIds, current.current!.closet)) throw new Error("Your active closet needs a dress or a top and bottom to make a complete look.");
      const look: Outfit = { ...result, id: crypto.randomUUID(), generatorVersion: OUTFIT_GENERATOR_VERSION, eventId: event.id, lockedIds: [], decision: "pending", shown: false };
      commit({looks:saveSuggestion(current.current!.looks,look)}); return look;
    })();
    requests.current.set(key, task);
    try { return await task; } finally { requests.current.delete(key); }
  }, [commit]);
  const remixLook = useCallback(async (event: CalendarEvent, look: Outfit, swapId?: string): Promise<Outfit> => {
    const state = current.current; if (!state) throw new Error("The wardrobe is still loading.");
    if (look.decision !== "pending") throw new Error("Start a new fit before remixing a saved decision.");
    const recentOutfits = recentLooks(state);
    const locked = swapId ? look.garmentIds.filter(id => id !== swapId) : look.lockedIds;
    if (swapId && look.lockedIds.includes(swapId)) throw new Error("Unlock this garment before swapping it.");
    let result: OutfitResponse;
    try { result = await postJson<OutfitResponse>("/api/remix", { event, closet: state.closet, interactions: state.interactions.slice(-100), lockedGarmentIds: locked, previousGarmentIds: look.garmentIds, swapGarmentId: swapId, recentOutfits }); }
    catch { result = { ...(swapId?{garmentIds:swapGarment(state.closet,look.garmentIds,swapId,locked,recentOutfits),reasoning:"The selected category was swapped; other pieces are unchanged."}:fallbackOutfit(state.closet,event,locked,look.garmentIds,state.interactions,recentOutfits)), source:"fallback", notice:"The server could not be reached. Using a local deterministic fallback." }; }
    if (!validOutfit(result.garmentIds,current.current!.closet,locked)) throw new Error("A valid replacement could not be generated. Your current fit is unchanged.");
    const same = result.garmentIds.length===look.garmentIds.length && result.garmentIds.every(id=>look.garmentIds.includes(id));
    if (same) throw new Error("No alternative is available with these locks. Unlock a piece or add more active garments.");
    if (swapId) {
      const original = state.closet.find(g=>g.id===swapId);
      const replacements = result.garmentIds.filter(id=>!look.garmentIds.includes(id));
      if (result.garmentIds.includes(swapId) || replacements.length!==1 || state.closet.find(g=>g.id===replacements[0])?.category!==original?.category) throw new Error("The replacement did not match the selected category.");
    }
    const next: Outfit = { ...look, ...result, generatorVersion: OUTFIT_GENERATOR_VERSION, shown:false };
    record(swapId?"swap":"remix",swapId?[swapId]:look.garmentIds.filter(id=>!look.lockedIds.includes(id)),look);
    saveLook(next); return next;
  }, [record,saveLook]);
  const markShown = useCallback((look: Outfit) => {
    const saved = current.current?.looks.find(l=>l.id===look.id);
    if (!saved || saved.shown || saved.decision !== "pending") return;
    saveLook({...saved,shown:true}); record("shown",saved.garmentIds,saved);
  }, [record,saveLook]);
  const decide = useCallback((look: Outfit, decision:"love"|"nope") => {
    const saved = current.current?.looks.find(l=>l.id===look.id);
    if (!saved || saved.decision!=="pending") return;
    markShown(saved); saveLook({...saved,shown:true,decision}); record(decision==="love"?"accept":"reject",saved.garmentIds,saved);
  }, [markShown,record,saveLook]);
  const toggleLock = useCallback((look: Outfit, id:string) => {
    const saved = current.current?.looks.find(l=>l.id===look.id) ?? look;
    if (saved.decision!=="pending" || !saved.garmentIds.includes(id)) return saved;
    const locked = saved.lockedIds.includes(id);
    const next = {...saved,lockedIds:locked?saved.lockedIds.filter(x=>x!==id):[...saved.lockedIds,id]};
    saveLook(next); record(locked?"unlock":"lock",[id],next); return next;
  }, [record,saveLook]);
  const wear = useCallback((look:Outfit) => {
    const saved=current.current?.looks.find(l=>l.id===look.id);
    if (!saved || saved.wornAt || saved.decision!=="love") return;
    saveLook({...saved,wornAt:new Date().toISOString()}); record("wear",saved.garmentIds,saved);
  },[record,saveLook]);
  const status = useCallback((id:string,value:GarmentStatus,detail?:string)=>{
    const state=current.current; if(!state)return;
    const original=state.closet.find(g=>g.id===id); if(!original || original.status===value)return;
    const action:InteractionAction=value==="active"?"keep":value==="sold"?"sell":value==="donated"?"donate":value==="clutter"?"keep":value;
    commit({closet:state.closet.map(g=>g.id===id?{...g,status:value}:g)}); record(action,[id],undefined,detail??value);
  },[commit,record]);
  const saveShopping=useCallback((result:ShoppingResult)=>{
    const state=current.current;if(!state||state.shopping.some(r=>r.id===result.id))return;
    commit({shopping:[...state.shopping,result]});record(result.verdict==="BUY"?"buy":"skip",[],undefined,result.id);
  },[commit,record]);
  const addDemoHistory=useCallback(async()=>{
    const seed=(await import("@/data/closet.json")).default as Garment[];
    const state=current.current;if(!state)return;
    commit({closet:state.closet.map(g=>{
      const history=seed.find(s=>s.id===g.id);if(!history)return g;
      // Only an explicit user action applies seed history to an existing wardrobe.
      return {...g,timesShown:Math.max(g.timesShown,history.timesShown),timesAccepted:Math.max(g.timesAccepted,history.timesAccepted),timesRejected:Math.max(g.timesRejected,history.timesRejected),timesLocked:Math.max(g.timesLocked,history.timesLocked),timesWorn:Math.max(g.timesWorn,history.timesWorn),lastWorn:g.lastWorn??history.lastWorn};
    })});
  },[commit]);
  return <Context.Provider value={{data,saveLook,ensureLook,remixLook,markShown,decide,toggleLock,wear,status,saveShopping,addDemoHistory}}>{children}</Context.Provider>;
}
export function useWardrobe(){const value=useContext(Context);if(!value)throw new Error("WardrobeProvider is required");return value;}
