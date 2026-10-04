/** Artifact/source binding closure only; no rendering, PNG decoding or author helper execution. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const evidence=task+'/evidence/';
const out=process.argv[2];
assert.match(out??'',/^output\/selected-full-hook-independent-closure-1002-r\d+$/u);
assert(!fs.existsSync(path.join(ROOT,out)));
fs.mkdirSync(path.join(ROOT,out));
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(ROOT,out,'executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const read=(p:string)=>fs.readFileSync(path.join(ROOT,p));
const bind=(p:string)=>{const b=read(p);return{path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const json=(p:string)=>JSON.parse(read(p).toString());
const inputs=new Map<string,ReturnType<typeof bind>>();
const admit=(p:string,sha?:string,bytes?:number)=>{const b=bind(p);if(sha)assert.equal(b.sha256,sha,p);if(bytes!==undefined)assert.equal(b.bytes,bytes,p);inputs.set(p,b);return b;};
try{
 const previous='output/selected-full-hook-current-independent-1002-r3/';
 admit(previous+'result.json','988164fc5f987b408791d5d48971381983c91d1234567dbbfb7ac883376bd701');
 admit(previous+'binding.json','07b0d3802201752138452cdf999d5f5c85111c06ac2d3d35a379b29721d0c749');
 const originalNote=evidence+'experience-selected-full-hook-repair-2026-10-02.md';
 const historicalNote=evidence+'experience-selected-full-hook-repair-2026-10-02.pre-correction-55cc33f7.md';
 for(const b of json(previous+'binding.json').inputsBefore){
  const actualPath=b.path===originalNote?historicalNote:b.path;
  admit(actualPath,b.sha256,b.bytes);
 }
 assert.equal(admit(historicalNote).sha256,'55cc33f73e103135d08dd550406054233652b2328eba445edc6291e9841d1e2c');
 admit(originalNote,'dfdef6b09ea7eaecfc5b8e3377a8d90de6ca48f4a62503531efb277585e33d21',9212);
 admit(evidence+'experience-selected-entry-dependency-fix-independent-review-2026-10-02.md','65f689fcc3c0563f710f96441fbbcb7113e13f5df04c6e940378072e0dfd363e');
 const r3=json('output/playwright/cloud-sky-selected-full-hook-1002-r3/result.json');
 const r4=json('output/playwright/cloud-sky-selected-full-hook-1002-r4/result.json');
 const selectedCurrent=(row:any)=>row.nativeCurrent.filter((s:any)=>s.offeredId==='selected:M:51:DETAIL'&&s.current).map((s:any)=>s.objectId).sort((a:number,b:number)=>a-b);
 const oldSelectedCurrent=selectedCurrent(r3.rows[1]),currentSelectedCurrent=selectedCurrent(r4.rows[1]);
 assert.deepEqual(oldSelectedCurrent,[0,4]);assert.deepEqual(currentSelectedCurrent,[0]);
 assert.equal(r3.rows[1].ready.selected.decoded.objectId,4);assert.equal(r4.rows[1].ready.selected.decoded.objectId,0);
 for(const r of [r3,r4])assert.equal(r.rows[4].nativeCurrent.filter((s:any)=>s.current).length,0);
 const recorded=[...inputs.values()];assert.deepEqual(recorded.map(b=>bind(b.path)),recorded);
 const result={status:'INDEPENDENT_CURRENT_REPAIR_BINDING_AND_WEAK_CURRENT_CLOSURE_PASS',
  priorIndependentReadback:bind(previous+'result.json'),historicalNote:bind(historicalNote),correctedAuthorNote:bind(originalNote),
  currentPage:bind('apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'),
  oldM51Detail:{pageDecodedObjectId:4,diagnosticWeakCurrentIds:oldSelectedCurrent},
  currentM51Detail:{pageDecodedObjectId:0,diagnosticWeakCurrentIds:currentSelectedCurrent},
  hiddenWeakCurrentBothGenerations:0,priorInputsStrictlyPreservedExceptDeclaredHistoricalNoteRebase:true,
  limits:['This corrects annotation provenance only. Historical author note55cc incorrectly called the old bitmap retired; raw r3 has both0/4 weak-current true because the same lease and Canvas remain live. The page reference changed, and diagnostic strong references persist; this does not measure GC/physical native memory.',
   'All six main pixels/11PNG/full ledgers and actual source AST remain independently closed in the prior immutable readback. This closure revalidates its complete bound files and adds the precise old/current weak-lifetime facts, not a new GPU or quality acceptance.']};
 fs.writeFileSync(path.join(ROOT,out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(ROOT,out,'binding.json'),JSON.stringify({inputsBefore:recorded,inputsAfter:recorded.map(b=>bind(b.path)),unchanged:true},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),inputs:recorded.length}));
}catch(cause){fs.writeFileSync(path.join(ROOT,out,'failed.json'),JSON.stringify({status:'FAILED_BINDING_CLOSURE',message:String(cause),inputs:[...inputs.values()]},null,2)+'\n',{flag:'wx'});throw cause;}
