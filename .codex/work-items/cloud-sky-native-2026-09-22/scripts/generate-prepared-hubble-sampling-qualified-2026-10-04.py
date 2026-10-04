"""Retain r1; exercise original GPU qualification before withholding identity."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS=TASK/'scripts'
OLD=ROOT/'output/playwright/cloud-sky-prepared-hubble-sampling-1004-r1'
OUT=ROOT/'output/playwright/cloud-sky-prepared-hubble-sampling-1004-r2'
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
for r in json.loads((OLD/'source-bindings-before.json').read_bytes()):assert bind(ROOT/r['path'])==r,r['path']
code=(SCRIPTS/'experience-prepared-hubble-sampling-page-2026-10-04.mts').read_text(encoding='utf-8')
old="if(w.samplingEnabled&&k==='artworkLevelsContribution')return {completed:false,qualification:{fine:'unknown',coarse:'unknown',any:'unknown'},finePhoto:'unknown',coarsePhoto:'unknown'};const result=Reflect.apply(fn,t,values);"
new="const result=Reflect.apply(fn,t,values);if(w.samplingEnabled&&k==='artworkLevelsContribution'){(w.samplingActualQualifications??=[]).push({phase:w.phase,completed:result.completed,qualification:result.qualification,finePhoto:result.finePhoto,coarsePhoto:result.coarsePhoto});return {completed:false,qualification:{fine:'unknown',coarse:'unknown',any:'unknown'},finePhoto:'unknown',coarsePhoto:'unknown'};}"
assert code.count(old)==1;code=code.replace(old,new)
needle="await save('sampling-comparison.json',{status:"
assert code.count(needle)==1
code=code.replace(needle,"const actualQualifications=await page.evaluate(()=>globalThis.__controlled.samplingActualQualifications??[]);assert(actualQualifications.length>0);await save('sampling-actual-qualifications.json',actualQualifications);\n"+needle)
code=code.replace("originalRestorationExact:true,changedRgbChannels,","originalRestorationExact:true,changedRgbChannels,originalGpuQualificationExecuted:true,actualQualifications,")
code=code.replace('ACTUAL_TARO_PREPARED_HUBBLE_SAMPLING_DEVELOPMENT','ACTUAL_TARO_PREPARED_HUBBLE_SAMPLING_WITH_QUALIFICATION_DEVELOPMENT')
target=SCRIPTS/'experience-prepared-hubble-sampling-qualified-2026-10-04.mts'
with target.open('x',encoding='utf-8') as f:f.write(code)
OUT.mkdir(exist_ok=False);copies=[]
for name in ['page-bundle.js','source-bindings-before.json','metafile.json','observed-boundaries.json','executed-build.mts']:
 before=bind(OLD/name);shutil.copyfile(OLD/name,OUT/name);after=bind(OUT/name)
 assert (before['bytes'],before['sha256'])==(after['bytes'],after['sha256']);copies.append({'before':before,'after':after})
with (OUT/'reused-current-build.json').open('x',encoding='utf-8') as f:json.dump({'files':copies,'newBuilds':0,'reason':'Only task qualification observer changed. Original GPU copy/qualification runs before suppressing unsupported publication identity. R1 retained as resource limitation, not overwritten.'},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'runtime':bind(target),'builds':0,'boundFrontInputs':len(json.loads((OLD/'source-bindings-before.json').read_bytes()))}))
