"""Maintain the actual common-scale candidate and measured next dependency."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
evidence='experience-sdss-adaptive-local-display-2026-10-03.md'
r=json.loads((ROOT/'output/sdss-adaptive-local-1003-r1/result.json').read_bytes())
assert next(row for row in r['rows'] if row['name']=='outer-mixed')['changedEstimateCenters']==1077
def edit(p,fn):
    old=p.read_text(encoding='utf-8');new=fn(old);assert old!=new;p.write_text(new,encoding='utf-8',newline='\n')
paragraph=('新增[共同多尺度显示小路径](evidence/'+evidence+')与共享 `sdss_adaptive_display.py`：'
 '原coadd同一孔径/排除位置，强正负单带保全部原色并不传染；未知/flags保原、外圈及取消有界。'
 '固定1/2/4/8与条件绝对门槛3不是验收阈值/探测置信，未达共同门槛保持false和科学有效性。'
 '五项新行为检查通过；四块实际图已查看，外围1077均值/769RGB改变且颗粒底减轻，'
 '旋臂/标记块保原，暖色/绿晕仍在。保存逐坐标均值及冻结RGB读回保持，独审MISSING；'
 '没有新整图/LOD/正式出口或采用。外围kernel2.003秒，逐像素native聚合成本有实测。\n\n')
edit(TASK/'PLAN.md',lambda s:s.replace('下一直接项仍是完整候选质量：',paragraph+
 '下一直接项仍是完整候选质量：依据新kernel实测先核重复native covariance的批量孔径算术等价、支持边界和取消，再做完整母图/LOD，不走独立noise捷径；',1)
 .replace('不重复本次15孔径、跨run矩阵','不重复本次相同局部adaptive输出、15孔径、跨run矩阵',1))
edit(TASK/'CONTINUE-CLOUD-SKY.md',lambda s:s.replace('## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作',1)
 .replace('current-execution-state-2026-10-03-r27.json','current-execution-state-2026-10-03-r28.json'))
english=('\n`sdss_adaptive_display.py` now provides bounded common-aperture display regions from original signed coadd '
 'samples. A sign-neutral conditional ratio gate keeps strong structure in any band unchanged across all bands '
 'and excludes it from weak apertures; unknown/flagged support and cancellation preserve recovery semantics. '
 'Fixed tested radii/ratio are candidate policy, not calibrated detection or quality acceptance. Four actual local '
 'outputs show quieter peripheral grain but unchanged warm/flagged structure, with saved-support means and '
 'frozen RGB readback. The measured per-target aperture cost requires equivalent batched covariance arithmetic '
 'before full-master expansion. No new full image/publication/default adoption. See [current local path](')
for p,prefix in [('data-pipelines/deep-sky/README.md','../../'),('project_context/architecture/runtime-and-domain.md','../../')]:
    edit(ROOT/p,lambda s,b=prefix:s+english+b+'.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').\n')
edit(ROOT/'project_context/external-capabilities.md',lambda s:s+'\n**共同多尺度显示小路径（2026-10-03，未采用）：** '
 '已用自有共享owner与既有NumPy/原native-noise责任形成显式局部显示，不复制ADAPTSMOOTH代码；'
 '符号对称门槛/强结构排除与其原算法不同，不借论文保测光或性能结论。'
 '实际外围颗粒底减轻，旋臂和标记结构保原；完整图质未过。逐target成本已有实测，'
 '扩大前须保native covariance核批量等价，不假设目标像素独立。'
 '没有新依赖/正式发布/普通采用。见[当前输出及边界](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').\n')
def capture(s):
    s=s.replace('$sources = @(\n','$sources = @(\n'
      "  'data-pipelines/deep-sky/sdss_adaptive_display.py',\n"
      "  'data-pipelines/deep-sky/test_sdss_adaptive_display.py',\n"
      '  "$taskRoot/scripts/build-adaptive-local-consumer-2026-10-03.py",\n'
      '  "$taskRoot/scripts/experience-sdss-adaptive-local-2026-10-03.py",\n'
      '  "$taskRoot/scripts/readback-sdss-adaptive-local-2026-10-03.py",\n'
      '  "$taskRoot/scripts/record-adaptive-local-continuity-2026-10-03.py",\n',1)
    s=s.replace('$results = @(\n','$results = @(\n'
      '  "$taskRoot/evidence/'+evidence+'",\n'
      "  'output/sdss-adaptive-local-1003-r1/result.json',\n"
      "  'output/sdss-adaptive-local-1003-r1/inputs-before.json',\n"
      "  'output/sdss-adaptive-local-1003-r1/inputs-after.json',\n"
      "  'output/sdss-adaptive-local-1003-r1/adaptive-owner-executed.py',\n"
      "  'output/sdss-adaptive-local-1003-r1/actual-local-comparison.png',\n"
      "  'output/sdss-adaptive-local-1003-r1/readback/result.json',\n",1)
    lines=s.splitlines()
    observed=('New common-scale adaptive region display owner uses original signed coadd, common masks and '
      'actual native aperture variance/Cauchy conditional upper. Fixed candidate radii1/2/4/8 and absolute ratio3, '
      'no parameter sweeps/second sky or target independence. Strong positive/negative structure in any band '
      'keeps complete colour and does not spread; unknown/flagged support, real outer halo and cancellation covered. '
      'Five new behavior checks pass. Four actual49-square source supports/33-square outputs viewed: '
      'outer1077 estimates/769 RGB change, grain reduced; arm/diffuse/flagged remain original, warm/green structure unresolved. '
      'All outer selected apertures remain below common ratio, not confidence/admission. '
      'Saved-coordinate mean and frozen RGB readback exact without filter re-execution. '
      'Observed outer1077-target kernel2.003seconds, so equivalent batched covariance needed before full expansion. '
      'Original source/science/weights/recipe/old candidates/publications/default/protected pins exact. '
      'No new whole image/LOD/serialization/formal adoption or live BFF/watch restart. '
      'Root self-review, independent review MISSING. Context/links/scoped whitespace checked by invoking turn.')
    next_value=('PLAN B: use measured per-target cost to qualify equivalent batched aperture/native covariance '
      'arithmetic, same band support/protected structure/unknown fallback and cancellation before whole-master/LOD '
      'background/weak-structure output. No wrong target independence, filtered/median noise substitution, '
      'parameter loops, blanket de-green or second sky. Do not repeat unchanged local adaptive output,15-aperture '
      'qualification/fullSAT/58-core/cross-run/13k/filter/empty-query matrices. '
      'Whole quality/registration/source rights-credit-processing review precedes formal batch/static/API/client/source-route/cost adoption. '
      'Native/public-time/router Back/independent review and production/mixed capacity stay open.')
    for i,line in enumerate(lines):
        if line.strip().startswith("toolObserved='"):lines[i]="    toolObserved='"+observed+"'"
        if line.strip().startswith("next='"):lines[i]="    next='"+next_value+"'"
    return '\n'.join(lines)+'\n'
edit(TASK/'scripts/capture-current-execution-2026-10-03.ps1',capture)
print(json.dumps({'oneCurrentPlan':True,'contextUpdated':True,'adopted':False}))
