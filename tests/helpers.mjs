import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url);
export const closet=JSON.parse(fs.readFileSync('data/closet.json','utf8'));
export const events=JSON.parse(fs.readFileSync('data/events.json','utf8'));
export function createLoader(extras={}) {
 const cache=new Map();
 function load(filename) {
  const absolute=path.resolve(filename);
  if(cache.has(absolute))return cache.get(absolute);
  if(absolute.endsWith('.json'))return JSON.parse(fs.readFileSync(absolute,'utf8'));
  const loadedModule={exports:{}};cache.set(absolute,loadedModule.exports);
  const code=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const context={module:loadedModule,exports:loadedModule.exports,structuredClone,Buffer,Request,Response,FormData,Blob,AbortSignal,URL,crypto:globalThis.crypto,process:{env:{},cwd:()=>process.cwd()},console,fetch:async()=>{throw Error('Network disabled in unit tests');},require:id=>{
   if(id==='server-only')return {};
   if(id.startsWith('@/')){let file=id.slice(2);if(!path.extname(file))file+='.ts';return load(file);}
   return nativeRequire(id);
  },...extras};
  vm.runInNewContext(code,context,{filename:absolute});cache.set(absolute,loadedModule.exports);return loadedModule.exports;
 }
 return load;
}
export const request=(body)=>new Request('http://localhost/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
export const image={mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6XcAAAAASUVORK5CYII='};
