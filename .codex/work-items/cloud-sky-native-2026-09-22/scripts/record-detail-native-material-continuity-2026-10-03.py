"""Carry image-selected native material and geometry limits forward."""
from pathlib import Path
import hashlib,json,ctypes

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
O=ROOT/'output/center-native-detections-1003-r2';M=ROOT/'output/detail-native-model-support-1003-r1'
name='experience-native-compact-center-material-2026-10-03.md'
def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def edit(p,old,new):
    s=p.read_text(encoding='utf-8');assert old in s,(str(p),old[:80]);p.write_text(s.replace(old,new,1),encoding='utf-8',newline='\n')
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2);f.write('\n')
r=json.loads((O/'result.json').read_bytes());m=json.loads((M/'result.json').read_bytes());rb=json.loads((M/'readback-r2/result.json').read_bytes())
allocation=ctypes.windll.kernel32.GetCompressedFileSizeW
allocation.argtypes=[ctypes.c_wchar_p,ctypes.POINTER(ctypes.c_uint32)];allocation.restype=ctypes.c_uint32
inventory=[]
for folder in ('center-native-detections-1003-r1','center-native-detections-1003-r2','detail-native-model-support-1003-r1'):
    directory=(ROOT/'output'/folder).resolve();assert directory.is_relative_to((ROOT/'output').resolve())
    files=[]
    for p in sorted(directory.rglob('*')):
        if p.is_file():
            high=ctypes.c_uint32();low=allocation(str(p),ctypes.byref(high))
            assert low!=0xffffffff
            files.append({'path':p.relative_to(ROOT).as_posix(),'logicalBytes':p.stat().st_size,'windowsAllocatedBytes':(high.value<<32)|low})
    inventory.append({'folder':folder,'files':len(files),'logicalBytes':sum(v['logicalBytes'] for v in files),
                      'windowsAllocatedBytes':sum(v['windowsAllocatedBytes'] for v in files),'items':files})
save(M/'readback-r2/owned-output-allocation.json',{'groups':inventory,'scope':'Only three new task-owned trees, including failed partial stage. Windows allocation is not Linux retention/capacity; no cleanup.'})
save(M/'readback-r2/visual-self-review.json',{'review':'ROOT_SELF_REVIEW_NOT_INDEPENDENT_ACCEPTANCE',
    'viewedSheets':[bind(M/f'actual-native-model-residuals-{i}.png') for i in (1,3,6)],
    'observations':['Native compact peaks exist with real measured extended galaxy structure and nonuniform local background.',
                    'Some comparatively isolated profiles broadly match a point model; many candidates remain extended/blended or leave core/structural residuals.',
                    '43 center-bound fits explicitly retained; converged fits and image selection do not certify stars or model/PSF truth.'],
    'all87VisualReview':False,'qualityAcceptance':'NOT_PASSED','independentReview':'MISSING','adopted':False})
table='\n'.join('| '+v['folder']+' | '+str(v['files'])+' | '+str(v['logicalBytes'])+' | '+str(v['windowsAllocatedBytes'])+' |' for v in inventory)
text=f'''# 目录空字段的真实紧凑源材料与中心覆盖纠正

本轮沿当前完整候选质量的PSF/弱结构材料缺口；全部使用既有18帧中的6帧、2份psField、6份fpM、原CAS模型和当前冻结候选。无科学下载/目录重查、旧45fit或旧17×17/15孔径/九边/跨run矩阵重跑；未改科学、coadd/权重、recipe、alpha、任何旧publication或普通registry。Goal active无预算；本轮只增task diagnostics，不改生产源码/依赖或服务watch，六保护保持。

## 原查询空表不是原生缺源，编号也不是中心覆盖

[原目录](experience-sdss-measured-star-registration-2026-10-03.md)在3699/100与3716/117未供应记录，放开clean/nChild的补查询也为空；原Field score0/photoStatus3/TOO_LONG风险早已由[Field独审](experience-sdss-field-quality-independent-review-2026-10-02.md)记录，**不是本轮重新发现**，未重查询。仅凭表空不认证原生无点源。

首轮[原生检测任务](../scripts/experience-center-native-detections-2026-10-03.py)错误假设两帧都包含M51中心，3699/100三带完成后在3716/117 reference几何断言失败。[r1失败](../../../../output/center-native-detections-1003-r1/failed.json)、原input/code及部分NPZ保存；失败前候选metadata尚未逐带持久化，故不把这些部分cut当完整位置绑定/资格完成，未回填或删除。r2参考**实际native frame中心**初始化宽度，并逐带先写完整位置/cut/noise/flag报告，再完成共同对应。

实际M51中心映到3699/100 g/r/i的native坐标约[1710.280,783.263]/[1708.809,771.023]/[1710.646,773.471]，均在2048×1489原生帧内；3716/117约[-221.752,1023.238]/[-222.972,1010.463]/[-220.108,1013.562]，均在帧外。它参与目标的有限区域，但**不供应M51中心**。此前“两个中心字段”的编号简称不能用于覆盖/中心PSF结论；旧snapshot/科学/数据/已核贡献保持。这是真实逐带primary-TAN声明下的几何结果，不是外部绝对天体测量认证。

## 成熟检测与真实材料

复用隔离Photutils3.0.0/SciPy1.17.1与原NumPy/Astropy，不再次安装/改产品依赖。[fit_fwhm](https://photutils.readthedocs.io/en/stable/api/photutils.psf.fit_fwhm.html)只拟空间PSF kernel中心11²的近似圆Gaussian，得到检测初始化宽度；不是实测FWHM、PSFmatching目标或全场常宽认证。[DAOStarFinder](https://photutils.readthedocs.io/en/stable/api/photutils.detection.DAOStarFinder.html)沿原已扣sky的signed科学，以5倍逐像素conditional native RMS、默认shape条件和内部kernel threshold scaling寻找候选，`n_brightest=None`保全部结果，无数量上限。门槛/候选不是校准置信或完整率；没有根据RMS再次扣sky/改变gain。

variance由现有noise owner每128原生行有界计算；actual INTERP/SATUR/GHOST/CR和未知模型拒绝。完整检测kernel footprint须原生finite/positive conditional variance/flags合格，用binary erosion拒不完整支持及图边；检测workbuffer的不可用值置零仅供库内部运算，不能被候选kernel跨入，不形成科学/透明度填补。每个目标内cut保存41²原始signed science/variance/flags/精确native bounds和分数坐标；共同候选还要求radius12原生全支持及g/i与r同目标网格2.5pix内双向唯一对应。该窗口只是诊断约1角秒范围，不是DCR/配准验收。

[r2任务](../scripts/experience-center-native-detections-r2-2026-10-03.py)实际六带检测量712/531/352与416/449/425；目标内保存683/488/304与319/325/290；radius12合格659/466/273与237/275/287。共同275组（184/91）是真实image-selected compact候选，**不是275恒星/独立曝光或“中心PSF通过”**，含星系结/混叠/伪影的可能性保留。[完整result](../../../../output/center-native-detections-1003-r2/result.json) {bind(O/'result.json')['bytes']:,}B，SHA `{bind(O/'result.json')['sha256']}`；18.389秒本机cache读取/检测/保存，不作服务/手机成本。actual源/当前3PNG/六保护before-after exact。known Gaussian detector初始化/位置算术控制成立，不是生成天体。

## 当前DETAIL实际对应

以**实际当前DETAIL bounds[768,768,1280,1280]**消费全部87组（3699/100为81、3716/117为6），没有亮度排序删样或数量cap。只读已保存cut和两psField，未重读6帧/检测/重投影。[既有成熟中心helper](../scripts/experience-sdss-imagepsf-centering-2026-10-03.py)原样复用ImagePSF+Planar2D/TRF；每个新实际坐标reconstruct完整signed51kernel，radius12 conditional weights，4参数linear初始化后6参数局部拟合，中心±0.5/native cell、max100评估。诊断plane/中心不会作用于科学、星系背景或WCS。

[实际消费](../scripts/experience-detail-native-model-support-2026-10-03.py)产生261正常有限拟合，但43个center-bound状态保留；实际χ²/dof的g/r/i median18.092/13.762/7.310，max472.077/914.082/959.119。这是含未知blend/source/PSF/SKY/systematic/centroid误差的条件描述，不是拒整个native帧的校准检验，也不以收敛冒真值。5.074秒本机后续诊断；[result](../../../../output/detail-native-model-support-1003-r1/result.json) {bind(M/'result.json')['bytes']:,}B，SHA `{bind(M/'result.json')['sha256']}`。

实际已查看6张分页图中的第[1](../../../../output/detail-native-model-support-1003-r1/actual-native-model-residuals-1.png)、[3](../../../../output/detail-native-model-support-1003-r1/actual-native-model-residuals-3.png)、[6](../../../../output/detail-native-model-support-1003-r1/actual-native-model-residuals-6.png)，native/model/residual和各带分别标注。若干较孤立轮廓 broadly对应，但许多cut有真实extended/混叠和非线性背景，残差结构明显，不能把全部候选用于经验starPSF或原地反卷积。[root self review](../../../../output/detail-native-model-support-1003-r1/readback-r2/visual-self-review.json)明确只查看39/87行，非全样本独审/质量通过。

[另一算术路径读回](../scripts/readback-detail-native-material-r2-2026-10-03.py)不导入producer/ImagePSF/helper、不重跑detector/optimizer/frame；逐cut核位置/support/noise/四类flags、row-first spline模板/模型/residual、normal-equation初始化和条件统计。261保存结果通过，模型最大差5.684e-14，wrong-kernel-axis最大模型差6.119，缺support guard控制拒未知邻居。当前87个fit域实际negative计数0，**不声称本数据验证了负值场景**；原saved cut保浮点类型/原值。首轮readback套旧5e-17绝对常数，一处两轴运算序差5.551e-17失败；[原failure](../../../../output/detail-native-model-support-1003-r1/readback/failed.json)保持。r2据float64 epsilon及实际signed normalized kernel幅值给8倍roundoff bound，全部最大模板差8.327e-17；不改输入/model或放宽科学/质量oracle。[r2结果](../../../../output/detail-native-model-support-1003-r1/readback-r2/result.json) SHA `{bind(M/'readback-r2/result.json')['sha256']}`；root另一算术路径非独立人员审查。

## 新工作盘与下一依赖

只核三处task-owned新目录（包括r1失败部分）；[本机文件分配记录](../../../../output/detail-native-model-support-1003-r1/readback-r2/owned-output-allocation.json)：

| 目录 | 文件数 | logical B | Windows allocation B |
| --- | --- | --- | --- |
{table}

该记录先于其自身/visual-self-review/document写入，范围和时间明确；不计旧源、全tool目录/完整库存，不当Linux180GB或200DAU容量、生产预算。失败部分仅development保留，无生产引用/未清理；不能以当前成功目录代全部本轮磁盘成本。

**当前决定/唯一下一依赖：** 中心可用原生image材料不再只是“未供应目录”，但不能从这些混合候选直接做全图PSFmatching。下一项先沿既有真实source stencil/WCS/几何权重，核**原生空间模型经过实际重采样及coadd后的目标网格响应**的小路径，区别单native模型、单扫描/重复native贡献、共同目标模型和实际保存coadd；全场matching/经验star分类、扩展DCR/绝对配准/未包含误差仍不足。不得重跑当前275检测/261fit、旧目录/45fit/孔径/九边/供应/861秒母图以循环补证。已有原source/模型与成熟处理责任优先，不凭样本/conditional拟合造星或取固定σ。完整背景/绿色晕圈/弱结构/覆盖仍需真实支持与显示边界处理，任何新加工须作用于当前完整候选并保original science/alpha/frozen recipe和失败保原。

质量/来源权利/加工说明/独审前不普通采用或新正式出版；本代旧processing packet不倒填新材料。HST矩形FAILED、M82输入不足、DevTools FAILED_DEVTOOLS、Android/iOS/新版月面/实际page Back、版本保留与200DAU混合成本/容量保持原未完成状态。
'''
with (TASK/'evidence'/name).open('x',encoding='utf-8') as f:f.write(text)
paragraph=('新增[原生紧凑候选/实际中心材料](evidence/'+name+')：复用六缓存frame/两psField及成熟Photutils，无目录重查。'
 '原3716/117实际不覆盖M51中心，编号中间不当中心PSF；r1错误reference假设保失败，r2按native中心初始化并逐带持久化。'
 '保存275共同image候选，全部87当前DETAIL候选/261native诊断由原mature helper消费；43center-bound、extended/blend及高残差保原，不能认证恒星/模型真值或matching。'
 '三分页actual已查看、保存坐标/flag/noise/spline/model及normal-equation读回通过，float64两轴roundoff首轮常数失败保留。'
 'science/当前候选/六保护保持、无生产代码改动/采用；新源与工作盘包含失败部分单列，不冒总体容量。\n\n')
p=TASK/'PLAN.md';s=p.read_text(encoding='utf-8');old=next(x for x in s.splitlines() if x.startswith('下一直接项回到当前完整候选的'))
new=('下一直接项仍是当前完整候选质量：已有真实image材料补原目录空缺，但混合candidate不认证恒星/真PSF。'
 '先沿既有source stencil/WCS/实际几何权重核原生空间PSF模型经过真实重采样/coadd后的目标网格响应小路径，分清原生与目标、单扫描/重复native与混合贡献，足够材料才决定图质加工。'
 '保extended/blend、43center-bound、系统/sky/模型误差及full DCR/绝对配准缺口，不从conditional统计批准全图matching/shift/扣sky/gain。'
 '不重复275检测/261新fit/旧目录45fit/15孔径/跨run矩阵/九边/13323供应或861秒整幅；完整背景/绿晕/弱结构/coverage仍按真实来源/显示语义处理，任何新加工需接当前完整候选并保原科学/alpha/冻结recipe/失败恢复。'
 '本代加工来源packet已有离线开发，质量与来源权利/信用/加工说明、必要独审可审查后才接新版正式合同/批量出版/static/API/client/source-route Back和保留成本。'
 '普通science/Prepared registry空；HST矩形FAILED/M82缺完整输入、实际page/native/Android/iOS/总资源和200DAU混合容量义务不缩减。')
edit(p,old,paragraph+new)
edit(TASK/'CONTINUE-CLOUD-SKY.md','## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作')
edit(TASK/'CONTINUE-CLOUD-SKY.md','current-execution-state-2026-10-03-r34.json','current-execution-state-2026-10-03-r35.json')
edit(ROOT/'project_context/external-capabilities.md','两个中心field的补查空表及旧TOO_LONG风险不当科学零/原frame必坏。',
 '两处原查询空表字段的补查及旧TOO_LONG风险不当科学零/原frame必坏；其中3716/117按当前实际native几何不供应M51中心，不能按编号中间当中心覆盖。')
edit(ROOT/'project_context/external-capabilities.md','中心和目标coadd模型仍缺；不重复旧查询/fit或无据参数循环。',
 '目录空字段已有原生影像候选和当前DETAIL实际模型对照：成熟检测保完整真实支持，275共同候选/87DETAIL中多有extended/blend，43拟合中心达到边界；未认证恒星/全场模型。原生模型不供真实重采样/coadd后的目标PSF，先核该实际响应责任，不重复当前检测/fit或无据参数循环，见[原生材料与几何边界](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+')。')
edit(ROOT/'data-pipelines/deep-sky/README.md','Remaining bright-core residuals and absent central/extended/coadded target PSF keep full matching and quality unadopted.',
 'Remaining bright-core residuals and unverified central/extended/coadded target PSF keep full matching and quality unadopted. New native image candidates in the catalog-empty fields provide actual material, but include extended/blended structure and bounded-center failures. Field3716/117 does not cover the M51 centre in the actual native WCS. Native models must be distinguished from their actual resampling/coadd response before any matching; candidate counts or convergence do not certify stars. See [new native material](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+').')
p=TASK/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8')
scripts=('experience-center-native-detections-2026-10-03.py','experience-center-native-detections-r2-2026-10-03.py',
         'experience-detail-native-model-support-2026-10-03.py','readback-detail-native-material-2026-10-03.py',
         'readback-detail-native-material-r2-2026-10-03.py','record-detail-native-material-continuity-2026-10-03.py')
s=s.replace('$sources = @(\n','$sources = @(\n'+''.join('  "$taskRoot/scripts/'+v+'",\n' for v in scripts),1)
files=('center-native-detections-1003-r1/failed.json','center-native-detections-1003-r1/inputs-before.json','center-native-detections-1003-r1/executed-script.py',
       'center-native-detections-1003-r2/result.json','center-native-detections-1003-r2/inputs-before.json','center-native-detections-1003-r2/inputs-after.json',
       'detail-native-model-support-1003-r1/result.json','detail-native-model-support-1003-r1/inputs-before.json','detail-native-model-support-1003-r1/inputs-after.json',
       'detail-native-model-support-1003-r1/readback/failed.json','detail-native-model-support-1003-r1/readback-r2/result.json',
       'detail-native-model-support-1003-r1/readback-r2/visual-self-review.json','detail-native-model-support-1003-r1/readback-r2/owned-output-allocation.json')
s=s.replace('$results = @(\n','$results = @(\n  "$taskRoot/evidence/'+name+'",\n'+''.join("  'output/"+v+"',\n" for v in files),1)
lines=s.splitlines()
for i,line in enumerate(lines):
    if line.strip().startswith("toolObserved='"):
        lines[i]="    toolObserved='Actual native image detection on original6 centre-catalogue-empty frames yields275 common compact candidates; not certified stars. Field3716/117 does not cover M51 centre, r1 reference assumption failed and retained, r2 native-centre initialization and per-band saved metadata succeed. All87 new candidates in actual DETAIL yield261 conditional native PSF+plane fits,43 center bounds retained; high/structured residuals and blend/extended candidates remain. Root viewed3 of6 sheets, not full visual acceptance. Independent saved coordinate/noise/flag/spline/model/normal-equation readback passes; first fixed tolerance5e-17 roundoff failure retained, r2 float64 epsilon/actual kernel-bound comparison max8.327e-17. No source queries/downloads/old45fits/frame reprojection/image correction/production code or dependency change. Original candidate/alpha/recipe/source/protected bytes exact. New owned output allocation includes failed partial stage; not full inventory/Linux/200DAU capacity. Quality UNVERIFIED/independent review MISSING/ordinary unadopted.'"
    if line.strip().startswith("next='"):
        lines[i]="    next='PLAN B: actual source model response through native stencils/WCS/geometric-weight reprojection and coaddition, before unsupported global PSF matching. New275 image candidates/87DETAIL fits are not star classification/model truth; preserve blend/extended/center-bound/systematic/SKY/full DCR and absolute astrometry gaps. No repeated new261fits/detection/old45fits/catalog/aperture/cross-run/edge/recovery/861s master. Complete background/green halo/weak structure/coverage must use actual source/display meaning and connect valid processing to current full candidate preserving science/alpha/recipe/fallback. Formal quality/rights/processing/source Back/independent review, native page/devices, retention and200DAU mixed capacity remain open.'"
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'evidence':bind(TASK/'evidence'/name),'nextCheckpoint':'r35','ordinaryAdopted':False,
                  'outputGroups':[{k:v[k] for k in ('folder','files','logicalBytes','windowsAllocatedBytes')} for v in inventory]}))
