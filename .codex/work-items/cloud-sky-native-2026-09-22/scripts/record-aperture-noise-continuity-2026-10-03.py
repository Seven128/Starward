"""Carry actual aperture qualification forward with the one current plan."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
evidence='experience-sdss-aperture-noise-2026-10-03.md'
report=json.loads((ROOT/'output/sdss-aperture-noise-1003-r1/result.json').read_bytes())
assert len(report['rows'])==3 and len(report['rows'][0]['apertures'])==5
def edit(p,fn):
    old=p.read_text(encoding='utf-8');new=fn(old);assert new!=old
    p.write_text(new,encoding='utf-8',newline='\n')
paragraph=('新增[多尺度实际孔径noise资格](evidence/'+evidence+')与共享 `sdss_noise_aperture.py`：'
 '三处真实支持/15孔径先合并重复native ID再平方，保跨field Cauchy条件上界；'
 'actual saved stencil密集协方差独立算术路径一致，6项有界行为检查通过。'
 '外围半径8错误target独立假设低估方差约2.10倍，g条件比值2.12会误判约3.07；'
 '不能直接套ADAPTSMOOTH独立noise缩放、局部RMS或把均值方差当median/已滤图方差。'
 '当前只新增线性资格，没有新平滑图/recipe/普通采用，独审MISSING。\n\n')
edit(TASK/'PLAN.md',lambda s:s.replace('下一直接项仍是完整候选质量：',paragraph+
 '下一直接项仍是完整候选质量：以当前孔径noise责任核共同多尺度显示候选、锐结构跨尺度传染/选择偏差与flags/未知保原、取消/内存及实际整图LOD；',1)
 .replace('不重复本次跨run矩阵、13k恢复、完整SAT资格/58像素色比试验或无变化完整过滤。',
 '不重复本次15孔径、跨run矩阵、13k恢复、完整SAT资格/58像素色比试验或无变化完整过滤。',1))
edit(TASK/'CONTINUE-CLOUD-SKY.md',lambda s:s.replace('## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作',1)
 .replace('current-execution-state-2026-10-03-r26.json','current-execution-state-2026-10-03-r27.json'))
english=('\nShared `sdss_noise_aperture.py` now aggregates repeated native coefficients before squaring for '
 'uniform linear aperture means, then reuses conditional Cauchy field bounds. Actual three-region/fifteen-aperture '
 'stencils and a separate dense covariance readback demonstrate that target-pixel independence can overstate '
 'the conditional mean/noise ratio. It is neither a median/nonlinear-filter variance nor calibrated detection, '
 'full uncertainty, new smoothing image or ordinary adoption. Common multi-scale display still needs '
 'source-support/fallback, bright-feature cross-talk/selection-bias, lifecycle/cost and whole-image quality checks. '
 'See [actual aperture qualification](')
for path,prefix in [('data-pipelines/deep-sky/README.md','../../'),('project_context/architecture/runtime-and-domain.md','../../')]:
    edit(ROOT/path,lambda s,p=prefix:s+english+p+'.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').\n')
edit(ROOT/'project_context/external-capabilities.md',lambda s:s+'\n**多尺度显示资格（2026-10-03，未采用）：** '
 'ADAPTSMOOTH的共同尺度思路可研究，独立噪声缩放/局部RMS不直接适合当前重采样coadd；'
 '作者代码入口访问失败、rights未知，未复制/安装。当前复用既有NumPy/native source owners实现线性孔径variance，'
 '保存actual stencil密集协方差读回一致，条件模型遗漏误差保持；不供应median/后滤variance或完整SNR认证。'
 '没有新平滑图/科学修正/依赖或普通采用。见[实际资格](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').\n')
def capture(s):
    s=s.replace('$sources = @(\n','$sources = @(\n'
      "  'data-pipelines/deep-sky/sdss_noise_aperture.py',\n"
      "  'data-pipelines/deep-sky/test_sdss_noise_aperture.py',\n"
      '  "$taskRoot/scripts/experience-sdss-aperture-noise-2026-10-03.py",\n'
      '  "$taskRoot/scripts/readback-sdss-aperture-covariance-2026-10-03.py",\n'
      '  "$taskRoot/scripts/record-aperture-noise-continuity-2026-10-03.py",\n',1)
    s=s.replace('$results = @(\n','$results = @(\n'
      '  "$taskRoot/evidence/'+evidence+'",\n'
      "  'output/sdss-aperture-noise-1003-r1/result.json',\n"
      "  'output/sdss-aperture-noise-1003-r1/inputs-before.json',\n"
      "  'output/sdss-aperture-noise-1003-r1/inputs-after.json',\n"
      "  'output/sdss-aperture-noise-1003-r1/aperture-owner-executed.py',\n"
      "  'output/sdss-aperture-noise-1003-r1/readback/result.json',\n",1)
    lines=s.splitlines()
    observed=('New shared offline linear-aperture variance owner combines repeated native IDs before squaring '
      'and reuses conditional field Cauchy bounds, no target independence. Six meaningful owner checks pass. '
      'Actual three source-qualified science regions with15 circular aperture supports preserve existing sources '
      'science/weights/recipes/publications/default/protected pins. Saved actual stencil dense Hdiag(V)H-transpose '
      'root arithmetic readback agrees without importing the new helper. '
      'Outer radius8 wrong target-independent variance low by about2.10; g conditional mean/sigma2.12 '
      'would become about3.07 under wrong assumption. Not physical confidence/detection, median/filter noise or whole quality. '
      'ADAPTSMOOTH common-scale mathematical responsibility researched; constant independent noise/local RMS '
      'not directly adopted, source code endpoint unavailable/rights unknown, no install/copy. '
      'No new filter/image/fit/download/full matrix, ordinary adoption or live BFF restart. '
      'Root self-review, independent review MISSING. Context/links/scoped whitespace checked by invoking turn.')
    next_value=('PLAN B: use actual conditional linear aperture noise to qualify common multi-scale display, '
      'same support across bands, source/flags/unknown fallback, bright structure cross-talk and selection bias, '
      'cancellation/bounded memory then actual whole-image/LOD background/weak-structure quality. '
      'Do not substitute median/nonlinear estimate variance, independence/local RMS, blanket de-green, second sky '
      'or tone parameter loops. Do not repeat15 apertures/full SAT/58-core/cross-run/13k/unchanged filter/empty query matrices. '
      'Full registration/source rights-credit-processing review precede formal batch/static/API/client/source-route/cost adoption. '
      'Native/public-time/router Back/independent review and actual production references/mixed capacity stay open.')
    for i,line in enumerate(lines):
        if line.strip().startswith("toolObserved='"):lines[i]="    toolObserved='"+observed+"'"
        if line.strip().startswith("next='"):lines[i]="    next='"+next_value+"'"
    return '\n'.join(lines)+'\n'
edit(TASK/'scripts/capture-current-execution-2026-10-03.ps1',capture)
print(json.dumps({'onePlanUpdated':True,'contextUpdated':True,'adopted':False}))
