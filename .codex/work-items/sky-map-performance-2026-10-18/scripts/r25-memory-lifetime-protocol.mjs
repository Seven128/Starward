// Finite task receipt. Array slots are not heap bytes; view/backing overlap.
export const R25_MEMORY_SCHEMA = 'starward-r25-memory-lifetime-v1';
export const R25_MEMORY_SITES = ['stellar-vectors','stellar-positions','stellar-directions','stellar-transmissions','gpu-upload-view','gpu-upload-backing'];
const phases=['baseline','active-5','active-15','active-30','paused','retired','hidden','scope-ended','drain-10','drain-30','end'];
const MAX=1e12;
const object=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const count=v=>Number.isSafeInteger(v)&&v>=0&&v<=MAX;
const time=v=>v===null||count(v)&&v<=120000;
function cohort(v,supported){
  if(!supported)return v===null;
  if(!object(v,['witnesses','alive','collected','unknown','aliveQuantity','collectedQuantity','ageMinMs','ageMaxMs','ageUnknown'])||
    !['witnesses','alive','collected','unknown','aliveQuantity','collectedQuantity','ageUnknown'].every(k=>count(v[k]))||
    v.witnesses>32||v.alive+v.collected+v.unknown!==v.witnesses||v.ageUnknown>v.alive||
    !time(v.ageMinMs)||!time(v.ageMaxMs))return false;
  if((v.ageMinMs===null)!==(v.ageMaxMs===null))return false;
  if(v.ageMinMs!==null&&(v.ageMinMs<=0||v.ageMaxMs<v.ageMinMs||v.ageUnknown===v.alive))return false;
  if(v.ageMinMs===null&&v.ageUnknown!==v.alive)return false;
  return true;
}
export function validateR25MemoryLifetime(v){
  try{
    if(Buffer.byteLength(JSON.stringify(v),'utf8')>32768||!object(v,['schemaVersion','variant','runId','binding','capability','semantics','sites','policy','clock','diagnostics','events','checkpoints'])||
      v.schemaVersion!==R25_MEMORY_SCHEMA||v.variant!=='baseline'||typeof v.runId!=='string'||!/^r25-[1-9][0-9]{0,11}-[a-z0-9]{1,10}$/.test(v.runId)||
      !object(v.binding,['generation','sourceHash'])||!count(v.binding.generation)||v.binding.generation<1||
      typeof v.binding.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(v.binding.sourceHash)||!['supported','unsupported'].includes(v.capability)||
      v.semantics!=='sampled-weak-liveness-not-retainers-not-whole-heap-not-leak-verdict')return false;
    if(!Array.isArray(v.sites)||v.sites.length!==6||!v.sites.every((s,i)=>object(s,['site','unit'])&&s.site===R25_MEMORY_SITES[i]&&
      s.unit===(i<4?'array-slots-not-heap-bytes':'typed-byteLength-view-and-backing-overlap')))return false;
    if(!object(v.policy,['first','recent','strideAfterFirst','checkpoints','events'])||
      v.policy.first!==32||v.policy.recent!==32||v.policy.strideAfterFirst!==16||v.policy.checkpoints!==10||v.policy.events!==8)return false;
    if(!object(v.clock,['source','kind','effectiveResolutionMs','reads','invalidReads','backwardReads','outOfRangeReads','invalid','elapsedMs'])||
      v.clock.source!=='Date.now'||v.clock.kind!=='wall-elapsed'||v.clock.effectiveResolutionMs!==null||typeof v.clock.invalid!=='boolean'||
      !['reads','invalidReads','backwardReads','outOfRangeReads'].every(k=>count(v.clock[k]))||!time(v.clock.elapsedMs)||
      v.clock.reads<1||['invalidReads','backwardReads','outOfRangeReads'].some(k=>v.clock[k]>v.clock.reads)||
      v.clock.invalid!==(v.clock.invalidReads>0||v.clock.backwardReads>0||v.clock.outOfRangeReads>0)||
      (v.clock.invalid ? v.clock.elapsedMs!==null : v.clock.elapsedMs===null))return false;
    if(!object(v.diagnostics,['overflow','rejectedTracks','refErrors','refsCreated','checkpointOmitted','eventOmitted'])||
      typeof v.diagnostics.overflow!=='boolean'||!['rejectedTracks','refErrors','refsCreated','checkpointOmitted','eventOmitted'].every(k=>count(v.diagnostics[k])))return false;
    if(!Array.isArray(v.events)||v.events.length>8||!v.events.every(e=>object(e,['event','relativeMs'])&&['play','pause','retire','hide','scope'].includes(e.event)&&time(e.relativeMs)))return false;
    if(!Array.isArray(v.checkpoints)||v.checkpoints.length>10)return false;
    const supported=v.capability==='supported';
    return v.checkpoints.every(p=>object(p,['phase','relativeMs','sites'])&&phases.includes(p.phase)&&time(p.relativeMs)&&Array.isArray(p.sites)&&p.sites.length===6&&p.sites.every((s,i)=>{
      if(!object(s,['siteIndex','allocations','totalQuantity','selected','evictedWitnesses','first','recent'])||s.siteIndex!==i||
        !['allocations','totalQuantity','selected','evictedWitnesses'].every(k=>count(s[k]))||s.selected>s.allocations||
        !cohort(s.first,supported)||!cohort(s.recent,supported))return false;
      if(supported&&s.first.witnesses+s.recent.witnesses+s.evictedWitnesses!==s.selected)return false;
      if(!supported&&(s.allocations!==0||s.totalQuantity!==0||s.selected!==0||s.evictedWitnesses!==0))return false;
      return true;
    }));
  }catch{return false;}
}
