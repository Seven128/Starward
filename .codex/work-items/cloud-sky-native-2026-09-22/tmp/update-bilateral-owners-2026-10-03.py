from pathlib import Path

root=Path(__file__).resolve().parents[4]
task=root/'.codex/work-items/cloud-sky-native-2026-09-22'

def replace(path,old,new):
    text=path.read_text(encoding='utf-8');assert text.count(old)==1,(path,old)
    path.write_text(text.replace(old,new),encoding='utf-8',newline='')

replace(task/'PLAN.md',
    '下一直接项沿已核三带资格和原生噪声边界选择有依据的共同显示小路径，先比较真实弱结构/颜色与失败恢复；不将局部noise模型直接冒全幅confidence/coadd权重，也不重复旧全幅PSF/flag/重叠矩阵；',
    '最新[共同噪声条件显示候选](evidence/experience-science-noise-bilateral-2026-10-03.md)复用成熟双边公式及既有依赖，一次固定共同三带权重实看真实旋臂/外围/紧凑源；修正NOTCHECKED误作坏像素的试验资格，仅重跑两个受影响区，INTERP/SATUR/CR保原，直接合并native系数核对pair协方差并检出忽略相关性的反例。强红蓝边控制不串色、局部色粒减轻，但棕色底/完整弱结构仍未验，不改生产recipe/default/版号。下一直接项先用现有跨field真实数据核共享观测/native身份与混合区噪声支持边界，决定候选能否进入完整共同显示/出版；不把单fieldσ覆盖coadd、不按field独立处理后硬切、不循环σ调参。若身份/协方差不足，保持原测量并保缺口，推进PLAN中独立的实际page/来源Back或D项；不凭猜测建全幅confidence/coadd权重，也不重复旧全幅PSF/flag/重叠矩阵；')
replace(task/'PLAN.md',
    '已有原生frame/CAS噪声owner/局部相关性只供有界量测，不供应完整coadd置信或普通显示采用。',
    '已有原生frame/CAS噪声owner与固定共同双边显示候选只取得有界局部证据；先核跨field共享观测/native身份及混合区noise边界，不能供应完整coadd置信或普通显示采用。')
replace(task/'CONTINUE-CLOUD-SKY.md',
    '- **当前原生噪声支持：**',
    '- **当前共同显示候选：** [真实三带双边小路径](evidence/experience-science-noise-bilateral-2026-10-03.md)一次固定权重保强色边控制、实际旋臂/外围有局部改善；NOTCHECKED试验资格错误已纠正，两个受影响区专属重跑、坏中心保原。直接native系数与pair协方差一致，忽略相关性mutation检出；没有生产显示/出版/默认变更。棕色底、完整弱结构/混合coadd支持与独审仍缺，下一直接项只由PLAN顶部控制，不循环参数或用单field噪声冒整图支持。\n\n- **当前原生噪声支持：**')
replace(task/'CONTINUE-CLOUD-SKY.md','current-execution-state-2026-10-03-r15.json](evidence/current-execution-state-2026-10-03-r15.json)',
    'current-execution-state-2026-10-03-r16.json](evidence/current-execution-state-2026-10-03-r16.json)')
replace(root/'data-pipelines/deep-sky/README.md',
    'quality adoption. See [actual native noise and correlation evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-native-noise-2026-10-03.md).',
    'quality adoption. See [actual native noise and correlation evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-native-noise-2026-10-03.md).\n\nA fixed task-only common gri bilateral display trial uses pairwise resampling\nvariance with shared-native covariance. fpM NOTCHECKED is object-detection\nstatus, not absent science or an automatic processing rejection; recorded\nSUBTRACTED does not authorize model restoration, alpha or weight changes.\nINTERP/SATUR/GHOST/CR and unavailable model support keep original measurements\nin this candidate. Local colour-grain improvement is not whole-field quality,\npost-filter confidence or a default publication decision. Exact cross-field\nobservation identity and covariance remain prerequisites for applying this\npath to mixed coadds. See [actual trial and qualification repair](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-noise-bilateral-2026-10-03.md).')
replace(root/'project_context/architecture/runtime-and-domain.md',
    'Existing projection, coadd and publication consumers remain unchanged. See [actual native noise boundary]',
    'Existing projection, coadd and publication consumers remain unchanged. A task-only common multiband display trial uses conditional pair covariance and preserves original values where model/processing support is unavailable; local improvement does not supply mixed-coadd or post-filter uncertainty. fpM NOTCHECKED is detection status, not absent measurement or an automatic processing rejection; SUBTRACTED does not justify guessed model restoration or reweighting. Mixed-field display needs actual observation identity/covariance rather than independent per-field filtering joined at borders. See [bounded display candidate and qualification repair](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-noise-bilateral-2026-10-03.md) and [actual native noise boundary]')
replace(root/'project_context/external-capabilities.md',
    '完整图质/独审与普通采用未闭合，见[发布/消费者证据]',
    '成熟共同双边公式的任务级适配已取得真实局部颜色/失败保原证据，NOTCHECKED检测状态不冒坏像素或missing，SUBTRACTED不猜模型复原；单field条件noise不能覆盖混合coadd/滤后置信，尚未改生产显示/默认或出版，见[共同显示试验](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-noise-bilateral-2026-10-03.md)。完整图质/独审与普通采用未闭合，见[发布/消费者证据]')
replace(task/'scripts/capture-current-execution-2026-10-03.ps1',
    '  "$taskRoot/scripts/experience-science-native-noise-2026-10-03.py",',
    '  "$taskRoot/scripts/experience-science-native-noise-2026-10-03.py",\n  "$taskRoot/scripts/experience-science-noise-bilateral-2026-10-03.py",')
replace(task/'scripts/capture-current-execution-2026-10-03.ps1',
    "  'output/science-native-noise-1003-r1/result.json',",
    "  'output/science-native-noise-1003-r1/result.json',\n  'output/science-noise-bilateral-1003-r1/result.json',\n  'output/science-noise-bilateral-1003-r2/result.json',\n  \"$taskRoot/evidence/experience-science-noise-bilateral-2026-10-03.md\",")
path=task/'scripts/capture-current-execution-2026-10-03.ps1'
text=path.read_text(encoding='utf-8')
start=text.index("    toolObserved='");end=text.index("'\n    build=",start)
text=text[:start]+"    toolObserved='A fixed task-only 5x5 common signed-gri bilateral display candidate binds actual frame/fpM/CAS/native noise and old frozen RGB. Five actual local patches recorded in r1; erroneous NOTCHECKED processing rejection kept one arm entirely unchanged. Corrected detection semantics and reran only two affected arms in r2; saturated/interpolated/CR centers retain original signed values and display bytes. Actual local colour scatter improves modestly, but brown floor and complete weak structures remain unresolved. Direct combined eight signed-native coefficients agree with pair covariance; ignoring shared noise is detected with up to 88.3/92.9 percent relative error at checked samples. Strong red/blue boundary, finite zero/negative and missing/unknown fallback controls pass. No production display/science/weight/recipe/publication/default changes, science requests, package installs, complete reprocessing, repeated PSF/flag/LOD/static/disk or DevTools matrix. Existing native noise and source/Scene bounded evidence remain under their exact runs; mixed-coadd covariance, actual router/page/Back/time/native, full quality and independent review still open. Context/links/scoped whitespace checked by invoking turn."+text[end:]
start=text.index("    next='");end=text.index("'\n    preparedDefault=",start)
text=text[:start]+"    next='PLAN B: use cached actual cross-field inputs to establish whether shared observation/native identity and mixed-area noise support are adequate for common display. Do not apply a single field sigma to a coadd, hard-join separately processed fields, ignore shared observations or loop filter parameters. Insufficient covariance/identity keeps original data and the gap; actual page/source Back or D references/disk/cost/capacity remain independent work. Candidate is not adopted; full quality and review remain open; no unchanged full PSF/flag/overlap/LOD/red/static/DevTools repetition."+text[end:]
text=text.replace("build='No new WEAPP build in this noise increment;", "build='No new WEAPP build in this task-only display increment;")
path.write_text(text,encoding='utf-8',newline='')
print('updated six owning documents/checkpoint script; no production science/display changed')
