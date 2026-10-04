"""Record the rejected trial and select the existing independent D dependency."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
name='experience-mature-local-psf-matching-2026-10-03.md'
summary='新增[成熟局部PSF匹配否决](evidence/'+name+')：原science两实际cut/真实91²halo采用隔离Photutils Wiener默认1e-4、明确试验展宽目标；current非线性显示不重滤。2734/890像素有完整真实31²资格才修改试验，987/2831保持；混合RUN cut核心仅224/441被处理，不冒统一PSF。实际同冻结recipe对照未解决暖底/颗粒/疑似绿晕，REJECTED_FOR_FULL_EXPANSION/NOT_ADOPTED；不循环调参数或扩整图。NumPy FFT/direct真实邻域读回、原current DETAIL RGB/alpha精确、25输入前后保持；模型截尾/物理PSF/空间资格一致性/native-noise/fullDCR和独审缺口保留，生产/科学/当前候选不改。\n\n'
next_step='当前唯一下一依赖转入既有独立D：核实际static mount、operation/release/rollback/backup receipt引用并接保留owner，先查当前真实配置/运行态，不重做原库存/HTTP/dry-run、不清理/部署/发布。实际生产静态未配置时保持未部署/容量未验，开发供现有发布owner消费的有界真实引用核查；声明的reference list、prepared pointer、历史receipt不能认证当前mount或引用全集。当前/获准旧URL、来源和未知引用继续保留，不凭年龄/LRU新增删除。B完整候选质量继续开放：本次局部匹配设置不采用、不重复响应/检测/fit或循环参数；背景/绿晕/弱结构/coverage及同母图三级质量、来源权利/信用/加工说明与必要独审仍须交付，任何后续有效加工保science/alpha/冻结recipe/失败恢复。图质通过后才接新版正式合同/批量出版/static/API/client/source-route Back，不将开发packet当公开发布。普通science/Prepared registry空，HST矩形FAILED/M82完整输入缺；实际page/native/Android/iOS/newMoon、全产品总资源/180GB物理保留和10/20普通混合冷进入/200DAU容量义务不缩减。'
p=TASK/'PLAN.md';s=p.read_text(encoding='utf-8');assert '成熟局部PSF匹配否决' not in s
old='**唯一下一依赖（2026-10-03执行后）：** '
assert old in s;s=s.replace(old,'**当前唯一下一依赖（2026-10-03局部匹配否决后）：** D的实际mount/receipt/回滚/备份引用与现有保留owner连接；B完整图质仍未完成，当前具体行动与不可扩大范围见下面当前依赖段。\n\n**B本日已完成的开发状态（不是下一步）：** ',1)
lines=s.splitlines();i=next(i for i,l in enumerate(lines) if l.startswith('下一直接项仍是当前完整候选质量：'));lines[i]=summary.rstrip()+'\n\n'+next_step;p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
p=TASK/'CONTINUE-CLOUD-SKY.md';s=p.read_text(encoding='utf-8');i=s.index('新增[真实目标网格PSF响应]');end=s.index('\n\n',i);s=s[:end+2]+summary+s[end+2:]
s=s.replace('[current-execution-state-2026-10-03-r36.json](evidence/current-execution-state-2026-10-03-r36.json)','[current-execution-state-2026-10-03-r37.json](evidence/current-execution-state-2026-10-03-r37.json)');p.write_text(s,encoding='utf-8')
p=ROOT/'project_context/external-capabilities.md';s=p.read_text(encoding='utf-8');anchor='库保完整实际许可/来源，仅离线工具，不改产品依赖。'
new='原科学两实际halo小块已用成熟Wiener matching作一次同recipe对照：current非线性估计不重滤，未解决完整暖底/颗粒/疑似绿晕，局部资格也不供应整块共同PSF，设置不采用/不扩全图或循环调参；见[匹配否决与保留义务](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+')。'
assert anchor in s;s=s.replace(anchor,new+anchor,1);p.write_text(s,encoding='utf-8')
p=TASK/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8')
scripts=['experience-mature-psf-matching-2026-10-03.py','readback-mature-psf-matching-2026-10-03.py','measure-local-matching-allocation-2026-10-03.py','record-local-matching-continuity-2026-10-03.py']
s=s.replace('$sources = @(\n','$sources = @(\n'+''.join('  "$taskRoot/scripts/'+n+'",\n' for n in scripts),1)
results=['output/mature-psf-matching-1003-r1/result.json','output/mature-psf-matching-1003-r1/readback/result.json','output/mature-psf-matching-1003-r1/readback/owned-output-allocation.json']
s=s.replace('$results = @(\n','$results = @(\n  "$taskRoot/evidence/'+name+'",\n'+''.join("  '"+n+"',\n" for n in results),1)
lines=s.splitlines()
for i,l in enumerate(lines):
    if l.strip().startswith("toolObserved='"):
        lines[i]="    toolObserved='Two actual science cuts via isolated Photutils Wiener matching default1e-4 and explicitly broadened finite target; true91square halo,31square complete source-qualified support required. Changed2734/890,kept987/2831; mixed-run cut core224/441 admitted so entire cut not a common-PSF result. Actual same frozen recipe comparison still warm/grain/green structure; rejected for full expansion, unadopted, no parameter cycle. NumPy FFT and direct real-neighborhood convolution independent arithmetic, original saved current DETAIL RGB/alpha exact; wrong-axis and qualification-omission controls change actual data. Actual negative source count0 explicitly retained, only separate mathematical negative/zero constant controls.25source/code/current/protected pins before-after exact; production/science/current candidate/recipe no change. Current display is nonlinear and was not matched. Workdisk scope one new tree only. Independent review MISSING; quality unverified.'"
    if l.strip().startswith("next='"):
        lines[i]="    next='PLAN independent D: actual runtime static mount and operation/release/rollback/backup references tied to existing retention owner. Inspect live configuration/runtime before claiming mounts; unconfigured production stays unverified, add bounded reusable reference verification for release owner if needed. Do not repeat old inventory/HTTP/dry-run or cleanup/deploy/publish. Retain current/allowed old URLs and unknown references. B full image quality remains open, local matching trial not adopted or expanded/parameter cycled. Formal quality/rights/credit/processing/source Back/independent review, page/native/devices, full actual retention and200DAU mixed capacity remain obligations.'"
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
baseline=json.loads((TASK/'evidence/current-execution-state-2026-10-03-r36.json').read_bytes());count=0
for v in baseline['currentSources']:
    if v['path'].startswith(('data-pipelines/','workers/','apps/','packages/')):
        p=ROOT/v['path'];assert p.stat().st_size==v['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256'];count+=1
print(json.dumps({'productionFilesExactAgainstR36':count,'currentNext':'D_actual_mount_receipt_retention','B_quality':'OPEN_NOT_ADOPTED'}))
