import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLoader,closet,request} from './helpers.mjs';
const garment=closet.find(g=>g.id==='top_yellow_01');
const idea={title:'Add a tie belt',description:'Create a removable waist tie.',difficulty:'Easy',timeMinutes:30,materials:['matching ribbon'],steps:['Measure the waist loosely.','Cut the ribbon to the desired length.','Tie the ribbon around the garment waist.']};
const env={OPENAI_API_KEY:'test-only'};
test('revamp preview uses the original garment and selected DIY steps, without changing wardrobe state',async()=>{
 const before=JSON.stringify(garment);
 const load=createLoader({process:{env,cwd:()=>process.cwd()},fetch:async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/images/edits');
  assert.equal(options.body.get('size'),'1024x1024');assert.equal(options.body.get('n'),'1');assert.equal(options.body.getAll('image[]').length,1);
  const prompt=options.body.get('prompt');assert.ok(prompt.includes(idea.title));assert.ok(prompt.includes(idea.steps[2]));assert.ok(prompt.includes(garment.name));assert.ok(prompt.includes('Apply only changes described'));
  return Response.json({data:[{b64_json:Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1]).toString('base64')}]});
 }});
 const response=await load('app/api/revamp-preview/route.ts').POST(request({garment,idea}));const result=await response.json();
 assert.equal(response.status,200);assert.equal(result.source,'openai');assert.equal(result.garmentId,garment.id);assert.equal(result.ideaTitle,idea.title);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(JSON.stringify(garment),before);
});
test('revamp preview handles invalid plans, missing images and missing keys without fabricated output',async()=>{
 const noKey=createLoader()('app/api/revamp-preview/route.ts');
 assert.equal((await noKey.POST(request({garment,idea}))).status,503);
 const configured=createLoader({process:{env,cwd:()=>process.cwd()}})('app/api/revamp-preview/route.ts');
 assert.equal((await configured.POST(request({garment,idea:{...idea,steps:[]}}))).status,400);
 const response=await configured.POST(request({garment:{...garment,image:'/closet/missing-image.png'},idea}));
 assert.equal(response.status,422);assert.equal((await response.json()).image,undefined);
});
