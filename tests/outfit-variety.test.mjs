import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closet, events, createLoader, request } from './helpers.mjs';
const load=createLoader();
const {fallbackOutfit,validOutfit,sameOutfit}=load('lib/outfits.ts');
const event=events.find(e=>e.id==='event_06');

test('fashion outfits rotate across eight looks rather than alternating two favorites',()=>{
 const history=[];
 for(let i=0;i<8;i++){
  const look=fallbackOutfit(closet,event,[],history.at(-1)??[],[],history);
  assert.ok(validOutfit(look.garmentIds,closet));
  assert.ok(!history.some(ids=>sameOutfit(ids,look.garmentIds)));
  history.push(look.garmentIds);
 }
 const bases=new Set(history.map(ids=>ids.filter(id=>['top','bottom','dress'].includes(closet.find(g=>g.id===id).category)).sort().join('|')));
 assert.ok(bases.size>=5,`Only ${bases.size} distinct bases`);
 assert.ok(history.flat().some(id=>closet.find(g=>g.id===id).category==='accessory'));
 assert.ok(history.flat().some(id=>closet.slice(36).some(g=>g.id===id)));
});
test('repeated remixes preserve the reference top while rotating other pieces',()=>{
 const locked=['top_draped_black_01']; const history=[];
 for(let i=0;i<6;i++){
  const result=fallbackOutfit(closet,event,locked,history.at(-1)??[],[],history);
  assert.ok(validOutfit(result.garmentIds,closet,locked));
  assert.ok(!history.some(ids=>sameOutfit(ids,result.garmentIds)));
  history.push(result.garmentIds);
 }
});
test('outfit API falls back when Gemini repeats a recent look, even if it differs from the immediate prior look',async()=>{
 const first=fallbackOutfit(closet,event).garmentIds;
 const second=fallbackOutfit(closet,event,[],first,[],[first]).garmentIds;
 const mocked=createLoader({process:{env:{GEMINI_API_KEY:'test-only'},cwd:()=>process.cwd()},fetch:async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify({garmentIds:first,reasoning:'Repeat'})}]}}]})});
 const response=await mocked('app/api/outfit/route.ts').POST(request({closet,event,interactions:[],previousGarmentIds:second,recentOutfits:[first,second]}));
 const result=await response.json();
 assert.equal(response.status,200); assert.equal(result.source,'fallback');
 assert.ok(!sameOutfit(result.garmentIds,first)); assert.ok(!sameOutfit(result.garmentIds,second));
});

test('category swaps rotate past recently used replacements',()=>{
 const {swapGarment}=load('lib/demo.ts');
 const current=fallbackOutfit(closet,event).garmentIds;
 const chosen=current.find(id=>closet.find(g=>g.id===id).category==='shoes');
 const history=[current];
 let ids=current;
 const seen=new Set([chosen]);
 for(let i=0;i<3;i++){
  const target=ids.find(id=>closet.find(g=>g.id===id).category==='shoes');
  const next=swapGarment(closet,ids,target,[],history);
  const replacement=next.find(id=>closet.find(g=>g.id===id).category==='shoes');
  assert.ok(!seen.has(replacement));seen.add(replacement);
  assert.ok(ids.filter(id=>id!==target).every(id=>next.includes(id)));
  history.push(next);ids=next;
 }
});
