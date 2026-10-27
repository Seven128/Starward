// Offline ownership inspection of the largest recorded arrays/strings.
// Never emits runtime string values, keys containing URLs, or evaluates code.
import fs from 'node:fs/promises';
import { loadSnapshot, strongGraph } from './diagnose-target-heap.mjs';
const [input, expectedSha256, output] = process.argv.slice(2);
if (!input || !/^[a-f0-9]{64}$/.test(expectedSha256 ?? '') || !output) throw Error('arguments_invalid');
const s = await loadSnapshot(input);
if (s.sha256 !== expectedSha256) throw Error('snapshot_identity_mismatch');
strongGraph(s);
const type = n => s.types[s.nodes[n*s.stride+s.typeOffset]];
const name = n => s.strings[s.nodes[n*s.stride+s.nameOffset]];
const size = n => s.nodes[n*s.stride+s.sizeOffset];
const edgeType = e => s.edgeTypes[s.edges[e*s.edgeStride+s.edgeTypeOffset]];
const target = e => s.edges[e*s.edgeStride+s.edgeTargetOffset]/s.stride;
const edgeName = e => s.strings[s.edges[e*s.edgeStride+s.edgeNameOffset]];
const safeName = value => typeof value === 'string' && /^[A-Za-z_$][A-Za-z0-9_$ /.-]{0,59}$/.test(value) ? value : 'other';
const nodeLabel = n => type(n).includes('string') ? type(n) : type(n)+':'+safeName(name(n));
const arrays = [], strings = [], retainers = [];
function keep(items, value, key, limit=6) {
  items.push(value); items.sort((a,b)=>b[key]-a[key]); if(items.length>limit)items.pop();
}
for(let n=0;n<s.nodeCount;n++) {
  if(n && ['object','array','closure'].includes(type(n)) && s.reachable[n])
    keep(retainers,{node:n,retainedBytes:s.retained[s.reachable[n]]},'retainedBytes');
  if(type(n).includes('string')) keep(strings,{node:n,selfBytes:size(n)},'selfBytes');
  if(type(n)==='object' && name(n)==='Array') {
    let elementCount=0;
    for(let e=s.starts[n];e<s.starts[n+1];e++) if(edgeType(e)==='element')elementCount++;
    if(elementCount)keep(arrays,{node:n,elementCount},'elementCount');
  }
}
const parent=new Int32Array(s.nodeCount);parent.fill(-1);parent[0]=0;
const via=new Uint32Array(s.nodeCount),queue=new Uint32Array(s.nodeCount);queue[0]=0;
for(let read=0,write=1;read<write;read++) {
  const n=queue[read];
  for(let e=s.starts[n];e<s.starts[n+1];e++) {
    if(edgeType(e)==='weak')continue;
    const child=target(e);if(parent[child]>=0)continue;
    parent[child]=n;via[child]=e;queue[write++]=child;
  }
}
const properties = n => {
  const out=[];
  for(let e=s.starts[n];e<s.starts[n+1] && out.length<30;e++) {
    if(edgeType(e)!=='property')continue;
    const child=target(e);
    out.push({key:safeName(edgeName(e)),target:nodeLabel(child),selfBytes:size(child)});
  }
  return out;
};
const pathTo = n => {
  const out=[];let current=n;
  while(current && parent[current]>=0 && out.length<60) {
    const e=via[current],kind=edgeType(e);
    out.push({node:nodeLabel(current),via:kind+(['element','hidden'].includes(kind)?'':':'+safeName(edgeName(e)))});
    current=parent[current];
  }
  return {reachable:parent[n]>=0,truncated:current!==0,path:out.reverse()};
};
const enrich=({node,...value})=>({ ...value,label:nodeLabel(node),selfBytes:size(node),retainedBytes:s.retained[s.reachable[node]]??null,...pathTo(node),
  properties:properties(node),
  ...(parent[node]>0?{parent:nodeLabel(parent[node]),parentSelfBytes:size(parent[node]),parentProperties:properties(parent[node])}:{}),
  samples:Array.from({length:s.starts[node+1]-s.starts[node]},(_,i)=>s.starts[node]+i)
    .filter(e=>edgeType(e)==='element').slice(0,3).map(e=>({label:nodeLabel(target(e)),properties:properties(target(e))})) });
const result={scope:'HISTORICAL_RECORDED_NONWEAK_GRAPH_NOT_LEAK_OR_CURRENT_RUNTIME_VERDICT',
  snapshotSha256:s.sha256,retainers:retainers.map(enrich),arrays:arrays.map(enrich),strings:strings.map(enrich)};
await fs.writeFile(output,JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({snapshotSha256:s.sha256,arrays:result.arrays.map(({elementCount,label,path})=>({elementCount,label,path})),
  strings:result.strings.map(({selfBytes,path})=>({selfBytes,path}))}));
