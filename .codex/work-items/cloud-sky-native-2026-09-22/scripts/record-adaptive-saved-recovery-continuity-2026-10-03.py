"""Current saved recovery continuity; historical execution evidence stays intact."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/shared-adaptive-flag-recovery-1003-r2';FAIL=ROOT/'output/shared-adaptive-flag-recovery-1003-r1'
def bind(p):
    data=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
r=json.loads((OUT/'result.json').read_bytes());b=json.loads((OUT/'readback/result.json').read_bytes())
assert r['alternativePixels']==b['alternativePixels']==13323 and b['nativeRejectedStillParent']==53
assert b['outsideAdmittedLatestParentExact'] and b['oldQualificationCanonicalInputsExact']
visual={'kind':'ROOT_ACTUAL_VISUAL_SELF_REVIEW_NOT_INDEPENDENT_ACCEPTANCE',
 'images':[bind(OUT/'readback/actual-full-lod-pairs.png'),bind(OUT/'readback/actual-supply-dense-pairs.png')],
 'method':'functions.view_image original detail, saved actual parent/current LOD and source/parent/alternative supply-dense crop.',
 'observations':['Actual overview/medium/detail differences are limited to qualified supply-derived output.',
  'Most central warm field/green features remain, no complete background or colour quality pass.',
  'Supply-dense patch retains measurement grain; different epoch/PSF and incomplete weak-structure obligations stay open.'],
 'qualityAcceptance':'NOT_PASSED','independentReview':'MISSING','ordinaryAdopted':False}
with (OUT/'readback/visual-self-review.json').open('x',encoding='utf-8') as f:json.dump(visual,f,indent=2);f.write('\n')
name='experience-adaptive-saved-flag-recovery-2026-10-03.md'
text=f'''# 最新共同孔径候选复用有效扫描替代

沿[唯一PLAN](../PLAN.md)和[实际halo父候选](experience-real-halo-perimeter-refinement-2026-10-03.md)，本轮只将已qualified、已保存other-RUN替代接到最新父显示结果，未重复原跨run/13k恢复矩阵、861秒整幅过滤、源下载或拟合。普通registry/default/发布未采用；整体图质NOT_PASSED，独审MISSING。

## 共享恢复责任

`sdss_display_recovery.rebase_saved_other_scan_display`复用旧 `OtherScanDisplay`及保存执行snapshot，调用现有adaptive与recovery资格守卫而不重绘旧PNG；核外部pin、原源科学/availability/recipe、目标、供应数组和原执行report，再按规范JSON核当前source snapshot的实际frame/native/model/CALIB-SKY/fpM/epoch/projected/共同几何权重与原保存值精确。源码变化独立记录，不用当前code替换原执行证明。新入口没有源投影或filter。

只用旧已admitted supply且当前qualified=false的中心替换，保三带共同真实零/负/正值、当前已qualified/强结构及全部不相关结果。旧single/mosaic恢复入口仍保，数值LOD/守卫共用；取消返回无半成品、不变父数组。显式新版本`sdss-adaptive-other-scan-flag-display-recovery-candidate-v2`绑定当前baseline估计/四诊断、旧供应report和执行canonical pin、当前源输入hash/实现环境，区分旧供应扫描贡献/53拒绝和当前应用统计；不把旧processability、旧stencil峰值当新父或本次成本。

相同来源snapshot只核其数据责任，旧filter政策/旧code不伪装成当前adaptive算法；具体rights/信用/加工说明、完整出版packet和epoch/PSF/弱结构仍未认证。caller外部pin须来自已核执行证据，而非凭新生成pin授权任意供应。

## 实际失败与修复

首次完整[r1](../../../../output/shared-adaptive-flag-recovery-1003-r1/failed.json)在候选写入前因`source_inputs_changed`退出；当前内存相机identity元组与原保存JSON列表直接比较造成误拒绝。保[原执行代码](../../../../output/shared-adaptive-flag-recovery-1003-r1/executed-script.py)、源码snapshot和[解释](../../../../output/shared-adaptive-flag-recovery-1003-r1/failure-explanation.json)，不改判成功/不覆盖旧输出。改用现有canonical JSON责任，fixture实际保存/读回JSON后验证正常准入；真实日期、flags、原生模型或归一化但变化的几何权重仍拒旧供应。bounded guard-removal mutation复现日期变化仍应用过期供应，当前守卫拒绝。

受影响六套35项通过（saved recovery5、旧recovery8、provenance6、real halo5、adaptive master4、science pyramid7）；初次新测试误用`field_weights`、随后破归一化的异常预期不对，均修fixture，未改生产约束。开发检查不是独审或完整画质/设备验收。

## 完整实际消费与保存读回

[r2实际消费](../scripts/experience-adaptive-saved-recovery-r2-2026-10-03.py)复用18已缓存frames/fpM/CAS、2048²原science/共同weights及冻结recipe；外部pin核旧candidate/processing-inputs、当前real-halo候选和原18 actualPS_ID/recipe守卫收口。原source/native/epoch/weights精确后，13,323供应全部仍位于当前未qualified区域；无新投影、filter或请求。全部供应值与旧admitted数组精确，其余4,180,981目标逐带与最新父结果精确，53 native/SKY缺口继续保父，原science与六保护pin保持。旧5.6281%多扫描覆盖和53原资格分析不重跑，也不外推完整图。

[r2结果](../../../../output/shared-adaptive-flag-recovery-1003-r2/result.json)：{bind(OUT/'result.json')['bytes']:,}B，SHA256 `{bind(OUT/'result.json')['sha256']}`。candidate SHA256 `{r['candidate']['sha256']}`。恢复wall {r['processingSeconds']:.3f}s/CPU {r['processingCPUSeconds']:.3f}s；含缓存准备/资格/保存/校验wall {r['wholeElapsedSeconds']:.3f}s/CPU {r['wholeCPUSeconds']:.3f}s。Windows Python峰值working set {r['finalMemory']['peakWorkingSetBytes']:,}B含源、mmap页、父/旧供应/新数组与库；仅本机离线，不是客户端/服务或生产容量。不是重新推算全链/退休资源。

[独立数值路径读回](../scripts/readback-adaptive-saved-recovery-2026-10-03.py)仅消费保存数组/JSON，未导入生产filter/recovery helper或重新投影：canonical source/旧执行/当前父四诊断谱系精确，signed均值→冻结Astropy RGB三级PNG逐像素及原alpha精确。OVERVIEW/MEDIUM/DETAIL对当前父RGB改变1506/2061/629。[结果](../../../../output/shared-adaptive-flag-recovery-1003-r2/readback/result.json)：{bind(OUT/'readback/result.json')['bytes']:,}B，SHA256 `{bind(OUT/'readback/result.json')['sha256']}`。新候选8文件logical {b['candidateLogicalBytes']:,}B，未新增物理库存扫描；比父少诊断文件不证明链磁盘节省。当前谱系仍引用父诊断、旧供应与源，不能据此删除旧版本或升级Linux180GB容量结论。

已查看[完整三级父/新对照](../../../../output/shared-adaptive-flag-recovery-1003-r2/readback/actual-full-lod-pairs.png)及[供应密集实际块](../../../../output/shared-adaptive-flag-recovery-1003-r2/readback/actual-supply-dense-pairs.png)，后者由固定128块中供应数量最多者决定，[512,768,640,896]内839已admitted，源/父/真实替代并列。实际多数中心暖底/绿色结构未改，替代也保观测颗粒，不宣称其他波段/曝光/PSF与时变完全等效、完整背景/弱结构或去绿通过。[root自审](../../../../output/shared-adaptive-flag-recovery-1003-r2/readback/visual-self-review.json)非独审。

## 当前下一依赖

共同孔径→真实外侧支持→有供应known-flags恢复现已在最新完整保存候选接通。下一项按PLAN核当前仍未解决的背景/弱结构/绿色晕圈及完整配准的实际来源支持，先复用已有源/PSF/处理资料找材料缺口和可用成熟责任，不能用颜色或恒星目录替代扩展源逐像素PSF/DCR/被扣模型。当前谱系进入完整加工来源packet、质量/信用/权利/加工说明和必要独审可审查后，才接正式批量出版。无需重做当前已闭数值/孔径/跨run/边缘矩阵，不拟无依据参数循环/全图去绿/新设施。

HST M51矩形FAILED、M82完整输入不足、普通registry空、DevTools WXML/Canvas FAILED_DEVTOOLS、手机/新版月面/Android-iOS、实际page/SourceBack及生产200DAU混合容量继续开放。原工作区/分支/HEAD、服务watch和六保护保持；没有提交/推送/云部署/发布。
'''
with (TASK/'evidence'/name).open('x',encoding='utf-8') as f:f.write(text)
def edit(p,old,new):
    s=p.read_text(encoding='utf-8');assert old in s,(str(p),old[:70]);p.write_text(s.replace(old,new,1),encoding='utf-8',newline='\n')
paragraph=('新增[最新父/既有有效供应恢复](evidence/'+name+')：共享显式v2核保存执行与当前source/native/model/flags/epoch/共同权重精确，'
 '13323真实替代应用于当前未qualified区，其余4180981目标及53 native资格缺口保持最新父，原science/alpha/recipe与四诊断谱系绑定。'
 '首次JSON元组/列表误拒绝已复现修成canonical比较，失败r1保持；日期/flags/model/权重变仍拒，35项受影响检查通过。'
 '恢复1.511秒/全链本机15.073秒、峰值working set1315782656B，新8文件56006499逻辑B；无投影/过滤重跑/下载。'
 '三级保存均值→RGB/原alpha精确、实际对照已查看，完整背景/弱结构/配准/来源出版/独审仍缺，普通未采用。\n\n')
old=('下一直接项仍是完整候选质量：真实halo已修当前强制外8px颗粒带且保持完整内区，'
 '下一项核最新adaptive-real-halo baseline与既有qualified other-RUN flag alternative的源/science/recipe/epoch及保存supply pin一致，'
 '再接共享恢复责任、取消/不相关值保持和当前来源谱系；复用已有13k supply，不重跑旧跨run/恢复矩阵或861秒母图；')
new=('下一直接项仍是完整候选质量：共同孔径/真实halo/既有qualified other-RUN供应已在最新完整候选接通，'
 '下一项核仍有问题的背景/弱结构/绿色晕圈和完整配准的实际source/PSF/处理支持及材料缺口，'
 '复用已获取源/研究和成熟责任，有依据才加工；当前谱系纳入完整加工来源packet。'
 '不重复已闭13323供应重接、九边/完整边缘或861秒母图；')
edit(TASK/'PLAN.md',old,paragraph+new)
edit(TASK/'CONTINUE-CLOUD-SKY.md','## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作')
edit(TASK/'CONTINUE-CLOUD-SKY.md','current-execution-state-2026-10-03-r31.json','current-execution-state-2026-10-03-r32.json')
# Both link label and destination refer to the current checkpoint.
p=TASK/'CONTINUE-CLOUD-SKY.md';s=p.read_text(encoding='utf-8');p.write_text(s.replace('current-execution-state-2026-10-03-r31.json','current-execution-state-2026-10-03-r32.json'),encoding='utf-8',newline='\n')
for relative in ('data-pipelines/deep-sky/README.md','project_context/architecture/runtime-and-domain.md'):
    edit(ROOT/relative,'A subsequent two-guard closeout separately binds current code,18 actual identities and exact unchanged saved products without rerunning recovery/filtering.',
      'A subsequent two-guard closeout separately binds current code,18 actual identities and exact unchanged saved products without rerunning recovery/filtering. The recovery owner now reuses that externally pinned, saved supply on the current adaptive-real-halo parent: actual native/model/epoch/flags/projected/geometry inputs must match canonically, only currently unqualified centers can change, and all other latest parent values remain exact. Persisted tuple/list false rejection was reproduced and repaired through the existing canonical JSON responsibility. Explicit rebase v2 keeps baseline diagnostic and original supply execution lineage distinct; the old producer remains readable. Actual13323 alternatives,53 retained native qualification gaps and numeric three-LOD/alpha readback hold without projection/filter reruns. Saved supply counts and original execution implementation remain historical facts. Full quality/source publication/independent review and ordinary adoption are still open. See [current parent recovery](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+').')
edit(ROOT/'project_context/external-capabilities.md','随后两guard修核分开保存当前code及原18身份/三级保持，不假称原执行用了后改代码。',
 '随后两guard修核分开保存当前code及原18身份/三级保持，不假称原执行用了后改代码。最新adaptive-real-halo父已复用原13323合格供应，当前source/model/epoch/flags/权重规范JSON精确方准入；53资格缺口及不相关当前结果保持，原alpha/recipe/三级推导精确。旧曝光/PSF/完整弱结构/来源出版不足不升级，见[当前谱系恢复](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+').')
p=TASK/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8')
s=s.replace('$sources = @(\n','$sources = @(\n'+''.join('  "'+q+'",\n' for q in (
 'data-pipelines/deep-sky/test_sdss_saved_recovery.py',
 '$taskRoot/scripts/build-adaptive-saved-recovery-consumer-2026-10-03.py',
 '$taskRoot/scripts/experience-adaptive-saved-recovery-2026-10-03.py',
 '$taskRoot/scripts/experience-adaptive-saved-recovery-r2-2026-10-03.py',
 '$taskRoot/scripts/readback-adaptive-saved-recovery-2026-10-03.py',
 '$taskRoot/scripts/record-adaptive-saved-recovery-continuity-2026-10-03.py')),1)
s=s.replace('$results = @(\n','$results = @(\n'+'  "$taskRoot/evidence/'+name+'",\n'+''.join("  'output/"+q+"',\n" for q in (
 'shared-adaptive-flag-recovery-1003-r1/failed.json','shared-adaptive-flag-recovery-1003-r1/failure-explanation.json',
 'shared-adaptive-flag-recovery-1003-r1/executed-script.py','shared-adaptive-flag-recovery-1003-r1/sdss_display_recovery.py',
 'shared-adaptive-flag-recovery-1003-r2/result.json','shared-adaptive-flag-recovery-1003-r2/candidate/candidate.json',
 'shared-adaptive-flag-recovery-1003-r2/inputs-before.json','shared-adaptive-flag-recovery-1003-r2/inputs-after.json',
 'shared-adaptive-flag-recovery-1003-r2/executed-script.py','shared-adaptive-flag-recovery-1003-r2/sdss_display_recovery.py',
 'shared-adaptive-flag-recovery-1003-r2/sdss_adaptive_display.py','shared-adaptive-flag-recovery-1003-r2/sdss_noise_display_provenance.py',
 'shared-adaptive-flag-recovery-1003-r2/readback/result.json','shared-adaptive-flag-recovery-1003-r2/readback/visual-self-review.json')),1)
observed=('Latest adaptive-real-halo parent now reuses13323 saved admitted other-RUN alternatives after pinned saved execution/native/model/flags/epoch/projected/geometry canonical equality. '
 'JSON tuple/list false rejection reproduced before candidate creation in r1; canonical comparison repaired and persisted JSON fixture added, genuine input changes still rejected. '
 'Bounded guard-removal mutation demonstrates stale epoch reuse; current rejects. Affected35 checks pass. '
 'Remaining4180981 target values and53 native gaps retain latest parent exactly. Baseline estimates/four diagnostic lineage, science/availability/recipe and protected pins exact. '
 'Explicit rebase v2 source/adaptive parent/saved supply code lineage kept separate; original producer/version retained. '
 'Recovery1.511s CPU1.516s, whole cached preparation/save/check15.073s, Windows Python peak1315782656B, new8file56006499logicalB. '
 'No recovery projection/whole filter/rerun/download/fit. New three numeric PNGs/original alpha exact, parent RGB changes1506/2061/629. '
 'Full LOD and actual supply-dense patch viewed; warm/green/weak-structure/complete registration quality NOT_PASSED; independent review MISSING, ordinary unadopted. '
 'Earlier true halo65280 edge counts and strip repair remain; no unchanged matrix repeated. Existing processes/watch not restarted. Context/links/scoped whitespace checked by invoking turn.')
next_value=('PLAN B: qualify remaining background/weak structure/green halos and full registration with current saved candidate and existing actual source/PSF/processing material; '
 'identify material gaps/reuse mature supported responsibility before another processing change. Add current lineage to complete processing/source packet; '
 'quality/credits/rights/processing description and independent review before formal publication/adoption. '
 'Do not rerun unchanged13323 rebase/nine-edge/perimeter/861s master/cross-run/15aperture/SAT/filter matrices or unsupported parameter loops. '
 'Native/page/source Back/devices and actual mount/retention/production mixed capacity remain open.')
lines=s.splitlines()
for i,line in enumerate(lines):
    if line.strip().startswith("toolObserved='"):lines[i]="    toolObserved='"+observed+"'"
    if line.strip().startswith("next='"):lines[i]="    next='"+next_value+"'"
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'evidence':bind(TASK/'evidence'/name),'ordinaryAdopted':False,'qualityAcceptance':'NOT_PASSED','nextCheckpoint':'r32'}))
