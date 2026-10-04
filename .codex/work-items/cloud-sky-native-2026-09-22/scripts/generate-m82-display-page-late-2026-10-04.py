"""Bounded pending-native callback and auxiliary failure lane from current page task owner."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-display-page-late-development-1004-r1'
OUT.mkdir(exist_ok=False)
def bind(p):return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(OUT/'executed-generator.py').write_bytes(Path(__file__).read_bytes())
template=TASK/'scripts/experience-m82-display-page-2026-10-04.mts'
cp=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r99.json').read_bytes())
assert bind(template)==next(r for r in cp['currentSources'] if r['path']==template.relative_to(ROOT).as_posix())
archives=[]
for name in ['PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1']:
 p=TASK/name;dest=OUT/'before'/p.relative_to(ROOT);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(p.read_bytes());archives.append(bind(p))
p=ROOT/'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md';dest=OUT/'before'/p.relative_to(ROOT);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(p.read_bytes());archives.append(bind(p))
(OUT/'before-bindings.json').write_text(json.dumps(archives,indent=2)+'\n',encoding='utf-8')
s=template.read_text(encoding='utf-8');start=s.index('// Same original formal Map entry');end=s.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.lifecycle(w.nativePage',start)
s=s[:start]+(TASK/'scripts/m82-display-page-late-journey-2026-10-04.txt').read_text(encoding='utf-8')+'\n\n'+s[end:]
s=s.replace('failOpticalDetail=true','failOpticalDetail=false').replace('ACTUAL_TARO_M82_DISPLAY_PAGE_DEVELOPMENT','ACTUAL_TARO_M82_PENDING_DECODE_AUXILIARY_DEVELOPMENT')
old="const nativeExecutor=Function('return ('+scaffold.replace(/^export const runtimeExecutor = /,'').trim().replace(/;$/,'')+')')();"
new="""const marker="image.setAttribute('src', blob);";assert.equal(scaffold.split(marker).length,2);
const gated=scaffold.replace(marker,`const start=()=>image.setAttribute('src',blob);
 if(w.holdDecodeSha===asset.sha256){w.holdDecodeSha=null;w.heldDecodeStarts??=[];w.heldDecodeStarts.push({id,sha256:asset.sha256,image,start,late:image.onload});}else start();`);
const nativeExecutor=Function('return ('+gated.replace(/^export const runtimeExecutor = /,'').trim().replace(/;$/,'')+')')();"""
assert s.count(old)==1;s=s.replace(old,new)
target=TASK/'scripts/experience-m82-display-page-late-2026-10-04.mts'
with target.open('x',encoding='utf-8') as f:f.write(s)
(OUT/'template-bindings.json').write_text(json.dumps({'runtime':bind(template),'builder':bind(TASK/'scripts/build-m82-display-page-2026-10-04.mts'),'scaffold':bind(ROOT/'output/playwright/cloud-sky-live-mixed-1003-r10/runtime-executor.js.txt'),'journey':bind(TASK/'scripts/m82-display-page-late-journey-2026-10-04.txt'),'generated':bind(target),'scope':'Native decode starts are held once; actual Image/PNG decode resumes after hide, then captured retired callback is delivered. One optional framebuffer failure through real GL; no production behavior rewrite.'},indent=2)+'\n',encoding='utf-8')
