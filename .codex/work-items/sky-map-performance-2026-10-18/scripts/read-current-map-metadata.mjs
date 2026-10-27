// Bounded public GET readback of the two captured map-metadata requests.
// It does not infer historical HTTP results, install overlays or control a phone.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [traceFile,pointerFile,output]=process.argv.slice(2);
if(!traceFile||!pointerFile||!output)throw Error('arguments_required');
const events=JSON.parse(await fs.readFile(traceFile,'utf8'));
const pointer=JSON.parse(await fs.readFile(pointerFile,'utf8'));
const origin=new URL(pointer.apiOrigin).origin;
const records=events.filter(e=>e.name==='APITask'&&e.args?.data?.name==='wx.request').map(e=>e.args.data.args);
const targets=[['/v2/terrain/overlay',['purpose','centerLat','centerLng','viewportBounds']],
  ['/v2/map/night-light',['centerLat','centerLng','zoom','viewportBounds']]];
const results=[];
for(const [pathname,keys] of targets){
  const captured=records.filter(r=>new URL(r.url).pathname===pathname).at(-1);
  if(!captured||captured.method!=='GET')throw Error('captured_public_get_missing');
  const url=new URL(captured.url);
  if(url.origin!==origin||[...url.searchParams.keys()].some(key=>!keys.includes(key))||
    Object.keys(captured.header??{}).some(key=>key.toLowerCase()!=='accept'))throw Error('captured_scope_not_qualified');
  const controller=new AbortController(),timeoutMs=Math.min(30000,Math.max(1000,Number(captured.timeout)||15000));
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  const result={path:pathname,requestSha256:createHash('sha256').update(captured.url).digest('hex'),
    startedAt:new Date().toISOString(),timeoutMs};
  try{
    const response=await fetch(url,{method:'GET',headers:{Accept:'application/json'},signal:controller.signal,redirect:'error'});
    result.status=response.status;
    const reader=response.body.getReader(),chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>2*1024*1024){await reader.cancel();throw Error('metadata_size_limit');}chunks.push(value);}
    const body=Buffer.concat(chunks);
    result.responseBytes=body.length;result.responseSha256=createHash('sha256').update(body).digest('hex');
    result.body=JSON.parse(body.toString('utf8'));
  }catch(error){result.failure=error?.name==='AbortError'?'bounded_read_timeout':
    error?.message==='metadata_size_limit'?'metadata_size_limit':'current_read_failed';}
  finally{clearTimeout(timeout);result.finishedAt=new Date().toISOString();}
  results.push(result);
}
await fs.writeFile(output,JSON.stringify({scope:'CURRENT_PUBLIC_METADATA_ONLY_NOT_HISTORICAL_RESPONSE_OR_NATIVE_PRESENTATION',results},null,2),{flag:'wx'});
console.log(JSON.stringify(results.map(({body,...record})=>({...record,dataState:body?.dataState,
  dataKeys:body?.data&&typeof body.data==='object'?Object.keys(body.data):[],
  errorCode:/^[a-zA-Z0-9_-]{1,100}$/.test(body?.error?.code??'')?body.error.code:null}))));
