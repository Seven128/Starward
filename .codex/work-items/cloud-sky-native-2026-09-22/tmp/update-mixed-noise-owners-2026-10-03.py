import hashlib
import json
from pathlib import Path

root=Path(__file__).resolve().parents[4];task=root/'.codex/work-items/cloud-sky-native-2026-09-22'
for directory,cause,stage in (
    ('science-shared-observation-1003-r1','AttributeError: NativeNoiseSamples field calibration_nmgy_per_count was misspelled calib_nmgy_per_count.','First native patch, before a measurement record.'),
    ('science-mixed-noise-display-1003-r1','AssertionError: floating-point exact .2 equality in zero-contributor control.','After actual kernel, before image/result emission.')):
    out=root/'output'/directory;source=(out/'executed-script.py').read_bytes()
    assert not (out/'failed.json').exists()
    (out/'failed.json').write_text(json.dumps({'status':'FAILED','observedExitCode':1,'cause':cause,'stage':stage,
        'executedScriptSha256':hashlib.sha256(source).hexdigest(),'meaning':'Preserved real failure; repaired run in separate directory does not retroactively pass this run.'},indent=2)+'\n',encoding='utf-8')

def replace(path,old,new):
    text=path.read_text(encoding='utf-8');assert text.count(old)==1,(path,old)
    path.write_text(text.replace(old,new),encoding='utf-8',newline='')

replace(task/'PLAN.md',
    '下一直接项先用现有跨field真实数据核共享观测/native身份与混合区噪声支持边界，决定候选能否进入完整共同显示/出版；不把单fieldσ覆盖coadd、不按field独立处理后硬切、不循环σ调参。若身份/协方差不足，保持原测量并保缺口，推进PLAN中独立的实际page/来源Back或D项；不凭猜测建全幅confidence/coadd权重，也不重复旧全幅PSF/flag/重叠矩阵；',
    '最新[共享观测与混合显示](evidence/experience-science-shared-observation-and-mixed-display-2026-10-03.md)以两run三带缓存核同扫描1361行相对CCD索引、实际重复/校准/投影差异，未把重复数据当独立曝光或噪声严格相等。真实33²混合coadd上一次共同过滤已取得原RGB精确参考与实际局部改善；按每field贡献差及同field共享native协方差求边际，再用Cauchy条件上界保未知cross-field协方差，约为错误独立相加的1.96倍。这不是完整confidence或sky系统误差界。下一直接项将共同显示和噪声/贡献资格接到明确共享离线owner的显式candidate，覆盖single/mosaic/partial、missing/零贡献/坏点保原及有界加工内存；再在当前完整母图/LOD实看背景接缝、星点/弱结构和处理/来源成本。旧science/default保持，未取得独审/完整质量前不采用；不把单fieldσ覆盖coadd、按field平滑后硬切、循环σ调参或先建全幅confidence/权重框架，不重复旧全幅PSF/flag/重叠矩阵；')
replace(task/'PLAN.md',
    '先核跨field共享观测/native身份及混合区noise边界，不能供应完整coadd置信或普通显示采用。',
    '跨field重复身份/差异与Cauchy条件上界已在实际混合区开发核对，下一步显式shared候选/single/mosaic/partial及完整质量与成本，不能供应完整coadd置信或普通显示采用。')
replace(task/'CONTINUE-CLOUD-SKY.md',
    '- **当前共同显示候选：**',
    '- **当前混合显示支持：** [跨字段观测身份/共同coadd试验](evidence/experience-science-shared-observation-and-mixed-display-2026-10-03.md)核同run相邻字段重复CCD索引及实际校准/投影差异；未知cross-field协方差不猜0，沿现有原生边际模型求Cauchy条件上界，真实混合33²上一次处理有局部改善。不是完整置信、图质或普通采用；两个真实失败保留，修复只改task字段名/浮点控制。下一直接项由PLAN转到明确共享离线candidate、single/mosaic/partial及完整输出/成本，不改默认。\n\n- **当前共同显示候选：**')
replace(task/'CONTINUE-CLOUD-SKY.md','current-execution-state-2026-10-03-r16.json](evidence/current-execution-state-2026-10-03-r16.json)',
    'current-execution-state-2026-10-03-r17.json](evidence/current-execution-state-2026-10-03-r17.json)')
replace(root/'data-pipelines/deep-sky/README.md',
    'Exact cross-field\nobservation identity and covariance remain prerequisites for applying this\npath to mixed coadds.',
    'Actual cross-field observation identity and conditional noise bounds need\nexplicit handling in mixed coadds. Repeated same-run CCD samples are not\nindependent exposures, and field-specific calibrated variance estimates need\nnot be identical. A real mixed-area trial combines within-field shared-native\ndifference variances with a Cauchy upper across unknown field covariance. This\nis conditional on those marginal models, excludes omitted sky/systematic\nuncertainty, and does not certify confidence or ordinary adoption. See [shared\nobservation and actual mixed display](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-shared-observation-and-mixed-display-2026-10-03.md).')
replace(root/'project_context/architecture/runtime-and-domain.md',
    'Mixed-field display needs actual observation identity/covariance rather than independent per-field filtering joined at borders.',
    'Mixed-field display needs actual observation identity and explicit uncertainty rather than independent per-field filtering joined at borders. Same-run adjacent field rows refer to duplicated CCD observations under a relative 1361-row stride; calibration/projection/noise estimates can differ. A task-only real-coadd trial preserves unknown cross-field covariance via a Cauchy upper over within-field difference-variance models and filters the coadd once. This conditional upper excludes omitted native/sky/systematic/processing uncertainty and is not calibrated confidence or adoption. See [actual identity and mixed display](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-shared-observation-and-mixed-display-2026-10-03.md).')
replace(root/'project_context/external-capabilities.md',
    '单field条件noise不能覆盖混合coadd/滤后置信，尚未改生产显示/默认或出版，',
    '单field条件noise不能覆盖混合coadd/滤后置信；实际同run相邻字段是重复CCD数据但校准/投影/方差不全等，真实coadd一次共同过滤已用Cauchy条件上界保未知跨field协方差，仅供显式候选，不含遗漏sky/系统误差或质量/置信认证，见[身份与混合显示](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-shared-observation-and-mixed-display-2026-10-03.md)。尚未改生产显示/默认或出版，')
path=task/'scripts/capture-current-execution-2026-10-03.ps1'
replace(path,'  "$taskRoot/scripts/experience-science-noise-bilateral-2026-10-03.py",',
    '  "$taskRoot/scripts/experience-science-noise-bilateral-2026-10-03.py",\n  "$taskRoot/scripts/experience-science-shared-observation-2026-10-03.py",\n  "$taskRoot/scripts/experience-science-mixed-noise-display-2026-10-03.py",')
replace(path,"  'output/science-noise-bilateral-1003-r2/result.json',",
    "  'output/science-noise-bilateral-1003-r2/result.json',\n  'output/science-shared-observation-1003-r1/failed.json',\n  'output/science-shared-observation-1003-r2/result.json',\n  'output/science-mixed-noise-display-1003-r1/failed.json',\n  'output/science-mixed-noise-display-1003-r2/result.json',\n  \"$taskRoot/evidence/experience-science-shared-observation-and-mixed-display-2026-10-03.md\",")
text=path.read_text(encoding='utf-8')
start=text.index("    toolObserved='");end=text.index("'\n    build=",start)
text=text[:start]+"    toolObserved='Actual cached same-run adjacent fields share relative CCD indices at 1361-row stride, but calibrated values, linear projection coordinates and marginal variance estimates are not exact duplicates. Two runs/gri bounded native patches and existing target demands measured without repeating full matrices. Actual mixed-coadd common display uses spatial field weights and within-field shared-native covariance; conditional Cauchy upper retains unknown cross-field covariance, about 1.9604-1.9617 times wrong independent-field difference variance. Actual original frozen RGB exact, small mixed-area colour scatter lower; not full quality or omitted sky/systematic noise confidence. Task field-name error and floating exactness control error preserved in separate failed runs; corrected r2 runs completed with inputs and protected six unchanged. No production reader/display/science/weights/recipe/writer/publication/default changes, science downloads, installs, full reprocessing or DevTools restart. Prior Scene/source/native bounded evidence remains scoped; actual page/router/Back/time/native, full quality, cost/capacity and independent review remain open. Context/links/scoped whitespace checked by invoking turn."+text[end:]
start=text.index("    next='");end=text.index("'\n    preparedDefault=",start)
text=text[:start]+"    next='PLAN B: integrate explicit shared offline candidate ownership for common display/noise/contributor qualification, single/mosaic/partial, missing/zero-contributor/flagged recovery and bounded processing memory. Inspect full current master/LOD background/seams/compact and weak structures with source and processing cost before adoption. Conditional marginal-model upper is not full confidence; do not force field independence, hard-join field filters, loop sigma parameters or repeat unchanged PSF/flag/overlap/LOD/static/DevTools matrices. Default unadopted; actual page/Back/time/native, independent review and D production references/disk/whole-product cost/mixed capacity open."+text[end:]
path.write_text(text,encoding='utf-8',newline='')
print('updated current controlling owners and preserved two real failed task runs')
