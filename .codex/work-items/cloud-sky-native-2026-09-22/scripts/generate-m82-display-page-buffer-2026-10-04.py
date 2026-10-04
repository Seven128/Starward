"""Use original current page; make controlled native Canvas dimensions affect real GL buffer."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
DEV=ROOT/'output/sdss-m82-display-page-buffer-development-1004-r1'
DEV.mkdir(exist_ok=False)
def bind(p):return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(DEV/'executed-generator.py').write_bytes(Path(__file__).read_bytes())
cp=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r100.json').read_bytes());prior={r['path']:r for r in cp['currentSources']}
template=TASK/'scripts/experience-m82-display-page-auxiliary-retry-2026-10-04.mts';assert bind(template)==prior[template.relative_to(ROOT).as_posix()]
archives=[]
for p in [TASK/'PLAN.md',TASK/'CONTINUE-CLOUD-SKY.md',TASK/'scripts/capture-current-execution-2026-10-03.ps1',ROOT/'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md']:
 row=bind(p);assert row==prior[row['path']];dest=DEV/'before'/p.relative_to(ROOT);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(p.read_bytes());archives.append(row)
(DEV/'before-bindings.json').write_text(json.dumps(archives,indent=2)+'\n',encoding='utf-8')
s=template.read_text(encoding='utf-8');start=s.index('const navBack=async()=>');end=s.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.lifecycle(w.nativePage',start)
s=s[:start]+(TASK/'scripts/m82-display-page-buffer-journey-2026-10-04.txt').read_text(encoding='utf-8')+'\n\n'+s[end:]
marker="const w=globalThis.__controlled,storage=new Map(),port=w.Taro,canvas=document.querySelector('canvas');";assert s.count(marker)==1
s=s.replace(marker,marker+"w.pixelRatio=1;w.drawingBufferAssignments=[];w.fullBufferAuxiliaryUploads=[];")
marker="const node=w.makeCanvasNode();node.getContext=()=>gl;";assert s.count(marker)==1
s=s.replace(marker,"const node=w.makeCanvasNode();for(const dimension of ['width','height'])Object.defineProperty(node,dimension,{get:()=>canvas[dimension],set(value){canvas[dimension]=value;w.drawingBufferAssignments.push({phase:w.phase,dimension,value,width:gl.drawingBufferWidth,height:gl.drawingBufferHeight});}});node.getContext=()=>gl;")
s=s.replace('pixelRatio:1,statusBarHeight:24','pixelRatio:w.pixelRatio,statusBarHeight:24').replace("pixelRatio:1,platform:'devtools'","pixelRatio:w.pixelRatio,platform:'devtools'")
marker="const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw Error('software WebGL unavailable');";assert s.count(marker)==1
s=s.replace(marker,marker+"const trackUpload=gl.texImage2D.bind(gl);gl.texImage2D=(...a)=>{const r=trackUpload(...a);if(a.length===9&&a[8]===null&&a[3]===gl.drawingBufferWidth&&a[4]===gl.drawingBufferHeight)w.fullBufferAuxiliaryUploads.push({phase:w.phase,width:a[3],height:a[4],bytes:a[3]*a[4]*4});return r;};")
marker='row.count++;if(result===true)row.submitted++;';assert s.count(marker)==1
s=s.replace(marker,marker+"if(k==='artworkLevels'&&result?.submitted===true)row.submitted++;if(['artworkLevelsQualification','artworkLevelsContribution','artworkContributionsFailed'].includes(k))row.lastResult=result;")
s=s.replace("await capturePixels('software-cold');","await save('current-cold-scene.json',coldScene);")
s=s.replace('ACTUAL_TARO_M82_AUXILIARY_PUBLIC_RETRY_DEVELOPMENT','ACTUAL_TARO_M82_FIXED_POLICY_BUFFER_DEVELOPMENT')
target=TASK/'scripts/experience-m82-display-page-buffer-2026-10-04.mts'
with target.open('x',encoding='utf-8') as f:f.write(s)
old=ROOT/'output/playwright/cloud-sky-m82-display-page-late-1004-r4';out=ROOT/'output/playwright/cloud-sky-m82-display-page-buffer-1004-r1';out.mkdir(exist_ok=False)
for row in json.loads((old/'source-bindings-before.json').read_bytes()):assert bind(ROOT/row['path'])==row
copies=[]
for name in ['page-bundle.js','source-bindings-before.json','metafile.json','build-result.json','authorised-input-transitions.json','checkpoint-origin.json','delivery-constant-source.json','executed-build.mts']:
 src=old/name;(out/name).write_bytes(src.read_bytes());copies.append({'original':bind(src),'copied':bind(out/name)})
(out/'current-build-reuse-check.json').write_text(json.dumps({'files':copies,'currentFrontendAll508Exact':True,'checkpoint':bind(TASK/'evidence/current-execution-state-2026-10-04-r100.json'),'scope':'Only controlled native node width-height setters/DPR input changed. Production page, original caller policy and every frontend input byte unchanged; no rebuild.'},indent=2)+'\n',encoding='utf-8')
(DEV/'template-bindings.json').write_text(json.dumps({'template':bind(template),'journey':bind(TASK/'scripts/m82-display-page-buffer-journey-2026-10-04.txt'),'generated':bind(target),'scope':'Actual original page native dimensions now affect software GL buffer; controlled DPR1-4-1, no production edits/budget override/auxiliary fault injection'},indent=2)+'\n',encoding='utf-8')
