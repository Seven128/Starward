"""Record batch equivalence, numerical failure repair and one next dependency."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
evidence='experience-sdss-adaptive-batch-display-2026-10-03.md'
r=json.loads((ROOT/'output/sdss-adaptive-batch-1003-r2/result.json').read_bytes())
assert all(row['scalarSavedOutputsExact'] for row in r['rows'])
def edit(path,fn):
    old=path.read_text(encoding='utf-8');new=fn(old);assert old!=new
    path.write_text(new,encoding='utf-8',newline='\n')
paragraph=('新增[有界批量共同孔径显示](evidence/'+evidence+')：重复native ID分组直接归约，'
 '不改noise/支持/强结构/未知保原/取消及门槛政策。四块实际输出及冻结RGB与旧标量逐值一致，'
 '外围kernel2.003→0.495秒、约4.05倍，仅一次局部本机实测。r1累计相减的极小贡献反例0.25对0.5已复现，'
 '改直接归约后通过；近门槛标量回退实际触发，unsigned身份保留，受影响检查与保存actual dense covariance读回通过。'
 'r1保历史、r2绑定当前执行，独审MISSING；没有整图/LOD/正式采用或画质升级。\n\n')
old='下一直接项仍是完整候选质量：依据新kernel实测先核重复native covariance的批量孔径算术等价、支持边界和取消，再做完整母图/LOD，不走独立noise捷径；'
new=('下一直接项仍是完整候选质量：当前批量资格已闭合，接原coadd完整母图的有界真实halo/source准入消费者和数值LOD，'
 '测整批CPU/RSS/磁盘、检查真实各级背景/弱结构/接缝，不走独立noise捷径；')
edit(TASK/'PLAN.md',lambda s:s.replace(old,paragraph+new,1).replace('不重复本次相同局部adaptive输出','不重复本次相同局部adaptive/batch输出',1))
edit(TASK/'CONTINUE-CLOUD-SKY.md',lambda s:s.replace('## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作',1).replace('current-execution-state-2026-10-03-r28.json','current-execution-state-2026-10-03-r29.json'))
for path in ('data-pipelines/deep-sky/README.md','project_context/architecture/runtime-and-domain.md'):
    edit(ROOT/path,lambda s:s.replace('The measured per-target aperture cost requires equivalent batched covariance arithmetic before full-master expansion.',
      'Equivalent bounded native-ID batch grouping now retains the original policy/support and actual saved local outputs. Direct group reductions repair an observed tiny-coefficient cancellation defect; the actual outer kernel is0.495s versus2.003s scalar. Full-master/LOD quality and total resource measurements remain next; local timing is not full-chain capacity. See [batch arithmetic evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').',1))
edit(ROOT/'project_context/external-capabilities.md',lambda s:s.replace('逐target成本已有实测，扩大前须保native covariance核批量等价，不假设目标像素独立。',
 '逐target成本已有实测，当前自有批量算术保重复native covariance和同支持，实际局部输出等价、极小系数相减缺陷已修；不假设目标像素独立。完整母图/LOD和整批资源仍缺。见[批量资格](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').',1))
def capture(s):
    s=s.replace('$sources = @(\n','$sources = @(\n'+''.join('  "$taskRoot/scripts/'+name+'",\n' for name in (
      'build-adaptive-batch-consumer-2026-10-03.py','experience-sdss-adaptive-batch-2026-10-03.py',
      'experience-sdss-adaptive-batch-final-2026-10-03.py','readback-sdss-adaptive-batch-2026-10-03.py','record-adaptive-batch-continuity-2026-10-03.py')),1)
    s=s.replace('$results = @(\n','$results = @(\n'+'  "$taskRoot/evidence/'+evidence+'",\n'+''.join("  'output/"+name+"',\n" for name in (
      'sdss-adaptive-batch-1003-r1/result.json','sdss-adaptive-batch-1003-r1/aperture-owner-executed.py',
      'sdss-adaptive-batch-1003-r2/result.json','sdss-adaptive-batch-1003-r2/inputs-before.json','sdss-adaptive-batch-1003-r2/inputs-after.json',
      'sdss-adaptive-batch-1003-r2/adaptive-owner-executed.py','sdss-adaptive-batch-1003-r2/aperture-owner-executed.py',
      'sdss-adaptive-batch-1003-r2/readback/result.json')),1)
    lines=s.splitlines()
    observed=('Bounded native-ID batching preserves original adaptive policy/source support. Actual four49-square supports/33-square '
      'outputs and frozen RGB equal saved scalar outputs. Outer1077 kernel2.00327s to0.49459s, one local observation only. '
      'Initial cumulative subtraction defect reproduced with tiny coefficient/native variance: expected0.5 observed0.25, '
      'one aperture regression failed. Direct grouped reductions repair it; unsigned native identities retained. '
      'Affected display14/aperture9 checks pass, near-threshold scalar fallback exercised. Saved actual native stencils dense '
      'covariance agree2e-13; no adaptive filter rerun for readback. r1 historical code retained, r2 actual current source bound. '
      'No new downloads/old filter/full image/LOD/adoption. Warm/green/complete quality remain unresolved. '
      'Science/weights/recipe/old candidates/publications/default/protected pins retained. Independent review MISSING. '
      'No build/BFF/watch restart. Context/links/scoped whitespace checked by invoking turn.')
    next_value=('PLAN B: bounded original-coadd whole-master source admission and real halo consumer, numeric LOD, '
      'whole offline CPU/RSS/storage and actual background/weak-structure/seam/registration quality. '
      'Batch arithmetic qualification is bounded and closed; do not repeat unchanged local adaptive/batch or old15-aperture/'
      'fullSAT/58-core/cross-run/13k/filter/empty-query matrices. No independent-target noise, old-estimate filtering, '
      'parameter loops, blanket de-green or second sky. Complete source rights-processing/quality and independent review '
      'before ordinary publication/static/API/client/source-route/cost adoption. Native/page/router Back and mixed production capacity stay open.')
    for i,line in enumerate(lines):
        if line.strip().startswith("toolObserved='"):lines[i]="    toolObserved='"+observed+"'"
        if line.strip().startswith("next='"):lines[i]="    next='"+next_value+"'"
    return '\n'.join(lines)+'\n'
edit(TASK/'scripts/capture-current-execution-2026-10-03.ps1',capture)
print(json.dumps({'oneCurrentPlan':True,'ordinaryAdopted':False,'next':'whole-master/LOD bounded source consumer'}))
