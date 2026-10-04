"""Record new response boundaries without superseding historical evidence."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
evidence='experience-target-grid-psf-response-2026-10-03.md'
summary='新增[真实目标网格PSF响应](evidence/'+evidence+')：原空间signed模型已经过实际source stencil/WCS/保存共同gri权重，87个DETAIL位置含74单field和13跨RUN；另一个真实同RUN重叠仅为声明的geometry控制，不冒检测恒星。权重及float32响应算术读回成立，native重复使用不当独立观测；三个位置核心部分模型未知，保持未知/不外推/不补零。只描述原线性science coadd，不供应当前非线性adaptive display有效PSF，不批准全图matching。两脚本失败、模型/恒星/系统误差/完整图质与独审缺口保留，无科学/候选/生产代码或产品依赖改动。\n\n'
next_step='下一直接项仍是当前完整候选质量：原线性science-parent目标模型响应小路径已闭开发，不重复87响应、同RUN控制、275检测/261新fit/旧45fit/孔径/跨run/九边/13323供应或861秒整幅。先在共同完整模型支持及真实halo的原科学小块做一次成熟库共PSF匹配开发试验，核实际三带颜色/细节/负值/边缘并以相同冻结recipe对照当前完整候选；模型未知/外推或实际效果不足就保当前候选、不扩全图。当前非线性adaptive median/共同radius/flag恢复不能套science-parent PSF反卷积；真实image候选仍含extended/blend、43center-bound，系统/sky/模型误差及full DCR/绝对配准缺口保留，不由conditional统计批准shift/扣sky/gain。完整背景/绿晕/弱结构/coverage、同母图三级质量必须继续交付，任何有效新加工接当前完整候选并保原科学/alpha/冻结recipe/失败恢复。本代来源packet仍离线，质量与来源权利/信用/加工说明、必要独审可审查后才接新版正式合同/批量出版/static/API/client/source-route Back和保留成本。普通science/Prepared registry空；HST矩形FAILED/M82缺完整输入、实际page/native/Android/iOS/总资源和200DAU混合容量义务不缩减。'
p=TASK/'PLAN.md';s=p.read_text(encoding='utf-8');lines=s.splitlines();i=next(i for i,x in enumerate(lines) if x.startswith('下一直接项仍是当前完整候选质量：'));lines[i]=summary.rstrip()+'\n\n'+next_step;p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
p=TASK/'CONTINUE-CLOUD-SKY.md';s=p.read_text(encoding='utf-8');anchor='新增[原生紧凑候选/实际中心材料]';i=s.index(anchor);end=s.index('\n\n',i);s=s[:end+2]+summary+s[end+2:]
s=s.replace('[current-execution-state-2026-10-03-r35.json](evidence/current-execution-state-2026-10-03-r33.json)','[current-execution-state-2026-10-03-r36.json](evidence/current-execution-state-2026-10-03-r36.json)');p.write_text(s,encoding='utf-8')
p=ROOT/'project_context/external-capabilities.md';s=p.read_text(encoding='utf-8');old='原生模型不供真实重采样/coadd后的目标PSF，先核该实际响应责任，不重复当前检测/fit或无据参数循环'
new='最新空间模型经真实stencil/WCS和保存common-gri权重取得原线性science-coadd目标响应，单field/跨RUN及声明的同RUN几何控制分开；native重复样本不能当独立观测，正权重未知模型不补零。它不供应当前非线性adaptive-display有效PSF，仍非恒星/真实PSF认证；不重复检测/fit/已核响应或据此全图反卷积，见[目标响应边界](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+')'
assert old in s;s=s.replace(old,new);p.write_text(s,encoding='utf-8')
p=TASK/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8')
scripts=['experience-target-psf-response-2026-10-03.py','experience-target-psf-response-r2-2026-10-03.py','experience-target-psf-response-r3-2026-10-03.py','experience-target-psf-same-run-control-2026-10-03.py','readback-target-psf-response-2026-10-03.py','readback-target-psf-response-r2-2026-10-03.py','measure-target-response-allocation-2026-10-03.py','record-target-response-continuity-2026-10-03.py']
s=s.replace('$sources = @(\n','$sources = @(\n'+''.join('  "$taskRoot/scripts/'+n+'",\n' for n in scripts),1)
results=['output/target-psf-response-1003-r1/failed.json','output/target-psf-response-1003-r2/failed.json','output/target-psf-response-1003-r3/result.json','output/target-psf-response-1003-r3/readback-r2/result.json','output/target-psf-response-1003-r3/readback-r2/owned-output-allocation.json','output/target-psf-same-run-control-1003-r1/result.json','output/target-psf-same-run-control-1003-r1/readback-r2/result.json']
assert '$results = @(\n' in s;s=s.replace('$results = @(\n','$results = @(\n  "$taskRoot/evidence/'+evidence+'",\n'+''.join("  '"+n+"',\n" for n in results),1)
lines=s.splitlines()
for i,line in enumerate(lines):
    if line.strip().startswith("toolObserved='"):
        lines[i]="    toolObserved='Native signed finite PSF through original real WCS/stencil/common-gri saved weights gives87 science-parent target unit responses:74single-field,13cross-run; separate one same-run geometry control is not a detected star. Explicit row-first spline/four-neighbor/float32 coadd readback, actual within-field repeated native usage and unknown support preserved. Main5775unknown band-pixels includes843radius12 at3positions; control2corner unknown/core0. Not current nonlinear adaptive-display effective PSF, model truth, full matching or quality adoption. Root viewed2 of6 sheets and1geometry control, not full visual acceptance. Failed r1header parsing/r2float32 raw-weight accumulation retained. No detector/fit/raw-frame reread/refilter/scientific or display correction/production code change. Existing source/current candidate/protected exact. New four output tree Windows allocation including failures only; not Linux/full retention/capacity. Independent review MISSING.'"
    if line.strip().startswith("next='"):
        lines[i]="    next='PLAN B: one bounded mature common-PSF matching development trial on original scientific real-halo cut only where all model support is known; compare actual color/detail/negative/edge with current full candidate and same frozen recipe. Nonlinear adaptive display cannot use parent PSF as deconvolution truth. Unknown or poor results preserve candidate, no global expansion. No repeat87response/detection261fit/old45fit/aperture/cross-run/edge/recovery/whole master. Full quality/rights/credit/processing/source Back/independent review, page/native/devices, actual retention and200DAU mixed capacity remain open.'"
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
# Verify all production files pinned in r35, excluding task scripts/docs.
old=json.loads((TASK/'evidence/current-execution-state-2026-10-03-r35.json').read_bytes());count=0
for v in old['currentSources']:
    if v['path'].startswith(('data-pipelines/','workers/','apps/','packages/')):
        p=ROOT/v['path'];assert p.stat().st_size==v['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256'];count+=1
print(json.dumps({'productionFilesExactAgainstR35':count,'updated':[str(TASK/'PLAN.md'),str(TASK/'CONTINUE-CLOUD-SKY.md'),str(ROOT/'project_context/external-capabilities.md'),str(TASK/'scripts/capture-current-execution-2026-10-03.ps1')]}))
