"""Persist bright-SAT evidence and the single current next dependency."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def edit(p,old,new):
    s=p.read_text(encoding='utf-8');assert old in s,(str(p),old[:80]);p.write_text(s.replace(old,new,1),encoding='utf-8')
def new(p,v):
    assert not p.exists();p.write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
q1=ROOT/'output/sdss-bright-saturation-qualification-1003-r1';q2=ROOT/'output/sdss-bright-saturation-qualification-1003-r2';trial=ROOT/'output/sdss-bright-sat-colour-trial-1003-r1'
assert json.loads((trial/'readback/result.json').read_bytes())['selectedPixels']==58
new(q1/'assessment.json',{'result':bind(q1/'result.json'),'status':'SUPERSEDED_CONNECTED_REGION_SCOPE','reason':'Preliminary bright-only connected subset puts lower-brightness SAT pixels on the colour-supplying ring; not accepted as full-SAT connected-region qualification. Zero full rings is not no mature-method supply. r2 instead identifies complete SAT regions and only changes above-upper cores; no original r1 outputs rewritten.'})
new(q2/'task-attempt-failures.json',{'failures':[{'stage':'ephemeral connected-geometry JSON diagnostic','error':'NumPy int64 bounds were not JSON serializable; no output/product written.'},{'stage':'r2 task output suffix update','error':'Initial string replacement missed output/ prefix, exclusive mkdir refused existing r1; no r1 overwritten. Fixed task destination only.'}],'meaning':'Task adapter failures retained separately from actual r1/r2 qualification results; production/source/recipe unchanged.'})
new(trial/'assessment.json',{'trial':bind(trial/'result.json'),'readback':bind(trial/'readback/result.json'),
 'viewed':[bind(trial/'actual-sat-colour-pairs.png'),bind(trial/'overview-trial.png')],
 'status':'UNADOPTED_LOCAL_COLOUR_INTERPOLATION','reason':'Three qualified borders support58 actual bright-SAT display alternatives. Local centre colour changes, but low-brightness interpolated/green halos, warm background and fine grain remain. Touching-border colours are not true saturated-core colours or full quality. No shared production migration or ordinary adoption.','independentReview':'MISSING'})
p=TASK/'evidence/experience-sdss-bright-sat-colour-2026-10-03.md';assert not p.exists()
p.write_text('''# 全母图亮核饱和资格与一次成熟色比试验

2026-10-03，Goal active、无预算、未完成；固定工作区/分支/HEAD及六项保护保持。任务直接沿唯一PLAN共享完整图质依赖推进，复用旧science/fpM/projected flags、共同估计、另一扫描恢复和冻结recipe，不重新过滤/fit/下载/投影。没有新增库、生产owner、默认registry、出版、服务或DevTools重启；独审 **MISSING**。当前已知照片矩形FAILED/源不足、原生合成失败、Android/iOS与新版月面、容量未验均保持。

## 成熟处理边界与新的真实供应

重新核[Lupton原论文第III节](https://arxiv.org/html/astro-ph/0312483)：饱和核心的RGB色比可能失真，可用相邻像素平均颜色作显示处理；必须是真实SAT，且仅作用于强度高于映射上限的饱和像素，避免处理低亮度拖尾。这是邻域颜色插值，不供应新测光、PSF/时变或饱和核心真实颜色。原四个局部点未满足两条件的证据仍正确，但不能代替全母图；本次实际全图核新增60个符合SAT+亮度初门槛的样本。

[SDSS官方JPEG](https://www.sdss4.org/dr17/imaging/jpg-images-on-skyserver/)另含修改的多步转换；本次没有复制未知许可MATLAB或假称它提供完整参数。[LSST makeRGB API](https://pipelines.lsst.io/v/d_2026_08_31/api/lsst.afw.display.makeRGB.html)也把饱和处理与实际MaskedImage及边界参数相连，不能拿普通RGB的255作源SAT。未安装/采用/复制LSST代码；其API不是当前SDSS质量或可商业复制源码资格。当前任务从论文颜色定义独立使用已有NumPy/Astropy8.0.1及现有共享数值LOD owner。

当前固定recipe stretch0.6394959985261036/Q8的实际Astropy上限为60.765274967080025 nMgy/native-pixel。按该库伸展归一化解析反函数求得，并实际代库得到f(I)=1；不是把`sinh(Q)`盲套为同一实现，也没有调曲线。真实正贡献union SAT+joint为475样本，超过上限60样本，最大强度105.2559102376302；当前另一扫描恢复不覆盖这60点。

## 全SAT连通区域与资格修正

初轮[r1结果](../../../../output/sdss-bright-saturation-qualification-1003-r1/result.json)，13,596B/SHA `61a01ea9578b46991d987bb6ad709cb521a257149e3c0b21479682442719708e`，用仅超过上限的子集定义连通区域，触边还包含较暗SAT像素，得到0个完整合格ring。r1原数据/图保持；[独立评定](../../../../output/sdss-bright-saturation-qualification-1003-r1/assessment.json)明确范围不适合作完整SAT外边界供应，不能把0供应用作方法已否决。

[r2结果](../../../../output/sdss-bright-saturation-qualification-1003-r2/result.json)，43,181B/SHA `42aee0dd268f017cf3307cf641ee1eb5e676ef035781f4d3335a217348f0d739`：以完整实际SAT区域按8邻接识别连通，再选其超过上限的子集作为可替代核心；只用紧邻外边界，不扩大半径寻找任意颜色。连通选择与完整边界资格是本任务的明确策略，不假称论文规定所有离散细节。

| 源SAT区域XY范围 | 整SAT样本 | 高亮核心 | 触边合格/总数 | 结果 |
| --- | ---: | ---: | ---: | --- |
| [845,381,855,390) | 70 | 56 | 42/42 | 真实边界颜色可作显示试验 |
| [2016,634,2041,645) | 183 | 1 | 83/83 | 同上；较暗SAT拖尾不改 |
| [1189,1157,1199,1166) | 66 | 1 | 43/43 | 同上 |
| [453,1207,464,1217) | 82 | 2 | 44/48 | i带4个边界INTERP/CR等processing不合格，保原 |

资格继承原真实gri供应、processing PS_ID、fpM与现有CALIB/SKY/CAS采样支持；黑色/缺测/科学area仍分别处理。全部实际外围颜色也必须可定义（RGB和>0），有效黑不假称不存在，而是无法供应颜色插值。原18份处理身份与元数据packet仍保原pin。场内连通边界有实际处理资格不等于核心颜色恒定、真彩/全图质量。

## 一次真实显示色比试验及已查看结果

[任务试验](../../../../output/sdss-bright-sat-colour-trial-1003-r1/result.json)，14,624B/SHA `fa6dc9f994da65f001cf5ae83136e8fc80a743bd5ac47b0fe9d5d70d5b84a692`。对合格外边界逐样本计算原固定floating Lupton RGB，再以RGB总和归一化为色比、平均色比；把58个亮核心的旧共同强度乘该邻域色比，形成独立display-only估计。不平均边界亮度、不替换原科学值；这是来自真实邻域的颜色插值，**不是实测/恢复光子通量、感知luminance或原核心真实颜色**。

三个平均R/G/B色比为[0.558268,0.327524,0.114208]、[0.524758,0.354532,0.120709]和[0.382780,0.352156,0.265063]。高亮原floating RGB的max逐样本精确保持；旧共同强度在float32显示估计的表示误差内保持，最大差2.5431315151536182e-6。这个max控制不认证颜色结构、物理亮度或弱结构保真。

全部其他4,194,246像素与父估计逐值相同，较暗SAT拖尾与另两未合格亮核保原。三个新的PNG仍用现有signed共同均值→原冻结RGB数值owner，不反过来缩encoded RGB；OV/ MED/DETAIL仅9/1/1个输出RGB像素改变，alpha全部精确保持。版号仅`sdss-qualified-lupton-bright-sat-colour-trial-v1`，不接普通writer/registry或来源route。

实际查看[四个源区同尺度对照](../../../../output/sdss-bright-sat-colour-trial-1003-r1/actual-sat-colour-pairs.png)及[完整总览](../../../../output/sdss-bright-sat-colour-trial-1003-r1/overview-trial.png)：56像素亮区颜色被邻域替代，两处单像素核心改变很局部，绿色晕圈仍明显；第四处完全保原。暖底、细档颗粒/原插值色缺陷和单扫描弱结构未解决。没有以颜色更接近邻域宣称物理真彩或全图改善。

**决定：UNADOPTED_LOCAL_COLOUR_INTERPOLATION。** [评定](../../../../output/sdss-bright-sat-colour-trial-1003-r1/assessment.json)分开保存并绑定实际输出，未倒改原UNVERIFIED报告。此路径保留作局部显示候选，暂不迁入共享生产owner，不扩大SAT/强度门槛去修低亮度绿晕，也不把它当作背景/弱结构修复。

## 保存结果、失败与下一依赖

[保存数组/PNG读回](../../../../output/sdss-bright-sat-colour-trial-1003-r1/readback/result.json)用保存NPY、显式reshape/signed块求和与现有Astropy重新推导实际三个PNG，不重跑资格/原过滤；58 mask等于真实完整合格区域的高亮子集、其他值/原alpha精确、共同强度表示误差成立。有界单个保存估计copy mutation会改变实际RGB，检查不是空数据或旧结果无效通过。该另写数值读回是root自审，**不是独立审查**。

现有science/joint/几何权重/recipe、原noise/另一扫描candidate、旧publication/default和六项保护前后精确。试验根目录逻辑文件56,072,941B，不含readback子目录，不作物理磁盘/进程峰值、手机、用户请求时延或端云容量。fit/filter/科学source requests0；两次新的官方文档读取仅研究请求，不写成零网络。

[task失败记录](../../../../output/sdss-bright-saturation-qualification-1003-r2/task-attempt-failures.json)保临时probe的NumPy int64 JSON错误与一次r2路径替换没命中、排他mkdir拒绝已有r1；均未覆盖旧结果或改生产。r1范围资格修正属于真实发现，历史成功产物不改成r2，也不把r1错误范围的0完整ring当质量结论。

下一依赖仅由[PLAN](../PLAN.md)控制：完整背景/弱结构、低亮度插值/绿色晕圈和单扫描/配准仍需真实来源与成熟处理资格；不重复此完整亮核资格/58像素试验或旧完整过滤，不扫参数、二次扣sky/gain或扩大到无SAT低亮度。达到完整图质及来源信用/权利/加工说明条件后，才正式版化/批量出版/static/API/client/已绘source-route与成本/保留审查。Prepared/science普通registry继续空，目标runtime/独审和全产品容量义务不变。
''',encoding='utf-8')
paragraph='新增[完整亮核资格/成熟色比试验](evidence/experience-sdss-bright-sat-colour-2026-10-03.md)：完整母图有475个真实SAT、60个高于原映射上限，原四个局部点不封顶。完整SAT区域外边界三处合格，58亮核心作一次邻域色比显示试验，较暗拖尾/两处未合格亮核保原；原科学/alpha/recipe/父候选保持，实际三级保存推导成立。初轮bright-only连通范围不适合作外边界，r1保历史、r2修范围；不是零供应。实际对照仍有绿色晕圈/暖底/颗粒，局部试验未采用、不迁共享生产owner，不供应真实核心色/测光或整图弱结构。\n\n'
edit(TASK/'PLAN.md','下一直接项仍是完整候选质量：',paragraph+'下一直接项仍是完整候选质量：')
edit(TASK/'PLAN.md','处理整图背景/弱结构和flags支持边界；','处理整图背景/弱结构、低亮度插值/绿色晕圈和单扫描/flags支持边界；')
edit(TASK/'PLAN.md','不重复本次跨run矩阵、13k恢复或无变化完整过滤。','不重复本次跨run矩阵、13k恢复、完整SAT资格/58像素色比试验或无变化完整过滤。')
edit(TASK/'PLAN.md','下一步按真实源/处理资格处理完整色底/弱结构/单扫描/配准，','实际全图亮SAT资格与58样本邻域色比试验已有有限输出，绿色晕圈/背景仍在、不采用；不扩大亮核假设。下一步按真实源/处理资格处理完整色底/弱结构/单扫描/低亮度插值与配准，')
edit(TASK/'CONTINUE-CLOUD-SKY.md','- **当前共享共同显示候选：**','- '+paragraph.strip()+'\n\n- **当前共享共同显示候选：**')
edit(TASK/'CONTINUE-CLOUD-SKY.md','[current-execution-state-2026-10-03-r23.json](evidence/current-execution-state-2026-10-03-r23.json)','[current-execution-state-2026-10-03-r24.json](evidence/current-execution-state-2026-10-03-r24.json)')
ref='../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-bright-sat-colour-2026-10-03.md'
text=f'''A full-master bright-SAT qualification now finds60 actual saturated samples above the frozen Astropy intensity upper, beyond the earlier four local samples. Complete SAT-region touching-border qualification supports a task-only58-sample neighbour-colour display trial; low-brightness trails and unqualified cores retain the parent. Original science, alpha and frozen recipe remain unchanged; the resulting display estimates are not photometry or actual core colour. Initial bright-only region connectivity did not establish complete SAT outer borders and is superseded explicitly, not a no-supply conclusion. Saved signed-means/RGB level derivation is exact, but actual green halos, warm background and fine grain remain. No shared production owner or ordinary adoption follows; do not broaden the bright-core rule to low-brightness/no-SAT defects. See [actual full-SAT qualification and local trial]({ref}).

'''
edit(ROOT/'project_context/architecture/runtime-and-domain.md','Target resource ownership has three distinct layers:',text+'Target resource ownership has three distinct layers:')
edit(ROOT/'data-pipelines/deep-sky/README.md','Use the existing pinned offline requirements and cached inputs; these owners\n',text+'Use the existing pinned offline requirements and cached inputs; these owners\n')
text='**完整亮核处理资格（2026-10-03，未采用）：** 原四个点不代表完整母图。全图475真实SAT中60高于冻结Astropy映射上限；按完整SAT连通区域的真实外边界资格，三处支持58高亮样本的一次邻域色比显示试验，较暗拖尾和另两亮核保原。初轮bright-only连通范围记录保留并明确被r2完整边界取代，不把0完整ring当无供应。数学来自Lupton公开描述，复用已有NumPy/Astropy与共同数值LOD，无新LSST/MATLAB代码/依赖采用；不把显示估计当核心实测色/测光。实际局部/总览仍有绿晕/暖底/颗粒，未迁生产/未采用，不扩大门槛修无依据低亮缺陷。完整来源/图质/独审仍开放。见[真实资格与试验](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-bright-sat-colour-2026-10-03.md)。\n\n'
edit(ROOT/'project_context/external-capabilities.md','**M51 原科学输入候选（2026-10-03，未采用）：**',text+'**M51 原科学输入候选（2026-10-03，未采用）：**')
# Keep the checkpoint concrete and pinned to current scripts and actual outputs.
p=TASK/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8');names=['experience-sdss-bright-saturation-qualification-2026-10-03.py','experience-sdss-bright-sat-colour-2026-10-03.py','readback-sdss-bright-sat-colour-2026-10-03.py','record-bright-sat-continuity-2026-10-03.py']
s=s.replace('$sources = @(\n','$sources = @(\n'+''.join('  "$taskRoot/scripts/'+f+'",\n' for f in names),1)
results=[(TASK/'evidence/experience-sdss-bright-sat-colour-2026-10-03.md').relative_to(ROOT).as_posix()]
results.extend(f.relative_to(ROOT).as_posix() for folder in (q1,q2,trial) for f in folder.rglob('*') if f.is_file())
s=s.replace('$results = @(\n','$results = @(\n'+''.join("  '"+f+"',\n" for f in results),1)
old=next(row for row in s.splitlines() if '    toolObserved=' in row)
new_line="    toolObserved='New full-master mature-paper bright-SAT qualification finds475 actual SAT/60 above original frozen Astropy intensity upper. Earlier four local points did not supply this whole-image result. Preliminary bright-only connected borders wrongly include lower-brightness SAT in the ring; r1 is superseded explicitly, not used as zero supply. Complete SAT connected regions support58 cores with qualified42/83/43 touching samples;2 bright cores keep original due to flagged i border. One task-only actual normalized-neighbour-colour trial preserves floating maxRGB and common intensity within float32 representation error, all other4,194,246 pixels and low-brightness trails, original science/area/weights/frozen recipe/parent candidates/old publications/default and six protected files exact. Three actual saved PNGs independently derive from signed saved-estimate means then frozen RGB; alpha exact, output RGB changes9/1/1. Actual local pairs/overview viewed: centre colour changes but green halos, warm background and fine grain remain, unadopted and not migrated to shared production. No new dependencies/LSST or unknown MATLAB code. No original filter/fit/source-image requests; official document reads are research traffic. Task probe JSON/output-suffix failures retained without overwriting old results. Original r1/r2 source qualifications, current guard boundaries and prior45 tests retain their actual conditions; no new production code changes or same-suite repeats. Source/saved-output readback is root self-review, not independent review. Whole-image background/weak structure/low-brightness interpolation/single-scan/full registration/source rights-credit/publication and native/whole-product capacity remain open. Context/links/scoped whitespace checked by invoking turn.'"
s=s.replace(old,new_line)
old=next(row for row in s.splitlines() if '    next=' in row)
s=s.replace(old,"    next='PLAN B: mature bright-SAT local colour trial remains unadopted; green halos/background/fine grain unresolved. Continue actual source/mature processing qualification for whole-image background/weak structure/low-brightness interpolation/single-scan and complete registration. Do not repeat full-SAT qualification/58-core trial, cross-run matrix/13k recovery/unchanged full filter/empty centre queries or gamma/sigma/gain sweeps. Do not broaden saturation repair to no-SAT or low-intensity defects. After complete quality and source rights/credit/processing review connect formal new version/batch/static/API/client/source-route/retention-cost. Actual router Back/public time/native/independent review and D production references/physical disk/whole-product cost/mixed capacity remain open.'")
s=s.replace("results = [", "results = [")
p.write_text(s,encoding='utf-8');print(json.dumps({'evidence':bind(TASK/'evidence/experience-sdss-bright-sat-colour-2026-10-03.md'),'assessment':bind(trial/'assessment.json'),'newEvidencePins':len(results)}))
