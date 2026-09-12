import {test} from 'node:test';
import assert from 'node:assert/strict';
import {closet,events,createLoader,request} from './helpers.mjs';
const load=createLoader();
const {reusableSuggestion,saveSuggestion,OUTFIT_GENERATOR_VERSION}=load('lib/weekly-outfits.ts');
const {fallbackOutfit,outfitBase}=load('lib/outfits.ts');
const {POST}=load('app/api/outfit/route.ts');
const legacy=()=>events.map((event,i)=>({id:`old-${i}`,eventId:event.id,garmentIds:['top_blue_01','bottom_black_01','outerwear_camel_01','shoes_loafers_01','bag_tote_01'],lockedIds:[],decision:'pending',shown:true}));

test('persisted duplicate weekly suggestions are replaced once with seven different bases',async()=>{
 // Reproduce an old stored week, including duplicates, rather than starting from an empty cache.
 let looks=legacy();
 // Use actual known seed IDs for a valid repeated legacy look.
 const repeated=fallbackOutfit(closet,events[0]).garmentIds;
 looks=looks.map(l=>({...l,garmentIds:repeated}));
 for(const event of events){
  const existing=looks.findLast(l=>l.eventId===event.id&&l.decision==='pending');
  assert.equal(reusableSuggestion(existing,looks,events,closet),false);
  const recentOutfits=events.map(e=>looks.findLast(l=>l.eventId===e.id&&l.decision==='pending')?.garmentIds).filter(Boolean);
  const response=await POST(request({closet,event,interactions:[],recentOutfits}));
  assert.equal(response.status,200);
  const result=await response.json();
  looks=saveSuggestion(looks,{...result,id:`new-${event.id}`,eventId:event.id,lockedIds:[],decision:'pending',generatorVersion:OUTFIT_GENERATOR_VERSION});
 }
 const pending=looks.filter(l=>l.decision==='pending');
 assert.equal(pending.length,7);
 assert.equal(new Set(pending.map(l=>outfitBase(l.garmentIds,closet))).size,7);
 assert.equal(looks.filter(l=>l.decision==='superseded').length,7);
 const reloaded=JSON.parse(JSON.stringify(looks));
 assert.ok(pending.every(l=>reusableSuggestion(l,reloaded,events,closet)),'refresh must reuse the repaired week');
});
test('old loved looks and garment locks survive cache upgrades',()=>{
 const garmentIds=fallbackOutfit(closet,events[0]).garmentIds;
 const base={id:'saved',eventId:events[0].id,garmentIds,lockedIds:[],decision:'pending'};
 for(const protectedLook of [{...base,decision:'love'},{...base,lockedIds:[garmentIds[0]]}]){
  assert.equal(reusableSuggestion(protectedLook,[protectedLook],events,closet),true);
  const updated=saveSuggestion([protectedLook],{...base,id:'new'});
  assert.deepEqual(updated[0],protectedLook);
 }
});
test('new-version weekly suggestions with the same base are detected even when bags differ',()=>{
 const garmentIds=fallbackOutfit(closet,events[0]).garmentIds;
 const first={id:'a',eventId:events[0].id,garmentIds,lockedIds:[],decision:'pending',generatorVersion:OUTFIT_GENERATOR_VERSION};
 const bag=closet.find(g=>g.category==='bag'&&!garmentIds.includes(g.id));
 const second={...first,id:'b',eventId:events[1].id,garmentIds:garmentIds.filter(id=>!closet.some(g=>g.id===id&&g.category==='bag')).concat(bag.id)};
 assert.equal(reusableSuggestion(second,[first,second],events,closet),false);
});
