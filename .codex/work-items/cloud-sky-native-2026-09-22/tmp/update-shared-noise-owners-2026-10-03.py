from pathlib import Path

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
EVIDENCE='experience-shared-noise-display-development-2026-10-03.md'


def replace_once(path,old,new):
    text=path.read_text(encoding='utf-8')
    assert text.count(old)==1,(path,old[:80])
    path.write_text(text.replace(old,new),encoding='utf-8',newline='\n')


plan=TASK/'PLAN.md';text=plan.read_text(encoding='utf-8')
start=text.index('**唯一下一依赖（2026-10-03执行后）：**')
end=text.index('\n\n审查依据',start)
text=text[:start]+f'''**唯一下一依赖（2026-10-03执行后）：** B 的共享离线共同显示候选已实现并消费原六 field/18 frame、fpM/CAS、2048²科学coadd和冻结recipe；single/mosaic/partial、未知/零贡献/flags保原、取消及有界真实halo有开发证据。完整母图已处理、三个实际层级和边界/旋臂对照已查看；98,393样本原值保持，原科学与旧v3出口像素保持。实际离线205.24秒、Python峰值working set 1,065,402,368B，新候选55,974,816B逻辑字节；不作手机/服务/生产容量或物理保留结论。见[共享候选与完整输出](evidence/{EVIDENCE})。不重复旧局部试验/PSF/flag/重叠矩阵或无变化完整加工。

下一直接项是完整候选质量与版本加工来源/批量出版链：依据已保存结果处理棕色底、标记源周边/处理边界、完整弱结构/覆盖与配准证据；把真实frame/CAS/fpM关联、条件noise与遗漏误差、原科学/显示估计区别保到新的可审查加工来源合同，再接批量出版/静态出口与加工、旧版保留成本。当前candidate收据还不是完整可采用出版合同。三带共同一次过滤与共享native协方差/Cauchy条件上界保持；不猜跨field独立，不按field过滤硬切、不二次扣sky/无据改gain、不开sigma参数循环。普通science/Prepared registry仍空，原encoded/v2/v3合同和default保持；图质/来源/完整链/独审前不采用。M51照片矩形仍FAILED，M82 OV/MED完整源仍不足，HST完整输入只在背景/权益依据成立后获取。

A受控page/Scene冷暖、全景/地景、选中失败保粗、图层/时间/跟踪、来源遮挡/hide与返回资源已开发核对，实际router Back/公共时间UI/native仍缺；无新根因不重复DevTools启动或R5矩阵。新版fixed partial/完整joint冻结recipe publication已有各自当前Scene/软件GPU像素、来源HTTP/cache/action/Source与下载清单有界链，不能外推整页/native或新共同显示候选。D真实生产mount/receipt/回滚/备份引用、物理磁盘/全产品成本与10/20混合冷进入可独立推进，不重复旧dry-run、相同HTTP/库存。新增量独审MISSING。完整交互、图质、Android/iOS/新版月面、包体与200DAU全产品容量仍属于同一未完成Goal；预期配置并未部署或验收。'''+text[end:]
old='已有原生frame/CAS噪声owner与固定共同双边显示候选只取得有界局部证据；跨field重复身份/差异与Cauchy条件上界已在实际混合区开发核对，下一步显式shared候选/single/mosaic/partial及完整质量与成本，不能供应完整coadd置信或普通显示采用。'
new='原生frame/CAS噪声与跨field身份/Cauchy条件上界已进入显式shared display candidate，single/mosaic/partial/保原/取消/有界内存与实际完整母图/LOD已开发读回。下一步处理现存色底/标记边界/弱结构与配准证据、完整版本加工来源/批量出版及成本，不能供应完整coadd置信或普通显示采用。'
assert text.count(old)==1;text=text.replace(old,new)
plan.write_text(text,encoding='utf-8',newline='\n')

entry=TASK/'CONTINUE-CLOUD-SKY.md';text=entry.read_text(encoding='utf-8')
start=text.index('- **当前混合显示支持：**');end=text.index('\n',start)
text=text[:start]+f'- **当前共享共同显示候选：** [共享owner/完整母图开发](evidence/{EVIDENCE})已将原局部与混合算法迁入`sdss_noise_display.py`，single/mosaic/partial/保原/取消、有界halo及旧消费者兼容已开发。原六field/18frame、fpM/CAS实际2048²coadd一次处理，三层/边界对照已查看；原科学/权重/recipe与v3旧出口保持，显示estimate有独立candidate版号、不进普通registry。棕色底、标记边界/弱结构、完整配准/来源出版/成本/独审仍缺，唯一下一依赖见PLAN。前期[身份与混合区](evidence/experience-science-shared-observation-and-mixed-display-2026-10-03.md)保原适用范围与失败，不再驱动旧下一步。'+text[end:]
text=text.replace('current-execution-state-2026-10-03-r17.json','current-execution-state-2026-10-03-r18.json')
entry.write_text(text,encoding='utf-8',newline='\n')

runtime=ROOT/'project_context/architecture/runtime-and-domain.md';text=runtime.read_text(encoding='utf-8')
old='Existing projection, coadd and publication consumers remain unchanged. A task-only common multiband display trial uses conditional pair covariance and preserves original values where model/processing support is unavailable; local improvement does not supply mixed-coadd or post-filter uncertainty.'
new='Existing projection, coadd, scientific measurements and publication/default paths remain unchanged. The downstream `data-pipelines/deep-sky/sdss_noise_display.py` now owns explicitly requested common-gri display candidates across single/mosaic/partial inputs; it binds source receipts, camera/processing identity, actual projected/coadd values and positive contributor support. Missing noise/flags or rejected processing keep original values, zero contributions are neutral, true halo bounds working stencils, and cancellation returns no partial candidate. The candidate preserves science availability and frozen display parameters, uses a separate processing version and never labels display estimates as new scientific measurements. `sdss_gri_tan.coherent_box_means` is the shared numerical mean/count owner for scientific and display-estimate pyramids; consumers retain their distinct measurement meaning. Local improvement does not supply post-filter uncertainty or quality adoption.'
assert text.count(old)==1;text=text.replace(old,new)
old='A task-only real-coadd trial preserves unknown cross-field covariance via a Cauchy upper over within-field difference-variance models and filters the coadd once.'
new='The shared candidate preserves unknown cross-field covariance via a Cauchy upper over within-field difference-variance models and filters the actual coadd once; earlier task-only consumers now use these same numerical responsibilities.'
assert text.count(old)==1;text=text.replace(old,new)
old='See [actual identity and mixed display]'
new=f'Complete cached-master development and old v3 pixel compatibility were read back; colour/background, full registration/weak structure, complete processing provenance/publication, batch cost and independent review remain open. Current candidate receipts are not an adopted publication contract. See [shared display owner and actual whole output](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/{EVIDENCE}). See [actual identity and mixed display]'
assert text.count(old)==1;text=text.replace(old,new)
runtime.write_text(text,encoding='utf-8',newline='\n')

external=ROOT/'project_context/external-capabilities.md'
old='尚未改生产显示/默认或出版，见[共同显示试验]'
new=f'共同显示已进入显式共享离线candidate owner，single/mosaic/partial、保原/取消与完整当前2048²母图/三层已开发；旧科学/recipe/v3出口和普通default保持。估计不是科学修正或新测量；候选收据尚非完整出版来源合同，颜色/弱结构/配准/批量加工成本与独审仍缺，见[共享候选完整输出](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/{EVIDENCE})。前期局部结果见[共同显示试验]'
replace_once(external,old,new)

readme=ROOT/'data-pipelines/deep-sky/README.md'
replace_once(readme,'A fixed task-only common gri bilateral display trial uses pairwise resampling','The earlier fixed task-only common gri bilateral display trial used pairwise resampling')
old='Use the existing pinned offline requirements and cached inputs; these owners'
new=f'''`sdss_noise_display.py` now owns the explicit offline common-gri display
candidate for single/mosaic/partial sources. The earlier local/mixed scripts use
its same pair-variance, Cauchy-upper and filtering responsibilities. Admission
binds actual frame receipts, camera/PS_ID, fpM identity, positive contributors,
projected samples and original coadd values. Unknown/rejected processing keeps
original values; zero contributions are neutral. A fixed single pass consumes
real halo chunks, and cancellation returns no partial candidate. Science
availability and area alpha remain separate from processability.

`coherent_box_means` is the shared numerical mean/count owner; scientific and
display-estimate consumers retain different meanings. Candidate arrays are
display-only estimates in source units, not new measurements, photometry or
surface brightness. `noise_display_pyramid` uses the original frozen transfer
with no fit and original coherent area alpha; `save_noise_display_candidate`
writes an exclusive versioned candidate directory, never the old publisher or
default registry. Complete cached-master output and old v3 PNG compatibility
were checked. Full colour/background/weak structure/registration, processing
provenance publication, batch cost and independent review remain open. Current
candidate receipts do not replace a complete adopted publication contract.
See [shared candidate and actual full output](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/{EVIDENCE}).

Use the existing pinned offline requirements and cached inputs; these owners'''
replace_once(readme,old,new)
