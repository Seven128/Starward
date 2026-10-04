"""Record complete development output and the observed unresolved edge."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/shared-adaptive-display-1003-r1'
r=json.loads((OUT/'result.json').read_bytes());b=json.loads((OUT/'readback/result.json').read_bytes())
assert r['actualFourLocalBatchOutputsExact'] and r['inputsUnchanged'] and b['levels']['DETAIL']['changedRgbPixels']==0
def bind(path):
    data=path.read_bytes();return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
assessment={'kind':'ROOT_VISUAL_SELF_REVIEW_NOT_INDEPENDENT_ACCEPTANCE',
 'images':[bind(OUT/'readback/actual-full-lod-comparison.png'),bind(OUT/'readback/actual-boundary-and-structure-pairs.png')],
 'method':'Both saved actual PNG contacts viewed with functions.view_image original detail in this turn.',
 'observations':['Peripheral grain quieter in overview; original/fixed/adaptive levels actually viewed.',
  'Arm/diffuse/flagged crop colours and strong structures mostly retained; warm field and green halos remain unresolved, colour alone does not diagnose artifact.',
  'Qualification-edge crop at [24,0,152,128] visibly retains grain in outer eight-pixel fallback against quieter interior. Full edge/structure quality not passed.',
  'DETAIL RGB unchanged, so this mechanism does not improve central close-view grain or validate its quality.'],
 'qualityAcceptance':'NOT_PASSED','independentReview':'MISSING','ordinaryAdopted':False}
with (OUT/'readback/visual-self-review.json').open('x',encoding='utf-8') as f:json.dump(assessment,f,indent=2);f.write('\n')
evidence='experience-shared-adaptive-display-2026-10-03.md'
text=f'''# 完整共同孔径候选、真实LOD及资源

沿唯一PLAN B，已把[批量算术资格](experience-sdss-adaptive-batch-display-2026-10-03.md)接到共享 `sdss_adaptive_display.py` 的完整母图消费者。固定过滤和自适应处理共用 `sdss_noise_display._project_display_region`，不维护第二个源准入/coadd规则；旧固定过滤的实际source/partial/恢复检查保持。新版显式候选没有进入普通registry/正式出版，独审MISSING。

## 责任与验证

真实来源/camera/SKY/fpM/几何权重由既有owner准入，统一核已缓存projected值与原coadd。分块使用真实父图八像素halo，跨块不用镜像/复制边缘；外八像素保原。原science/availability不修改，所有输出仍是有符号nMgy/native-pixel的显示估计，不是新测光。强单带保护整个颜色、共同支持、未知/flags保原、取消无半成品、分块资源退休保持。标量政策/尺度/冻结recipe不变。

新 `AdaptiveDisplayCandidate` 保存 qualified/radius/reached/protected；资格只覆盖处理内区，外halo不借此声明noise未知。报告明确原值保持、改变、未到共同门槛及遗漏误差。独立输出路径绑定source/availability/估计及诊断hash、对象/中心/朝向/recipe/政策；同几何改objectRef拒绝，篡改诊断/source拒绝，exclusive serializer不覆盖旧路径。数值LOD复用现有显示估计均值责任，共同原coverage计alpha，不将强度/噪声资格当缺测。

新实际投影消费者检查覆盖single/mosaic、chunk5/13/32、batch1/7/64、真实halo、partial非有限、零贡献未知中性/正贡献模型缺失保原、取消/coadd改变/PS_ID不一致、原有效黑/partial alpha及保存绑定。首次诊断mutation把半径赋为原本已有值，检查未检出变化；这是假mutation而非生产逃逸，已改为明确不同的99并实际检出。新master4项、受影响display14项、aperture9项通过，不拿检查数认证图质。

## 当前实际完整输出

[消费脚本](../scripts/experience-shared-adaptive-display-2026-10-03.py)复用原缓存完整母图准备路径，实际六field/18frame、fpM/CAS和2048²原coadd；冻结recipe stretch0.6394959985261036/Q8、i/r/g。科学请求0、旧filter0、fit0；没有重下载/重建旧mosaic或重跑旧矩阵。四个49²局部批量结果的内33²估计/半径/门槛/保护与完整输出逐值一致；当前source/原科学/权重/旧候选/旧出版/默认/六保护文件前后pin保持。

[结果](../../../../output/shared-adaptive-display-1003-r1/result.json)，{bind(OUT/'result.json')['bytes']:,}B，SHA256 `{bind(OUT/'result.json')['sha256']}`；candidate SHA256 `{r['candidate']['sha256']}`。完整science有效4,194,304，处理内区资格4,047,878，强结构保护1,814,694，三带条件比值到达1,100,877，显示估计改变2,194,897、RGB改变2,130,715。门槛到达不是置信认证，未达仍不作科学缺测。DETAIL RGB改变0，不能据外围改善宣称完整细节质量。

实际kernel wall {r['processingSeconds']:.2f}s、process CPU {r['processingCPUSeconds']:.2f}s；含缓存源准备/序列化/检查总wall {r['wholeElapsedSeconds']:.2f}s、CPU {r['wholeCPUSeconds']:.2f}s。当前Python峰值working set {r['finalMemory']['peakWorkingSetBytes']:,}B，包括retained FITS、mmap/master、输出和库临时资源；最多retained stencil153,354,240B，64个32行chunk。局部4.05倍不外推整链；新算法比旧固定算法更重，两个策略不同，不宣称整图加速。这不是目标手机、服务峰值或4GB/16GB生产容量验收，离线源处理不能按用户实时执行。

新候选11文件logical {b['candidateDisk']['logicalBytes']:,}B，Windows FileStandardInfo按11 unique file identities的AllocationSize合计 {b['candidateDisk']['reportedAllocationBytesByUniqueFileIdentity']:,}B，前后metadata一致。仅新数组/诊断/三PNG/JSON，不重扫旧库存；不含FS metadata/共享内部、全链输入/rollback/备份，不能作Linux180GB余量、删旧版授权或生产保留闭合。

## 保存读回与实际观感

[读回脚本](../scripts/readback-shared-adaptive-display-2026-10-03.py)只读保存输出，直接reshape/count/求和原signed显示估计再冻结RGB，三个512² PNG逐像素一致，原coverage alpha逐像素一致。原值回退、保护/半径/资格/未达语义和外halo保持。无filter/fit/下载。[读回结果](../../../../output/shared-adaptive-display-1003-r1/readback/result.json)，{bind(OUT/'readback/result.json')['bytes']:,}B，SHA256 `{bind(OUT/'readback/result.json')['sha256']}`。

已以original detail查看[原/固定/共同孔径三级](../../../../output/shared-adaptive-display-1003-r1/readback/actual-full-lod-comparison.png)和[结构/field边界/资格边缘](../../../../output/shared-adaptive-display-1003-r1/readback/actual-boundary-and-structure-pairs.png)。外围颗粒底减轻；旋臂暖底、绿晕和标记区域仍在，颜色本身不判伪影。资格边缘[24,0,152,128]可见外八像素保原颗粒与内部平滑的过渡，完整质量继续未通过。邻行梯度仅描述，不认证接缝/配准；实际来源边界与弱结构/PSF/现场天空组合还未完整验。

[视觉自审记录](../../../../output/shared-adaptive-display-1003-r1/readback/visual-self-review.json)只属root自审。独审MISSING、普通Prepared/science registry仍空；HST M51矩形FAILED、M82输入不足、WXML FAILED_DEVTOOLS、手机/新版月面/Android-iOS和全产品混合容量均不升级。

## 唯一下一依赖

先针对已看到的外八像素颗粒过渡核真实边缘支持：复用缓存frame/geometry/原权重与noise责任，以有界边缘小路径核可依法支持的真实halo或明确窗口内支持，保内部未知/flags拒绝和重复native covariance，不镜像/复制/补零作测量、不盲改alpha。证据成立后才决定必要政策变化和一次完整输出；不重跑无变化861秒母图或已闭合局部/15孔径/旧矩阵。之后继续完整背景/弱结构/配准/加工来源和必要独审，再接正式发布采用链。原生page/来源Back和端云成本义务保留。
'''
(TASK/'evidence'/evidence).write_text(text,encoding='utf-8',newline='\n')
def edit(path,fn):
    old=path.read_text(encoding='utf-8');new=fn(old);assert old!=new;path.write_text(new,encoding='utf-8',newline='\n')
paragraph=('新增[完整共同孔径母图/实际LOD](evidence/'+evidence+')：single/mosaic/partial共用现有源准入/coadd责任，'
 '真实8px halo分块、取消与原值保留、诊断/来源/对象绑定保存已开发。2048²实际候选/三级PNG读回，'
 '四处局部结果精确保持；完整kernel861.55秒/CPU858.56秒，峰值working set1,118,216,192B，'
 '新候选68,590,158B逻辑/68,628,480B Windows allocation，只测新11文件。外围改善，DETAIL RGB未改变；'
 '暖底/绿晕仍在，外8px颗粒向内部平滑的边缘过渡已实际看到，完整质量未过/独审MISSING/默认未采用。\n\n')
old=('下一直接项仍是完整候选质量：当前批量资格已闭合，接原coadd完整母图的有界真实halo/source准入消费者和数值LOD，'
 '测整批CPU/RSS/磁盘、检查真实各级背景/弱结构/接缝，不走独立noise捷径；')
new=('下一直接项仍是完整候选质量：完整候选已开发读回，但真实外8px保原颗粒与平滑内区过渡未解决，'
 '先以缓存真实来源/几何/权重/noise在边缘小路径核支持与恢复，不用镜像/复制/补零或盲改alpha；'
 '有实证的政策变化才再完整加工，不重跑无变化861秒母图；')
edit(TASK/'PLAN.md',lambda s:s.replace(old,paragraph+new,1))
edit(TASK/'CONTINUE-CLOUD-SKY.md',lambda s:s.replace('## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作',1).replace('current-execution-state-2026-10-03-r29.json','current-execution-state-2026-10-03-r30.json'))
for path in ('data-pipelines/deep-sky/README.md','project_context/architecture/runtime-and-domain.md'):
    edit(ROOT/path,lambda s:s.replace('Full-master/LOD quality and total resource measurements remain next; local timing is not full-chain capacity.',
      'The complete original-coadd candidate now shares source/flags/coadd projection admission with the fixed-display owner, uses real eight-pixel chunk halos, and binds diagnostics/object/source in exclusive saved output. Actual full numeric LOD readback passes; whole kernel861.55s and Windows Python peak1,118,216,192B are offline measurements only. Peripheral grain improves but the original outer halo shows a grain transition, while central DETAIL is unchanged; complete quality/adoption and independent review remain open. Qualify actual edge support before another full run. See [whole candidate evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+'). Local timing is not full-chain capacity.',1))
edit(ROOT/'project_context/external-capabilities.md',lambda s:s.replace('完整母图/LOD和整批资源仍缺。',
 '当前完整母图/数值LOD与新候选资源已取得有界开发读回；外8px保原颗粒过渡实际可见，完整图质/采用未过。共享源准入与coadd核查只有一个owner，先核真实边缘支持，不做合成补边/重复扣sky。见[完整输出](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').',1))
def capture(s):
    s=s.replace('$sources = @(\n','$sources = @(\n'+"  'data-pipelines/deep-sky/test_sdss_adaptive_master.py',\n"+''.join('  "$taskRoot/scripts/'+name+'",\n' for name in (
      'build-adaptive-master-consumer-2026-10-03.py','experience-shared-adaptive-display-2026-10-03.py','readback-shared-adaptive-display-2026-10-03.py','record-adaptive-master-continuity-2026-10-03.py')),1)
    s=s.replace('$results = @(\n','$results = @(\n'+'  "$taskRoot/evidence/'+evidence+'",\n'+''.join("  'output/shared-adaptive-display-1003-r1/"+name+"',\n" for name in (
      'result.json','candidate/candidate.json','inputs-before.json','inputs-after.json','progress.ndjson','sdss_adaptive_display.py','sdss_noise_display.py','sdss_noise_aperture.py',
      'readback/result.json','readback/visual-self-review.json','readback/actual-full-lod-comparison.png','readback/actual-boundary-and-structure-pairs.png')),1)
    lines=s.splitlines()
    observed=('Complete adaptive original-coadd candidate now uses one shared projection/flags/coadd admission with fixed display. '
      'Real8px chunk halo, single/mosaic/partial/source fallback/cancel and exclusive object/source/diagnostic binding covered. '
      'Master4/display14/aperture9 affected checks pass. Initial diagnostic test used unchanged radius, ineffective mutation repaired '
      'to99 and actual guard rejects. Full2048-square/six fields18cached frames processed once: kernel861.55s CPU858.56s, '
      'whole cached preparation/serialization/check874.995s, Windows Python peak1118216192B. '
      'Candidate68590158logicalB/68628480API allocationB across11 unique identities, new candidate only. '
      'Four saved local batch outputs exact, source/science/weights/recipe/old/default/protected pins unchanged. '
      'Saved three numeric mean then frozen RGB PNGs and original alpha exact, no filter rerun. '
      'Actual levels and boundary contacts viewed: peripheral grain quieter, DETAIL RGB unchanged, warm/green/flags remain; '
      'outer8px fallback grain transition observed, complete quality not passed. Independent review MISSING, default unadopted. '
      'No downloads/build/watch/BFF restart or release. Context/links/scoped whitespace checked by invoking turn.')
    next_value=('PLAN B: qualify the observed outer8px fallback grain transition with a bounded actual-edge support consumer '
      'using cached frame geometry/weights/native noise. Real halo or explicitly window-bounded support must preserve internal '
      'unknown/flags rejection, native covariance and common bands. No mirrored/copied/zero synthetic measurements or blind alpha. '
      'Only evidenced policy changes justify another complete output; do not repeat unchanged861s master or old local/15aperture/'
      'SAT/cross-run/recovery/filter matrices. Complete background/weak-structure/registration/source-processing review before '
      'formal adoption. Native/page/source Back/independent review and production mixed capacity stay open.')
    for i,line in enumerate(lines):
        if line.strip().startswith("toolObserved='"):lines[i]="    toolObserved='"+observed+"'"
        if line.strip().startswith("next='"):lines[i]="    next='"+next_value+"'"
    return '\n'.join(lines)+'\n'
edit(TASK/'scripts/capture-current-execution-2026-10-03.ps1',capture)
print(json.dumps({'evidence':bind(TASK/'evidence'/evidence),'onePlan':True,'ordinaryAdopted':False,'qualityAcceptance':'NOT_PASSED'}))
