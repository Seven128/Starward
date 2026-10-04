"""Record actual exterior support, perimeter refinement and quality limits."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
LOCAL=ROOT/'output/sdss-real-halo-1003-r1';OUT=ROOT/'output/shared-adaptive-real-halo-1003-r1'
r=json.loads((OUT/'result.json').read_bytes());b=json.loads((OUT/'readback/result.json').read_bytes())
assert r['nineActualWindowOutputsExact'] and b['interiorEstimatesAndDiagnosticsExact'] and b['edgeTargets']==65280
def bind(path):
    data=path.read_bytes();return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
visual={'kind':'ROOT_VISUAL_SELF_REVIEW_NOT_INDEPENDENT_ACCEPTANCE','images':[
 bind(LOCAL/'actual-edge-comparison.png'),bind(OUT/'readback/actual-full-lod-comparison.png'),bind(OUT/'readback/actual-boundary-and-structure-pairs.png')],
 'method':'Three actual saved PNG contact images viewed using functions.view_image original detail.',
 'observations':['Observed top fallback grain strip removed by actual exterior support; four corners/edge middles viewed.',
  'Some actual unsupported/protected areas remain original; no blanket border completion claim.',
  'Full overview edge changes are limited; medium/detail parent RGB exact. Central warm field, green halos and flagged structure unresolved; colour alone does not diagnose artifact.'],
 'qualityAcceptance':'NOT_PASSED','independentReview':'MISSING','ordinaryAdopted':False}
with (OUT/'readback/visual-self-review.json').open('x',encoding='utf-8') as f:json.dump(visual,f,indent=2);f.write('\n')
name='experience-real-halo-perimeter-refinement-2026-10-03.md'
e=f'''# 真实外侧halo与仅边缘更新

沿唯一PLAN B，上一代[完整候选](experience-shared-adaptive-display-2026-10-03.md)已看到强制外8px保原颗粒带。本轮复用现有缓存frame、原WCS及物理CCD边界权重，取得真实外侧支持并更新整个65,280目标的裁边环；没有重新执行861秒整幅过滤、镜像/复制/补零或改变alpha。普通registry/default/正式发布未采用，独审MISSING。

## 共享责任和失败修复

`sdss_gri_tan.project_frame_window`负责原目标坐标（可负/越过裁边）到真实源四邻采样；保存行仍以原master尺寸翻转FITS y。旧`reproject_band`已迁移此责任。`geometric_field_weight`负责共同gri有限支持和到真实源CCD边界的最小距离+1，旧mosaic与新halo共同使用；该权重不是目标窗口边界、亮度/置信或噪声权重。没有新WCS缩放、配准shift、扣sky或源下载。

`sdss_noise_display._project_real_halo_window`沿原source/camera/SKY/fpM准入，将外侧真实样本coadd；每个窗口重叠内的projected数据/footprint/finite、共同权重/科学/availability逐值核原cache，冲突拒绝。重复native ID及跨field Cauchy条件上界保持；外侧科学或模型/flags缺失不能当零、复制图内边缘或桥接孔径。原source/科学/weights不覆盖。

首次新检查复现single partial错误：共同coadd缺带时清掉其他带已存在的独立样本，触发`science_overlap_mismatch`、3项中1错误/exit1。已区分single独立样本保存与共同颜色资格，保已有带、仍拒不完整颜色；修后5项real-halo检查通过。检查另覆盖真实外侧非复制、flags外侧阻止平滑、源权重错、edge-only内部保持/原alpha、取消无半成品、假标v2政策拒绝/重复refine拒绝。旧gri19/display14/master4受影响检查通过，不替代真实图质。

统计勘误：已执行consumer结果的scope文字仍有64896笔误，保持执行文件和hash不改；实际代码按2048²−2032²计算，candidate.edgeTargetPixels及数值读回edgeTargets均为65,280。先前进度中的数字同步纠正，无需重新加工。

## 九处实际资格

[消费](../scripts/experience-sdss-real-halo-2026-10-03.py)用实际六field/18frame/fpM/CAS与原2048²coadd，九处实际边/角窗口包括已观察[24,0,152,128]及四角/四边中部。缓存重叠逐值精确、窗口内原内区估计/半径/门槛/保护与父候选精确，科学请求0/fit0/旧filter0/整幅filter0。来源/保护文件before-after pin精确。

[九处结果](../../../../output/sdss-real-halo-1003-r1/result.json)，{bind(LOCAL/'result.json')['bytes']:,}B，SHA256 `{bind(LOCAL/'result.json')['sha256']}`。观察到的top窗口1024边中心中979估计/787RGB改变，top-mid原样，其他窗口实际改善与保原分开。已查看[三列实际边缘](../../../../output/sdss-real-halo-1003-r1/actual-edge-comparison.png)：原强制颗粒条带消除，真实资格不足处仍有原grain，不能据此认证全部边/完整弱结构或“更黑=无天体”。

[外侧真实支持读回](../scripts/readback-real-halo-noise-2026-10-03.py)使用保存window/stencil，在三个当前边中心直接累计均值并形成dense H diag(V) Hᵀ，确有裁边外真实样本参与；已选均值float32与保存输出精确，三带条件比值到达与保存reached一致。无生产helper导入/重新filter/源请求。这是root独立算术路径而非独立人员审查。[结果](../../../../output/sdss-real-halo-1003-r1/readback/result.json)，4,653B，SHA256 `3d47c735847483133ec86b47f30c8cfa7fd0a94c090203c5156b6d755fb99ce7`。

## 完整边缘增量

共享 `refine_adaptive_real_halo`从已绑定v1候选开始，四个真实halo窗口top/bottom含角、left/right除角；环每个目标一次，内部不再过滤。未知外侧阻止扩大并保最后真实有效结果/原值；gri同支持、强正负单带全色保护、取消无半成品、science/alpha保持。新显式版本`sdss-common-adaptive-real-halo-display-candidate-v2`记录父估计/诊断hash、来源、政策、4窗口、原内区精确和whole filter0；旧v1仍可读，假标v2缺政策拒绝，已v2不能重复refine。不是旧科学出版冒充新测量。

[实际四边消费](../scripts/experience-shared-adaptive-real-halo-2026-10-03.py)与[结果](../../../../output/shared-adaptive-real-halo-1003-r1/result.json)，{bind(OUT/'result.json')['bytes']:,}B，SHA256 `{bind(OUT/'result.json')['sha256']}`；candidate SHA256 `{r['candidate']['sha256']}`。65,280目标中54,514估计对父版改变；父版内部全部估计/四诊断精确、九处小路径输出精确、所有原输入与六保护pin保持。ring内64,119中心noise资格、8,637强结构保护，1,161真实中心资格不足；还有965已qualified中心第一有效孔径被邻域缺口阻止（非虚构外侧支持）。旧science availability仍4,194,304。

实际refine wall {r['processingSeconds']:.2f}s/CPU {r['processingCPUSeconds']:.2f}s；含缓存准备/保存/读回前核查wall {r['wholeElapsedSeconds']:.2f}s/CPU {r['wholeCPUSeconds']:.2f}s。Windows Python峰值working set {r['finalMemory']['peakWorkingSetBytes']:,}B包含sources/master/父和新output/库，不是手机、服务或生产容量。当前最大retained stencil46,365,696B，仅4窗口；不把它当整个进程或全产品峰值。

新候选11文件logical {b['candidateDisk']['logicalBytes']:,}B，API-reported按unique identity allocation {b['candidateDisk']['reportedAllocationBytesByUniqueFileIdentity']:,}B。只测新候选不重扫旧库存，不含FS metadata/全链/回滚备份，不作Linux180GB余量或旧版回收许可。

[保存数值读回](../scripts/readback-shared-adaptive-real-halo-2026-10-03.py)不filter：完整内区估计及诊断精确，saved signed mean→冻结RGB三级PNG逐像素精确，原alpha精确。对父版OVERVIEW3227 RGB变、MEDIUM/DETAIL0；source science/recipe/default保持。[结果](../../../../output/shared-adaptive-real-halo-1003-r1/readback/result.json)，21,996B，SHA256 `e42f68dd374a272ab59030bc3a0fb5ec5d97051e20358966ca4244ce62453b6b`。已查看[完整三级](../../../../output/shared-adaptive-real-halo-1003-r1/readback/actual-full-lod-comparison.png)和[结构/边界](../../../../output/shared-adaptive-real-halo-1003-r1/readback/actual-boundary-and-structure-pairs.png)，原强制grain条带的修复有实际输出；暖底/绿晕/标记区域和完整配准/弱结构质量仍开放。色本身不判伪影，中心照片未改不能宣称中心质量通过。[自审](../../../../output/shared-adaptive-real-halo-1003-r1/readback/visual-self-review.json)不是独审。

## 下一依赖与保留状态

当前强制外8px颗粒条带责任已在上述实际源支持范围修复。下一项核最新adaptive-real-halo baseline消费既有已qualified other-RUN flag alternative，先校旧源/science/recipe/epoch及保存supply pin与新父一致，再以共享恢复责任更新已知flags；复用原13k supply而非重跑旧跨run/恢复矩阵，保53 native资格缺口/同run/未知/无供应及不相关值、取消和完整来源谱系。它只修真实有供应的flags，不支持全图弱结构或de-green。随后继续背景/弱结构/PSF/配准、加工来源完整合同和必要独审，再接正式采用链。

普通Prepared/science registry仍空，完整质量NOT_PASSED/独审MISSING；HST M51矩形FAILED、M82输入不足、WXML FAILED_DEVTOOLS、设备/新版月面/Android-iOS、实际page/Source Back和端云/200DAU混合容量均不升级。原分支/HEAD/服务watch未迁移或重启，没有提交/推送/发布。
'''
(TASK/'evidence'/name).write_text(e,encoding='utf-8',newline='\n')
def edit(path,fn):
    old=path.read_text(encoding='utf-8');new=fn(old);assert new!=old;path.write_text(new,encoding='utf-8',newline='\n')
paragraph=('新增[真实halo/仅完整边缘增量](evidence/'+name+')：原CCD边界权重与采样已共用，'
 '九处实际来源/科学/权重重叠精确；single partial独立带误清缺测已复现修复，未知/flags外侧不桥接。'
 '共享v2只更新65280边目标，54514估计变，内部/九处局部精确；22.53秒、峰值working set1,119,002,624B，'
 '新候选68,591,336逻辑B/68,628,480 Windows allocationB。三级推导/原alpha精确，OV对父3227 RGB变/MED-DETAIL0，'
 '实际原强制grain条带消除；真实资格缺口继续保原。独审MISSING、完整图质未过/未采用，无整幅重复过滤。\n\n')
old=('下一直接项仍是完整候选质量：完整候选已开发读回，但真实外8px保原颗粒与平滑内区过渡未解决，'
 '先以缓存真实来源/几何/权重/noise在边缘小路径核支持与恢复，不用镜像/复制/补零或盲改alpha；'
 '有实证的政策变化才再完整加工，不重跑无变化861秒母图；')
new=('下一直接项仍是完整候选质量：真实halo已修当前强制外8px颗粒带且保持完整内区，'
 '下一项核最新adaptive-real-halo baseline与既有qualified other-RUN flag alternative的源/science/recipe/epoch及保存supply pin一致，'
 '再接共享恢复责任、取消/不相关值保持和当前来源谱系；复用已有13k supply，不重跑旧跨run/恢复矩阵或861秒母图；')
edit(TASK/'PLAN.md',lambda s:s.replace(old,paragraph+new,1))
edit(TASK/'CONTINUE-CLOUD-SKY.md',lambda s:s.replace('## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作',1).replace('current-execution-state-2026-10-03-r30.json','current-execution-state-2026-10-03-r31.json'))
for path in ('data-pipelines/deep-sky/README.md','project_context/architecture/runtime-and-domain.md'):
    edit(ROOT/path,lambda s:s.replace('Qualify actual edge support before another full run.',
      'Actual frame-supported exterior windows now share native sampling/physical-CCD-edge weights with the old reprojection/mosaic owners. Perimeter-only v2 refinement preserves the cached interior, original science and alpha; a single-partial independent-band regression was reproduced and repaired. Four real windows update65280 targets without whole filtering; actual saved LOD readback and nine local consumers agree. The forced outer-halo grain transition is repaired where source/model support is qualified; true unknown gaps remain original. See [real halo evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+'). Full quality/independent review and ordinary adoption remain open.',1))
edit(ROOT/'project_context/external-capabilities.md',lambda s:s.replace('先核真实边缘支持，不做合成补边/重复扣sky。',
 '现已复用原缓存frame/原WCS/真实CCD边界权重修强制裁边fallback条带，保真实未知与flags，不作合成补边/重复扣sky；只是显式v2边缘增量，完整图质未通过。见[真实支持与当前输出](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+').',1))
def capture(s):
    s=s.replace('$sources = @(\n','$sources = @(\n'+"  'data-pipelines/deep-sky/test_sdss_real_halo.py',\n"+''.join('  "$taskRoot/scripts/'+f+'",\n' for f in (
      'build-real-halo-consumer-2026-10-03.py','experience-sdss-real-halo-2026-10-03.py','build-real-halo-refinement-2026-10-03.py',
      'experience-shared-adaptive-real-halo-2026-10-03.py','build-real-halo-readback-2026-10-03.py','readback-shared-adaptive-real-halo-2026-10-03.py',
      'readback-real-halo-noise-2026-10-03.py','record-real-halo-continuity-2026-10-03.py')),1)
    s=s.replace('$results = @(\n','$results = @(\n'+'  "$taskRoot/evidence/'+name+'",\n'+''.join("  'output/"+f+"',\n" for f in (
      'sdss-real-halo-1003-r1/result.json','sdss-real-halo-1003-r1/inputs-before.json','sdss-real-halo-1003-r1/inputs-after.json','sdss-real-halo-1003-r1/actual-edge-comparison.png','sdss-real-halo-1003-r1/readback/result.json',
      'shared-adaptive-real-halo-1003-r1/result.json','shared-adaptive-real-halo-1003-r1/candidate/candidate.json','shared-adaptive-real-halo-1003-r1/inputs-before.json','shared-adaptive-real-halo-1003-r1/inputs-after.json',
      'shared-adaptive-real-halo-1003-r1/sdss_adaptive_display.py','shared-adaptive-real-halo-1003-r1/sdss_noise_display.py','shared-adaptive-real-halo-1003-r1/sdss_gri_tan.py',
      'shared-adaptive-real-halo-1003-r1/readback/result.json','shared-adaptive-real-halo-1003-r1/readback/visual-self-review.json')),1)
    observed=('Actual exterior halo now uses original WCS/real native samples/physical CCD-edge common weights, shared with old '
      'reprojection/mosaic owners. Nine actual border/corner consumers agree cached projected/science/weight/availability overlap. '
      'Single partial independent-band erasure reproduced (one error/exit1) then repaired; common colour remains unavailable. '
      'Real exterior flags/unknowns block unsupported smoothing, no mirrored/copied/zero pad or alpha changes. '
      'Real-halo5/gri19/display14/master4 checks pass. Four-window perimeter-only v2 updates65280 targets;54514 estimates change, '
      'whole interior/diagnostics and nine local results exact, no whole-master filter. Kernel22.526s CPU22.4375s; '
      'whole cached preparation/serialize/check36.031s, Windows Python peak1119002624B. '
      'Candidate68591336logicalB/68628480API allocationB for11 unique identities, new local output only. '
      'Three numeric PNG derivations/original alpha exact; OVERVIEW3227 RGB change from parent, MEDIUM/DETAIL0. '
      'Saved actual outside-support mean/dense covariance/reached readback passes, no adaptive rerun/helper imports. '
      'Three actual contacts viewed: forced grain strip removed with actual support; true gaps/strong field unchanged. '
      'Warm/green/flagged/full weak-structure quality not passed; independent review MISSING/default unadopted. '
      'Source/science/weights/recipe/old/default/protected pins exact. No downloads/build/service/watch restart or release. '
      'Context/links/scoped whitespace checked by invoking turn.')
    next_value=('PLAN B: verify latest adaptive-real-halo baseline against existing qualified other-RUN flag alternative source/'
      'science/recipe/epoch/supply pins, reuse saved13k alternatives through shared recovery with current lineage, '
      'cancellation and unrelated-value preservation. Keep53 native-noise gaps/same-run/unknown/no supply original; '
      'not whole weak-structure or de-green support. Do not repeat unchanged nine-edge/perimeter/861s master/'
      'old cross-run/recovery/15aperture/SAT/filter matrices. Complete background/weak-structure/registration/source '
      'contract/review before formal adoption. Native/page/source Back/independent review and production mixed capacity open.')
    lines=s.splitlines()
    for i,line in enumerate(lines):
        if line.strip().startswith("toolObserved='"):lines[i]="    toolObserved='"+observed+"'"
        if line.strip().startswith("next='"):lines[i]="    next='"+next_value+"'"
    return '\n'.join(lines)+'\n'
edit(TASK/'scripts/capture-current-execution-2026-10-03.ps1',capture)
print(json.dumps({'evidence':bind(TASK/'evidence'/name),'onePlan':True,'ordinaryAdopted':False,'qualityAcceptance':'NOT_PASSED'}))
