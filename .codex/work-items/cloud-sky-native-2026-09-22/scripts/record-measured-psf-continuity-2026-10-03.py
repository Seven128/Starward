"""Record actual PSF support and mature reuse without source quality promotion."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
def bind(p):
    data=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
def doc(folder):return json.loads((ROOT/'output'/folder/'result.json').read_bytes())
N=ROOT/'output/sdss-measured-native-psf-1003-r2';C=ROOT/'output/sdss-imagepsf-interpolation-1003-r1';O=ROOT/'output/sdss-imagepsf-centering-1003-r1'
n=doc(N.name);c=doc(C.name);o=doc(O.name);rb=json.loads((O/'readback/result.json').read_bytes())
assert len(o['records'])==15 and rb['actual45ProfilesReadBack']
table=[]
for b in ('g','r','i'):
    values=[[r['bands'][b]['fitStats']['conditionalChiSquarePerDof'] for r in n['records']],
       [r['bands'][b]['newConditionalChiSquarePerDof'] for r in c['records']],
       [r['bands'][b]['localCenterChiSquarePerDof'] for r in o['records']]]
    table.append('| '+b+' | '+' | '.join(f'{np.min(v):.3f}/{np.median(v):.3f}/{np.max(v):.3f}' for v in values)+' |')
assert not any(v['centerAtBounds'] for r in o['records'] for v in r['bands'].values())
review={'kind':'ROOT_VISUAL_SELF_REVIEW_NOT_INDEPENDENT_ACCEPTANCE','images':[bind(N/'actual-native-model-residuals.png'),bind(O/'actual-local-center-model-residuals.png')],
 'method':'functions.view_image original detail; native, fitted model and residual columns separately labelled.',
 'observations':['Most native PSF profiles broadly correspond to model, source grain remains actual measured data.',
  'Bright core residuals remain after mature interpolation/local centering; nuisance fits cannot certify source PSF truth.',
  'No central-field source correspondence supplied; no corrected galaxy image or full quality pass.'],
 'qualityAcceptance':'NOT_PASSED','independentReview':'MISSING','ordinaryAdopted':False}
with (O/'readback/visual-self-review.json').open('x',encoding='utf-8') as f:json.dump(review,f,indent=2);f.write('\n')
name='experience-measured-native-psf-support-2026-10-03.md'
text=f'''# 真实原生PSF对应、成熟子像素与中心诊断

沿[唯一PLAN](../PLAN.md)质量材料缺口，复用既有已核六字段psField、fpM/CAS和实际目录，补**原生测量对空间模型**，不重复旧17×17 PSF/宽度矩阵、173条坐标诊断或查询。没有科学源下载、科学/候选/权重/WCS/recipe/PNG加工变化；不是完整PSF匹配、背景修复、图质通过或普通采用。

## 真实数据与原native模型

[原15检测](experience-sdss-measured-star-registration-2026-10-03.md)是在当前2048²目标内已qualified的检测，不是15独立恒星/曝光或需求上限。本轮沿原实际objID/field和逐带目录中心减0.5取原生41×41有符号样本；实际只有3699/99、101和3716/116、118四字段，分别3/6/4/2条。中心3699/100与3716/117仍没有被原查询供应的星点，未重查已知空表。真实camera/SKY模型、原四类processing拒绝、matched actualPS_ID、field-specific signed51×51全部basis由既有owner消费。

空间相对kernel归一化只用于诊断幅值，保负瓣；这是有限模型样本，不认证总通量、FWHM、目标coadd PSF或真实扩展源颜色。当前诊断radius12内45带cut都finite、noise-model可用且无INTERP/SATUR/GHOST/CR排除；这只是当前选定点的小支持。采用现有四邻采样器以实际分数中心采样template，NumPy weighted linear least squares拟relative PSF幅值及局部常数/x/y平面。平面是小窗口nuisance，**没有从科学/星系/完整背景扣除**；固定noise仅条件原生对角模型，PSF/sky/centroid/系统/混叠误差不含。

[首次task r1失败](../../../../output/sdss-measured-native-psf-1003-r1/failed.json)因误用不存在`PsfField.kernel`，在首个fit前停止；原已读source/input与executed-script保留，不把工具成功升级。修任务为现有`reconstruct`API，不改生产reader。独占[r2消费](../scripts/experience-sdss-measured-native-psf-r2-2026-10-03.py)及[结果](../../../../output/sdss-measured-native-psf-1003-r2/result.json)：{bind(N/'result.json')['bytes']:,}B，SHA256 `{bind(N/'result.json')['sha256']}`；原科学/source/default/六保护before-after pin保持；7.405秒仅本机读cache/诊断，不作服务/手机容量。

已查看[actual native/model/residual](../../../../output/sdss-measured-native-psf-1003-r2/actual-native-model-residuals.png)，模型 broadly对应点源，但几颗亮星有核心残差，不能把双线性采样误差一并归因给真实源缺陷。

## 成熟工具与有界对照

[Photutils PSF matching说明](https://photutils.readthedocs.io/en/stable/user_guide/psf_matching.html)要求共同grid/scale、输入模型及处理近零OTF；窗函数会抑制真实高频，不能从旧noise-effective宽度标量或现成kernel倒推已匹配。当前不装自造匹配器/不直接做全图反卷积。[ImagePSF](https://photutils.readthedocs.io/en/stable/api/photutils.psf.ImagePSF.html)提供fractional-location的三次RectBivariateSpline模型，有限模型归一化仍有通量边界。

一次在隔离`output/sdss-psf-tools-1003-r1/python-deps`安装Photutils3.0.0/SciPy1.17.1 wheel（`--only-binary --no-deps`），沿原NumPy2.5.3/Astropy8.0.1。没有替换原依赖目录/修改产品package或生产模块。[实际pip报告](../../../../output/sdss-psf-tools-1003-r1/pip-report.json) SHA256 `2ab7ef4a01944232c5aba576198709102f55c764bb2b802e4c3991ab9bbb6d45`保源URL、wheel SHA、版本。实际METADATA/许可证含Photutils BSD-3-Clause和SciPy及其binary vendor许可，安装完整保留；代码以标准公开API复用，没有复制旧SDSS GPL/权利未知archive算法源。两wheel pip显示下载约36.5+1.1MB，近似进程输出，不冒精确网络/计费字节。新tool2973文件logical144,362,206B；不含pip缓存/全库存/Windows物理分配或Linux180GB结论，没有清理/新增付费设施。产品依赖/普通registry/权益采用未变。

[一次成熟采样对照](../scripts/experience-sdss-imagepsf-interpolation-2026-10-03.py)直接复用保存45组native/kernel/variance/support，未重读或重投影frames；固定原目录中心、相同四linear参数，只换成ImagePSF cubic。整数位置与kernel精确到roundoff、越过kernel显式NaN不外推，已知signed nuisance-plane控制成立。[结果](../../../../output/sdss-imagepsf-interpolation-1003-r1/result.json) SHA256 `{bind(C/'result.json')['sha256']}`；0.442秒本机后续采样/fit。多数点改善，部分亮核仍高残差，不能无限选插值/参数。

因实际残差持续，新增一次[局部中心nuisance诊断](../scripts/experience-sdss-imagepsf-centering-2026-10-03.py)，复用ImagePSF+Astropy Planar2D/[TRFLSQFitter](https://docs.astropy.org/en/stable/api/astropy.modeling.fitting.TRFLSQFitter.html)。同radius12/source/noise/support，中心仅同一原像素cell[-0.5,+0.5]、max100评估，拟PSF幅值/xy与plane，无sigma/shape/原点搜索、无全场WCS shift。45个fit正常收敛、没有达到中心边界；已知signed-plane/真实kernel/分数中心的算术控制成立，不是新真实星点。

[中心诊断结果](../../../../output/sdss-imagepsf-centering-1003-r1/result.json)：{bind(O/'result.json')['bytes']:,}B，SHA256 `{bind(O/'result.json')['sha256']}`，0.988秒。本轮条件χ²/dof的min/median/max如下，前三列4参数、后一列6参数，增加自由度和native模型遗漏意味着**不是质量阈值、独立PSF真值或置信验收**：

| band | bilinear固定中心 | cubic固定中心 | cubic局部中心 |
| --- | --- | --- | --- |
{chr(10).join(table)}

两颗3699/101亮星r条件统计仍13.952和8.808，3716/118亮星i仍6.731，核心残差仍见[actual local-center model/residual](../../../../output/sdss-imagepsf-centering-1003-r1/actual-local-center-model-residuals.png)。这说明在当前模型/采样/局部背景/未知blend等假设下仍有差异，**没有定位唯一源缺陷**。不能据其颜色重写源/全图去绿、把center nuisance当DCR修正，或推广到未被测的中心/其他曝光/扩展结构。

## 保存读回与当前决定

[读回](../scripts/readback-sdss-native-psf-2026-10-03.py)未导入生产fit/helper或ImagePSF类、未重跑optimizer；用row-first SciPy spline独立核采样/局部模型/残差，normal equations核固定中心四参数，保存条件统计一致。wrong-kernel-axis控制最大模型差6.734，不能用“恰好kernel对称”掩盖索引错。[结果](../../../../output/sdss-imagepsf-centering-1003-r1/readback/result.json) SHA256 `{bind(O/'readback/result.json')['sha256']}`。这是root另一算术路径，非独立人员审查；[actual自审](../../../../output/sdss-imagepsf-centering-1003-r1/readback/visual-self-review.json) MISSING独审、NOT_PASSED整体质量。

**当前决定：** 已有成熟kernel工具与真实非中心对应，仍不批准整幅PSF matching或背景/配准通过；中心/扩展PSF与目标网格/混合贡献模型缺口保留。没有再查询旧目录/重跑45fit或调sigma阈值的依据。接着先补当前adaptive-real-halo→known-supply recovery的完整加工来源packet：明确原科学、显示处理和科学mask/alpha、父/供应/当前code/版本/模型/epoch、不可忽略的PSF/背景/配准限制及来源信用/权利/加工说明，再接后续有实证的质量处理及正式批量链。当前noise-v1 packet不是新v2链的完整出口，不能只换名/adopt flag。

完整背景/弱结构/绝对和逐像素配准、来源出版/必要独审/端云成本、HST矩形FAILED/M82缺输入、空registry、DevTools FAILED_DEVTOOLS、Android/iOS/新版月面/实际page Back均保原状态。原Goal active无预算，原工作区/分支/HEAD与有效服务watch保持，没有提交/推送/云部署/发布。
'''
with (TASK/'evidence'/name).open('x',encoding='utf-8') as f:f.write(text)
def edit(p,old,new):
    s=p.read_text(encoding='utf-8');assert old in s,(str(p),old[:60]);p.write_text(s.replace(old,new,1),encoding='utf-8',newline='\n')
paragraph=('新增[实际native PSF/成熟采样与中心支持](evidence/'+name+')：已复用原15检测/四非中心字段，signed空间模型与45原生cut进行诊断，'
 'ImagePSF cubic与有界局部中心分开检验采样/位置误差，保存normal-equation/row-first读回及错误轴控制通过。'
 '多数局部残差减轻，几颗亮核形状仍有差异，中心/扩展/目标coadd PSF和完整背景/配准不通过；不凭现结果整幅matching、shift或去绿。'
 '独立隔离Photutils/SciPy工具复用、无新科学源/查询/原frame投影/候选修改，旧依赖不变；新工具logical144362206B单列，不冒全产品磁盘。'
 '首次task API误用r1保失败，r2改调已有reconstruct；actual来源/六保护保持，独审MISSING/普通未采用。\n\n')
old=('下一直接项仍是完整候选质量：共同孔径/真实halo/既有qualified other-RUN供应已在最新完整候选接通，'
 '下一项核仍有问题的背景/弱结构/绿色晕圈和完整配准的实际source/PSF/处理支持及材料缺口，'
 '复用已获取源/研究和成熟责任，有依据才加工；当前谱系纳入完整加工来源packet。')
new=('下一直接项仍是完整候选质量：共同孔径/真实halo/既有qualified other-RUN供应已在最新完整候选接通，'
 '实际PSF对应已补但中心/扩展/目标coadd资格缺口和亮核残差仍在，不批准整幅matching。'
 '下一项先补当前adaptive-real-halo→saved-flag-recovery完整加工来源packet，'
 '把原科学/显示/coverage/alpha、父/供应/当前实现版本/模型/epoch和未闭PSF/背景/配准/信用权利边界交给现有来源链owner，'
 '不以noise-v1 packet换名冒新链；后续质量仍依据实际源/成熟支持推进。')
edit(TASK/'PLAN.md',old,paragraph+new)
edit(TASK/'CONTINUE-CLOUD-SKY.md','## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作')
p=TASK/'CONTINUE-CLOUD-SKY.md';s=p.read_text(encoding='utf-8');p.write_text(s.replace('current-execution-state-2026-10-03-r32.json','current-execution-state-2026-10-03-r33.json'),encoding='utf-8',newline='\n')
edit(ROOT/'project_context/external-capabilities.md','星点目录和frame共享上游解算，不是独立绝对真值，扩展DCR/PSF/弱结构仍缺。',
 '星点目录和frame共享上游解算，不是独立绝对真值，扩展DCR/PSF/弱结构仍缺。已复用原检测和四非中心字段的原生signed cut/空间PSF，以隔离Photutils ImagePSF cubic及Astropy局部中心诊断检验对应；多数局部残差减轻，几颗亮核仍有形状差异。工具/小窗口nuisance plane和中心不是整图PSF matching、sky/DCR/WCS修正，中心和目标coadd模型仍缺；不重复旧查询/fit或无据参数循环。库保完整实际许可/来源，仅离线工具，不改产品依赖。见[真实模型支持与未闭边界](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+').')
edit(ROOT/'data-pipelines/deep-sky/README.md','The relative kernel is not a calibrated flux image, FWHM, measured-star validation or a PSF correction.',
 'The relative kernel is not a calibrated flux image, FWHM, measured-star validation or a PSF correction. Current task-local native star correspondence now distinguishes model interpolation and centroid nuisance from source shape: isolated Photutils ImagePSF/Astropy fits reuse original signed samples, never apply a fitted plane/center to science. Remaining bright-core residuals and absent central/extended/coadded target PSF keep full matching and quality unadopted. Reuse these outputs before any new material trial; do not repeat unchanged local fits. See [measured native model evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+').')
p=TASK/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8')
s=s.replace('$sources = @(\n','$sources = @(\n'+''.join('  "$taskRoot/scripts/'+q+'",\n' for q in (
 'experience-sdss-measured-native-psf-2026-10-03.py','experience-sdss-measured-native-psf-r2-2026-10-03.py',
 'experience-sdss-imagepsf-interpolation-2026-10-03.py','experience-sdss-imagepsf-centering-2026-10-03.py',
 'readback-sdss-native-psf-2026-10-03.py','record-measured-psf-continuity-2026-10-03.py')),1)
s=s.replace('$results = @(\n','$results = @(\n'+'  "$taskRoot/evidence/'+name+'",\n'+''.join("  'output/"+q+"',\n" for q in (
 'sdss-measured-native-psf-1003-r1/failed.json','sdss-measured-native-psf-1003-r1/executed-script.py',
 'sdss-measured-native-psf-1003-r2/result.json','sdss-measured-native-psf-1003-r2/inputs-before.json','sdss-measured-native-psf-1003-r2/inputs-after.json',
 'sdss-imagepsf-interpolation-1003-r1/result.json','sdss-imagepsf-interpolation-1003-r1/inputs-before.json','sdss-imagepsf-interpolation-1003-r1/inputs-after.json',
 'sdss-imagepsf-centering-1003-r1/result.json','sdss-imagepsf-centering-1003-r1/inputs-before.json','sdss-imagepsf-centering-1003-r1/inputs-after.json',
 'sdss-imagepsf-centering-1003-r1/readback/result.json','sdss-imagepsf-centering-1003-r1/readback/visual-self-review.json',
 'sdss-psf-tools-1003-r1/pip-report.json')),1)
observed=('Actual15 existing detections on four noncentral fields now have45 native signed science/position-dependent PSF/noise/flag correspondence diagnostics. '
 'Task r1 nonexistent kernel API failed before fitting; corrected task calls existing reconstruct, r2 retained separately. '
 'Actual cubic ImagePSF comparison and bounded Astropy local center fits reuse saved data, no source/candidate correction or frame reprojection. '
 'Most local residuals decline; bright r/i cores remain discrepant, central/extended/coadded target PSF missing, no global matching/sky/WCS/DCR promotion. '
 'Saved normal-equation/row-first spline/model/residual/conditional statistics readback and wrong-axis control pass. '
 'Actual native and local-center contact images viewed; conditional statistics do not establish confidence/PSF truth or full quality. '
 'Photutils3.0.0/SciPy1.17.1 installed once as isolated offline binary tools, original dependencies/product packages unchanged; license records retained. '
 'New2973tool files144362206logicalB includes vendor binaries, not full retention/Linux physical capacity. '
 'All actual source/current display/protected pins exact; no scientific downloads/catalog query/whole filter/old matrix rerun/service restart/release. '
 'Full quality NOT_PASSED, independent review MISSING, ordinary unadopted. Context/links/scoped whitespace checked by invoking turn.')
next_value=('PLAN B: complete current adaptive-real-halo -> saved-flag-recovery processing/source packet with existing provenance owner. '
 'Bind original science/display/coverage/alpha, parent/supply/current code/version/model/epoch and PSF/background/registration/credit/rights limits; '
 'do not rename noise-v1 packet as complete new chain. Source-supported quality processing/formal adoption remains dependent on full quality/rights/credits/review. '
 'Do not repeat unchanged45 PSF fits/catalog queries/15aperture/cross-run/edge/rebase/861s master or parameter scans. '
 'Native/page/source Back/devices and actual production retention/200DAU mixed capacity stay open.')
lines=s.splitlines()
for i,line in enumerate(lines):
    if line.strip().startswith("toolObserved='"):lines[i]="    toolObserved='"+observed+"'"
    if line.strip().startswith("next='"):lines[i]="    next='"+next_value+"'"
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'evidence':bind(TASK/'evidence'/name),'nextCheckpoint':'r33','ordinaryAdopted':False}))
