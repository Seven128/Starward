"""Record current processing lineage without advancing image adoption."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT/'output/adaptive-recovery-source-chain-1003-r1'
name = 'experience-adaptive-recovery-processing-source-chain-2026-10-03.md'
def bind(p):
    raw = p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def edit(p, old, new):
    text = p.read_text(encoding='utf-8')
    assert old in text, (str(p), old[:60])
    p.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')
result = json.loads((OUT/'result.json').read_bytes())
readback = json.loads((OUT/'readback-r2/result.json').read_bytes())
assert result['packet'] == readback['packet'] and readback['fourHistoricalExecutionsExact']
text = f'''# 当前自适应/真实边缘/保存供应加工来源链

状态：**离线开发来源packet**；质量UNVERIFIED、独审MISSING、未普通采用、未发布运行时新版。仍是原工作区/分支/HEAD、Goal active无预算；没有改任何候选科学/估计/PNG、原recipe/权重、六保护、原registry或服务/watch。

## 同一来源owner的新处理角色

[sdss_noise_display_provenance.py](../../../../data-pipelines/deep-sky/sdss_noise_display_provenance.py)新增显式`sdss-adaptive-recovery-processing-source-chain-v1`消费者，不将旧noise-v1文档换名。固定角色是原科学master、冻结recipe/credit许可说明、adaptive-v1、real-halo-v2、原other-scan供应-v1、其原资格snapshot、当前恢复-v2与保存数值读回。各角色的目标/版本/原science/availability、共同recipe、父估计与四diagnostic、当前qualified/旧供应/execution canonical pin必须匹配。模型snapshot仍明确标`sdss-common-noise-display-candidate-v1`，只提供原native/CALIB-SKY/CAS/fpM/epoch/projected/weight identity，**不是新自适应算法声明**。

历史before/after、原script和每个输入逐字节验证；代码已演化时使用与原记录完全同hash/bytes的实际archive，科学/其他文件不能用代码archive替换。供应当时的旧`sdss_gri_tan.py`不再等于live版本，但既有完整adaptive/shared-noise archive保原实际字节；当前inspection owner另立身份，不冒任何旧执行当时用了后改代码。没有重做frame解析/投影/过滤、旧目录/PSF矩阵或三级RGB数值推导。完整保存读回作为明确外部pin的历史数值证据复用，所有其文件及每档PNG仍核字节；当前consumer不声称自己重跑数值或认可图质。

原科学是已校准/已扣sky的有符号nMgy/native-pixel；共同孔径和真实边缘及13323替代只是显示估计，不形成新测量或填science。原joint availability独立决定area alpha，有效0/负值/亮度/processable不制造coverage。Signed display mean先box，再用原冻结i/r/g Lupton；不冒photometry或统一surface brightness。原credit、CC BY4.0及source/policy/license链接从同一原science的冻结disclosure精确继承；附本代共同孔径、边缘和替代供应用途/epoch/PSF与处理差异。保遗漏sky/systematic/processing误差、primary TAN/full asTrans/DCR/绝对配准、中心/扩展/coadd PSF、棕底/绿晕/弱结构及独审不足。保存的模型支持单列[真实PSF证据](experience-measured-native-psf-support-2026-10-03.md)，不改处理父或认证真值。

这份含内部路径/receipt的packet不是公共source-route payload、TS publication hash或Prepared标准静态合同；仅已有来源信用文本精确保留，不冒新版完整权益/加工说明审查和来源Back验收。

## 真实消费及保存读回

[实际消费](../scripts/experience-adaptive-recovery-source-chain-2026-10-03.py)以r33外部checkpoint及已核原科学/冻结manifest身份为锚，保存全部显式pins和本代executed script/owner。产物：

| 产物 | 实际身份/含义 |
| --- | --- |
| [processing-source-chain.json](../../../../output/adaptive-recovery-source-chain-1003-r1/processing-source-chain.json) | {result['packet']['bytes']:,}B，文件SHA `{result['packet']['sha256']}`；canonical SHA `{result['canonicalPacketSha256']}`；两种hash分开 |
| [external-pins.json](../../../../output/adaptive-recovery-source-chain-1003-r1/external-pins.json) | {result['externalPins']['bytes']:,}B，SHA `{result['externalPins']['sha256']}`；包括四历史执行/文件/archived code绑定，caller pins不是取源网络证明 |
| [实际result](../../../../output/adaptive-recovery-source-chain-1003-r1/result.json) | {result['elapsedSeconds']:.3f}秒本机独立inspection；{result['checkedDistinctFiles']}个distinct文件有界字节核对；source/filter/projection/PNG derivation均0；非端云吞吐/总库存 |
| 当前候选 | 原17903B、SHA `e3f8f732ed0fda1121ac38aec2cae9ad57521c3d2807b3d985955f64e5548235`保持，13323供应及其余当前父/53缺口/原alpha保持既有证据，不重加工 |

[独立root JSON/字节读回](../scripts/readback-adaptive-recovery-source-chain-r2-2026-10-03.py)不导入producer/新owner，流式hash真实361文件；核历史resolved-code与原记录/producer、产品数组/PNG与meta、current/父/supply/canonical snapshot、credit/许可/单独inspection角色及未采用状态。361与349范围不同：读回额外核packet/pins、当前inspector/producer及显式产品等，不拿差额冒新增科学资源。[r2 result](../../../../output/adaptive-recovery-source-chain-1003-r1/readback-r2/result.json) SHA `{bind(OUT/'readback-r2/result.json')['sha256']}`。

首个readback任务把原noise处理version字面量猜错，失败在角色断言前；[原脚本/失败](../../../../output/adaptive-recovery-source-chain-1003-r1/readback/failed.json)保持。r2读取已有owner实际version后独占读回；没有改packet/历史/候选来迁就断言。

## 有界缺陷控制与验证

[八个新来源谱系回归](../../../../data-pipelines/deep-sky/test_sdss_adaptive_provenance.py)检查同几何不同object、父估计/diagnostic错接、重签旧snapshot仍不能掩扫描epoch改写、science availability与display/supply分开、原disclosure指向其他科学、缺/假alpha数值证据及旧version/采用flag冒认。扫描epoch控制通过删除唯一资格guard的内存AST mutation复现：其他目标/科学/保存读回/credit检查仍接受改写epoch；当前guard拒绝。fixture只测合同，不当真实科学/处理证据。

受影响`test_sdss_adaptive_provenance`、原`test_sdss_noise_display_provenance`与`test_sdss_saved_recovery`共19项通过；保原noise-v1的source/JSON/null/black/fallback/对象guard及当前saved-recovery语义。没有重跑整图质量或无变化完整母图来增加数量。Context/local-link/本轮scoped whitespace及六保护checkpoint另外核对。

## 当前唯一依赖

本代加工谱系开发packet已补；下一步回到当前完整候选仍失败/缺证的背景、弱结构/绿晕、覆盖及完整配准：沿现有真实源/模型/显示意义和已核成熟处理支持，只有足够材料才做新加工。中心/扩展/coadd PSF不足不批准全图matching/shift/扣sky，不能通过重复45fit/旧目录/孔径/九边/13k恢复或861秒母图填证据。质量、来源权利/信用/加工说明及必要独审可审查后，才接新正式版本/批量出版/static/API/client/source/Back与保留成本。普通registry仍空，HST矩形FAILED、M82输入不足、DevTools FAILED_DEVTOOLS、Android/iOS/新版月面/实际page组合、200DAU端云混合容量都保持未完成。
'''
with (TASK/'evidence'/name).open('x',encoding='utf-8') as f:f.write(text)
paragraph = ('新增[本代完整加工谱系开发packet](evidence/'+name+')：现有provenance owner显式接原科学/frozen disclosure、adaptive-v1、真实halo-v2、已核供应-v1与当前恢复-v2。'
 '349 distinct文件按原before/after及历史code archive核字节，保存numeric/alpha证据复用、0投影/过滤/PNG推导；root独立JSON/字节路径核361文件。'
 '原noise输入snapshot不冒新算法，原科学/当前候选/六保护/credit及许可文本保持；模型/背景/配准/完整公开来源与必要独审仍缺。'
 '原version字面量误写的readback失败保留、r2改任务后通过；epoch改写guard缺失mutation已复现并拒绝，19项受影响检查通过。'
 'packet441203B为离线证据、非新publication或普通采用。\n\n')
plan = TASK/'PLAN.md';s = plan.read_text(encoding='utf-8')
old = next(line for line in s.splitlines() if line.startswith('下一直接项仍是完整候选质量：'))
new = ('下一直接项回到当前完整候选的背景/弱结构/绿晕、覆盖及完整配准质量；本代完整加工来源packet已完成开发绑定，未闭项见其证据。'
 '复用当前adaptive-real-halo→saved-supply完整候选、实际signed源/CALIB-SKY/fpM/epoch及成熟处理支持，先确认仍有差异的真实支持/模型/显示语义，足够材料才加工。'
 '中心/扩展/目标coadd PSF缺口不批准全图matching/shift/再扣sky/gain，不凭星色重写扩展颜色。'
 '不重复旧目录/45fit/15孔径/跨run矩阵/九边/13323供应/861秒完整母图、旧origin或gamma/sigma/gain扫描。'
 '质量与来源权利/信用/加工说明、必要独审可审查后才接新版正式合同/批量出版/static/API/client/source-route Back和保留成本；当前packet含内部receipt，仅离线。'
 '原science/availability/alpha/冻结recipe和同帧/取消/粗档回退保持，普通science/Prepared registry仍空；HST矩形FAILED/M82输入不足和完整原生交互/目标资源义务保留。')
edit(plan,old,paragraph+new)
edit(TASK/'CONTINUE-CLOUD-SKY.md','## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作')
edit(TASK/'CONTINUE-CLOUD-SKY.md','current-execution-state-2026-10-03-r33.json','current-execution-state-2026-10-03-r34.json')
edit(ROOT/'project_context/external-capabilities.md','暖底与颗粒/单扫描资格仍开放，不能因开发通过采用或认证权益/图质。',
 '当前provenance owner另以显式adaptive-recovery chain接完整父/供应/原科学/冻结credit；原noise snapshot仅属输入角色，历史code archive与当前inspection分开，复用已核保存numeric/alpha读回，无整图再加工。来源receipt仍离线，非正式publication或完整权益/Source Back验收，见[当前加工链](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+')。暖底与颗粒/单扫描资格仍开放，不能因开发通过采用或认证权益/图质。')
edit(ROOT/'data-pipelines/deep-sky/README.md','`sdss_frame_quality.py` adds shared cached psField/fpM diagnosis alongside the',
 '`sdss_noise_display_provenance.bind_saved_adaptive_recovery_chain` explicitly binds the executed adaptive-v1, real-halo-v2, saved other-scan supply and current recovery-v2 roles with original science/frozen credit and saved numeric readback. The noise-v1 snapshot is only an input identity role. Historical code bytes are checked at their retained archives; inspector code is separate. This consumes existing results without parsing/projecting/filtering frames or deriving PNGs again. Internal source paths and receipts stay offline; complete image quality, rights/processing review and runtime publication remain unadopted. See [current processing-chain evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+').\n\n`sdss_frame_quality.py` adds shared cached psField/fpM diagnosis alongside the')
p = TASK/'scripts/capture-current-execution-2026-10-03.ps1';s = p.read_text(encoding='utf-8')
sources = ('experience-adaptive-recovery-source-chain-2026-10-03.py','readback-adaptive-recovery-source-chain-2026-10-03.py',
           'readback-adaptive-recovery-source-chain-r2-2026-10-03.py','record-adaptive-source-chain-continuity-2026-10-03.py','finish-measured-psf-continuity-2026-10-03.py')
s = s.replace('$sources = @(\n','$sources = @(\n  "data-pipelines/deep-sky/test_sdss_adaptive_provenance.py",\n'+
    ''.join('  "$taskRoot/scripts/'+v+'",\n' for v in sources),1)
files = ('processing-source-chain.json','external-pins.json','result.json','executed-script.py','sdss_noise_display_provenance.py',
         'readback/failed.json','readback/executed-script.py','readback-r2/result.json')
s = s.replace('$results = @(\n','$results = @(\n  "$taskRoot/evidence/'+name+'",\n'+
    ''.join("  'output/adaptive-recovery-source-chain-1003-r1/"+v+"',\n" for v in files),1)
lines = s.splitlines()
for i,line in enumerate(lines):
    if line.strip().startswith("next='"):
        lines[i] = "    next='PLAN B: current complete candidate quality remains the sole next dependency. Use original signed source/model/display and mature support to address remaining background/weak structure/green halo/coverage/full registration only with material evidence. Current adaptive-real-halo/saved-supply processing packet is developed but offline, not runtime publication/adoption. Central/extended/coadded PSF gaps remain; no unsupported full matching/sky subtraction/shift. Reuse existing diagnostics, no unchanged45fits/catalog/15apertures/cross-run/9edges/13323supply/861s master reruns. Formal publication/rights/processing/source Back, native full composition, retention and200DAU mixed cost/capacity stay open.'"
    if line.strip().startswith("toolObserved='"):
        lines[i] = "    toolObserved='Actual adaptive-recovery processing/source packet binds349distinct original files, four execution roles and archived historical code, original science/alpha/frozen credit and explicit noise snapshot input role. Original current candidate unchanged; existing numeric readback reused with0 source/projection/filter/PNG derivation. Independent root JSON/byte readback361 files passes; first guessed version literal failure retained, r2 task fixed from actual owner. New epoch rewrite missing-guard mutation reproduces escape and repaired owner rejects;19 affected checks pass. Packet441203B offline only, full quality UNVERIFIED/independent review MISSING/ordinary unadopted. Prior actual45 native PSF/local center diagnostics and isolated tooling remain bounded; no new science download/query/frame projection/service restart/device/release. Context/local links/scoped whitespace and protected checkpoint verified by invoking turn.'"
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'evidence':bind(TASK/'evidence'/name),'nextCheckpoint':'r34','ordinaryAdopted':False}))
