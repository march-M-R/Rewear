import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoader,closet,events,request,image } from './helpers.mjs';
const valid=createLoader()('lib/outfits.ts').fallbackOutfit(closet,events[0]);
const responseBody=value=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const env={OPENAI_API_KEY:'test-key-not-a-secret'};
const base={closet,event:events[0],garmentIds:valid.garmentIds,photo:image};

test('OpenAI styles events with strict JSON and retains ID validation',async()=>{
 let calls=0;
 const load=createLoader({process:{env,cwd:()=>process.cwd()},fetch:async(url,options)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer test-key-not-a-secret');
  const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.text.format.schema.additionalProperties,false);assert.ok(body.input[0].content[0].text.includes(events[0].dressCode));
  return Response.json(responseBody(valid));
 }});
 const result=await (await load('app/api/outfit/route.ts').POST(request({closet,event:events[0]}))).json();
 assert.equal(calls,1);assert.equal(result.source,'openai');assert.deepEqual(result.garmentIds,Array.from(valid.garmentIds));assert.ok(!JSON.stringify(result).includes(env.OPENAI_API_KEY));
 const bad=createLoader({process:{env,cwd:()=>process.cwd()},fetch:async()=>Response.json(responseBody({garmentIds:['invented'],reasoning:'invalid'}))});
 const rejected=await (await bad('app/api/outfit/route.ts').POST(request({closet,event:events[0]}))).json();assert.equal(rejected.source,'fallback');
});

test('try-on sends the personal photo first, real garment references, and exact event outfit',async()=>{
 let called=false;
 const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1]).toString('base64');
 const load=createLoader({process:{env,cwd:()=>process.cwd()},fetch:async(url,options)=>{
  called=true;assert.equal(url,'https://api.openai.com/v1/images/edits');assert.equal(options.headers.Authorization,'Bearer test-key-not-a-secret');
  const form=options.body;assert.equal(form.get('n'),'1');assert.equal(form.get('output_format'),'jpeg');
  const images=form.getAll('image[]');assert.ok(images.length>1);assert.equal(images[0].name,'person.png');assert.equal(Buffer.from(await images[0].arrayBuffer()).toString('base64'),image.data);
  const prompt=form.get('prompt');for(const id of valid.garmentIds)assert.ok(prompt.includes(id));assert.ok(prompt.includes(events[0].date));assert.ok(prompt.includes('do not slim'));
  return Response.json({data:[{b64_json:jpeg}]});
 }});
 const response=await load('app/api/try-on/route.ts').POST(request(base));const result=await response.json();assert.equal(response.status,200);assert.ok(called);assert.equal(result.source,'openai');assert.equal(result.eventId,events[0].id);assert.ok(result.image.startsWith('data:image/jpeg;base64,'));assert.equal(response.headers.get('cache-control'),'no-store');
});

test('try-on never invents a fallback picture and rejects invalid photos/outfits before provider calls',async()=>{
 let calls=0;
 const noKey=createLoader({fetch:async()=>{calls++;throw Error('must not call');}})('app/api/try-on/route.ts');
 assert.equal((await noKey.POST(request(base))).status,503);
 assert.equal((await noKey.POST(request({...base,photo:{...image,mimeType:'image/jpeg'}}))).status,400);
 assert.equal((await noKey.POST(request({...base,garmentIds:['fake']}))).status,400);
 assert.equal(calls,0);
 const limited=createLoader({process:{env,cwd:()=>process.cwd()},fetch:async()=>Response.json({error:{message:'sensitive upstream'}},{status:429})})('app/api/try-on/route.ts');
 const response=await limited.POST(request(base));const body=await response.json();assert.equal(response.status,502);assert.match(body.error,/quota/);assert.equal(body.image,undefined);assert.ok(!JSON.stringify(body).includes('sensitive upstream'));
});
