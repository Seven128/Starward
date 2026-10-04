/** Bounded escaped task-adapter regression; no API/Scene/Caddy journey replay. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const out=path.join(root,'output/playwright/cloud-sky-live-abort-rpc-1003-r1');fs.mkdirSync(out);
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let observed=0,errors=0;const pending=new Map();
const server=http.createServer((_request,_response)=>{observed++;});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port,browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const make=id=>{const req=http.get({hostname:'127.0.0.1',port,path:'/held'},()=>{});req.on('error',()=>errors++);pending.set(id,req);};
 // Actual old callback returns Node ClientRequest, so Playwright rejects it.
 await page.exposeFunction('oldAbort',id=>pending.get(id)?.destroy(new Error('owned-abort')));
 await page.exposeFunction('currentAbort',id=>{pending.get(id)?.destroy(new Error('owned-abort'));});
 make('old');make('current');
 const deadline=Date.now()+2000;while(observed<2&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(observed,2);
 const old=await page.evaluate(async()=>{try{await globalThis.oldAbort('old');return {failed:false};}catch(error){return {failed:true,message:String(error)};}});
 assert.equal(old.failed,true);assert.match(old.message,/serialize unexpected value/);
 const current=await page.evaluate(async()=>({returnedUndefined:(await globalThis.currentAbort('current'))===undefined}));assert.equal(current.returnedUndefined,true);
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(errors,2);assert([...pending.values()].every(req=>req.destroyed));
 const script=fs.readFileSync(fileURLToPath(import.meta.url));fs.copyFileSync(fileURLToPath(import.meta.url),path.join(out,'executed-script.mjs'));
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'TASK_RPC_ABORT_REGRESSION_PASSED',failingBefore:old,corrected:current,heldRequests:observed,closedRequests:errors,
  scriptSha256:createHash('sha256').update(script).digest('hex'),scope:'Actual Playwright RPC and two isolated held loopback requests. Old object-return rejection reproduced; void callback succeeds and requests close. Not production source change, full Scene rerun, native cancel/physical memory/capacity or independent review.'},null,2)+'\n');
 console.log(JSON.stringify({failingBefore:true,correctedVoid:true,heldRequests:observed,closedRequests:errors}));
}finally{for(const req of pending.values())req.destroy();await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
