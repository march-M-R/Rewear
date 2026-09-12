import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closet,events,createLoader,request,image } from './helpers.mjs';
const load=createLoader();
const { validOutfit,fallbackOutfit }=load('lib/outfits.ts');
const { clutterScore }=load('lib/scoring.ts');
const { applyInteraction }=load('lib/behavior.ts');
const { wardrobeImpact,CANDIDATE_ID }=load('lib/shop-analysis.ts');
const hints={category:'outerwear',color:'black',secondaryColors:[],style:['minimal'],material:'unknown',pattern:'solid',formality:'smart-casual',silhouette:'cropped'};
const body={closet,events,event:events[0],interactions:[]};
const configured={process:{env:{GEMINI_API_KEY:'unit-test-secret'},cwd:()=>process.cwd()}};
const modelResponse=value=>async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});

test('all storage helpers safely preserve, save, append, and reload each collection',()=>{
 const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const lib=createLoader({window:{localStorage:storage}})('lib/storage.ts');lib.initializeStorage();
 for(const [getter,saver] of [['getCloset','saveCloset'],['getEvents','saveEvents'],['getOutfits','saveOutfits'],['getInteractions','saveInteractions'],['getShoppingHistory','saveShoppingHistory']]){
  const value=lib[getter]();assert.equal(lib[saver](value).ok,true);assert.equal(JSON.stringify(lib[getter]()),JSON.stringify(value));
 }
 const event={id:'i-1',action:'accept',type:'accept',date:'2026-09-12',timestamp:'2026-09-12',garmentIds:[closet[0].id]};
 assert.equal(lib.addInteraction(event).ok,true);lib.addInteraction(event);assert.equal(lib.getInteractions().length,1);
 map.set('rewear_closet','bad');assert.equal(lib.saveCloset(closet).ok,false);assert.equal(map.get('rewear_closet'),'bad');
 const ssr=createLoader()('lib/storage.ts');assert.equal(ssr.saveCloset(closet).ok,false);
});
test('seed candidates arise from history; swaps and locked signals affect scoring correctly',()=>{
 assert.equal(closet.filter(g=>clutterScore(g).candidate).length,3);
 const g={...closet[0],timesShown:4,timesRejected:2,timesLocked:0,timesWorn:0,timesAccepted:0};
 const interaction={id:'swap',type:'swap',action:'swap',garmentIds:[g.id],date:'2026-09-12'};
 const changed=applyInteraction([g],interaction)[0];assert.equal(clutterScore(g).candidate,false);assert.equal(clutterScore(changed,[interaction]).candidate,true);
 assert.ok(clutterScore(changed,[interaction]).score>clutterScore(changed).score);
 const rejected=applyInteraction([g],{...interaction,action:'reject',lockedGarmentIds:[g.id]})[0];assert.equal(rejected.timesRejected,g.timesRejected);
 const locked=applyInteraction([g],{...interaction,action:'lock'})[0];assert.equal(locked.timesLocked,1);
});
test('outfit route returns valid, labeled fallback without a key',async()=>{
 const response=await load('app/api/outfit/route.ts').POST(request(body));assert.equal(response.status,200);const value=await response.json();assert.equal(value.source,'fallback');assert.ok(validOutfit(value.garmentIds,closet));
});
test('Gemini contract uses server key header and structured output; valid output is labeled Gemini',async()=>{
 const expected=fallbackOutfit(closet,events[0]);let called=false;
 const gemini=createLoader({...configured,fetch:async(url,options)=>{called=true;assert.ok(!url.includes('unit-test-secret'));assert.equal(options.headers['x-goog-api-key'],'unit-test-secret');const payload=JSON.parse(options.body);assert.equal(payload.generationConfig.responseMimeType,'application/json');assert.ok(payload.generationConfig.responseJsonSchema);return modelResponse(expected)();}});
 const response=await gemini('app/api/outfit/route.ts').POST(request(body));const value=await response.json();assert.ok(called);assert.equal(value.source,'gemini');assert.ok(!JSON.stringify(value).includes('unit-test-secret'));
});
test('invented IDs, duplicate IDs, invalid base combinations, and provider errors never reach the client as Gemini outfits',async()=>{
 const valid=fallbackOutfit(closet,events[0]);
 for(const ids of [['invented'],[...valid.garmentIds,valid.garmentIds[0]],['dress_black_01','bottom_black_01'],['shoes_heels_01','shoes_sneakers_01']]){
  const route=createLoader({...configured,fetch:modelResponse({garmentIds:ids,reasoning:'Invalid'})})('app/api/outfit/route.ts');const response=await route.POST(request(body));const value=await response.json();assert.equal(value.source,'fallback');assert.ok(validOutfit(value.garmentIds,closet));
 }
 const failed=createLoader({...configured,fetch:async()=>new Response('upstream details',{status:429})})('app/api/outfit/route.ts');assert.equal((await (await failed.POST(request(body))).json()).source,'fallback');
});
test('remix route rejects conflicting locks and retains locks despite model violations',async()=>{
 const previous=fallbackOutfit(closet,events[0]).garmentIds;const locked=[previous[0]];
 const remixBody={...body,lockedGarmentIds:locked,previousGarmentIds:previous};
 const route=createLoader({...configured,fetch:modelResponse({garmentIds:['dress_black_01'],reasoning:'Drops locks'})})('app/api/remix/route.ts');
 const value=await (await route.POST(request(remixBody))).json();assert.equal(value.source,'fallback');assert.ok(validOutfit(value.garmentIds,closet,locked));assert.ok(!previous.every(id=>value.garmentIds.includes(id)));
 const invalid=await route.POST(request({...remixBody,lockedGarmentIds:['dress_black_01','bottom_black_01']}));assert.equal(invalid.status,400);
});
test('single-category swap preserves every other ID, including dress swap at a work event',async()=>{
 const previous=['dress_black_01','outerwear_black_01','shoes_heels_01','bag_black_01'];const swap='dress_black_01';
 const result=await (await load('app/api/remix/route.ts').POST(request({...body,lockedGarmentIds:previous.filter(id=>id!==swap),previousGarmentIds:previous,swapGarmentId:swap}))).json();
 assert.equal(result.source,'fallback');assert.ok(!result.garmentIds.includes(swap));assert.ok(previous.filter(id=>id!==swap).every(id=>result.garmentIds.includes(id)));assert.equal(closet.find(g=>g.id===result.garmentIds.find(id=>!previous.includes(id))).category,'dress');
});
test('revamp and listing produce usable structured fallbacks, not fabricated condition claims',async()=>{
 const garment=closet.find(g=>g.id==='top_yellow_01');const revamp=await (await load('app/api/revamp/route.ts').POST(request({garment}))).json();assert.equal(revamp.source,'fallback');assert.equal(revamp.ideas.length,3);assert.ok(revamp.ideas.every(i=>i.steps.length>=3&&i.materials.length&&i.timeMinutes>0));
 const condition='Condition to be confirmed';const listing=await (await load('app/api/listing/route.ts').POST(request({garment,condition}))).json();assert.equal(listing.condition,condition);assert.ok(listing.description.length>50);assert.ok(listing.keywords.length);assert.ok(listing.suggestedPriceRange.includes('$'));
});
test('shop accepts a real image, rejects spoofed/oversized images, and scores deterministically',async()=>{
 const route=load('app/api/shop/route.ts');const payload={...body,image,fallbackItem:hints};
 const response=await route.POST(request(payload));assert.equal(response.status,200);const result=await response.json();assert.equal(result.source,'fallback');assert.ok(result.notice.includes('photo was not analyzed'));assert.ok(['buy','skip'].includes(result.verdict));
 for(const key of ['styleMatch','compatibility','redundancy','wardrobeNeed','wardrobeImpact'])assert.ok(result[key]>=0&&result[key]<=100);
 assert.equal(result.wardrobeImpact,wardrobeImpact(hints,closet,events).wardrobeImpact);assert.ok(result.similarGarmentIds.every(id=>closet.some(g=>g.id===id)));
 assert.equal((await route.POST(request({...payload,image:{mimeType:'image/jpeg',data:image.data}}))).status,400);
 assert.equal((await route.POST(request({...payload,image:{mimeType:'image/png',data:'a'.repeat(2_800_000)}}))).status,413);
});
test('candidate outfits always contain the fixed candidate and only valid complementary closet IDs',()=>{
 for(const category of ['top','bottom','dress','outerwear','shoes','bag','accessory']){
  const value=wardrobeImpact({...hints,category},closet,events);assert.equal(value.outfits.length,3);
  for(const outfit of value.outfits){assert.equal(outfit.garmentIds.filter(id=>id===CANDIDATE_ID).length,1);assert.ok(outfit.garmentIds.every(id=>id===CANDIDATE_ID||closet.some(g=>g.id===id)));}
 }
});
test('both buy and skip are reachable from wardrobe utility, not a selected verdict',()=>{
 const duplicate=wardrobeImpact({...hints,category:'top',color:'white',style:['classic','minimal','tailored'],formality:'smart-casual',pattern:'solid'},closet,events);assert.equal(duplicate.verdict,'skip');
 const noLayers=closet.filter(g=>g.category!=='outerwear');const addition=wardrobeImpact({...hints,color:'cream'},noLayers,events);assert.equal(addition.verdict,'buy');
});

test('reject/accept next-look request avoids the immediately preceding outfit',async()=>{
 const route=load('app/api/outfit/route.ts');const first=await (await route.POST(request(body))).json();
 const second=await (await route.POST(request({...body,previousGarmentIds:first.garmentIds}))).json();
 assert.ok(validOutfit(second.garmentIds,closet));assert.ok(!first.garmentIds.every(id=>second.garmentIds.includes(id)));
});

test('multimodal Gemini path sends image and wardrobe context, validates referenced IDs, and leaves arithmetic deterministic',async()=>{
 let called=false;
 const route=createLoader({...configured,fetch:async(_url,options)=>{
  called=true;const payload=JSON.parse(options.body);assert.equal(payload.contents[0].parts[1].inlineData.mimeType,'image/png');assert.ok(payload.contents[0].parts[0].text.includes(closet[0].id));
  return modelResponse({item:hints,wardrobeReasoning:'This could layer over familiar pieces, but similar outerwear is already owned.',referencedGarmentIds:[closet[0].id]})();
 }})('app/api/shop/route.ts');
 const value=await (await route.POST(request({...body,image,fallbackItem:hints}))).json();assert.ok(called);assert.equal(value.source,'gemini');assert.equal(value.wardrobeImpact,wardrobeImpact(hints,closet,events).wardrobeImpact);
 const invalid=createLoader({...configured,fetch:modelResponse({item:hints,wardrobeReasoning:'Invented item',referencedGarmentIds:['invented']})})('app/api/shop/route.ts');
 assert.equal((await (await invalid.POST(request({...body,image,fallbackItem:hints}))).json()).source,'fallback');
});
test('quota failures retain session data while preserving persisted data',()=>{
 const original=JSON.stringify(closet);const quota={getItem:()=>original,setItem:()=>{throw Error('quota');}};
 const lib=createLoader({window:{localStorage:quota}})('lib/storage.ts');const edited=structuredClone(closet);edited[0].timesWorn+=1;
 assert.equal(lib.saveCloset(edited).ok,false);assert.equal(lib.getCloset()[0].timesWorn,edited[0].timesWorn);assert.equal(quota.getItem(),original);
});
