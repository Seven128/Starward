"""Record runtime-aware retention development, preserving remote unknowns."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
name='experience-runtime-bound-static-retention-2026-10-03.md'
summary='新增[实际mount绑定静态保留开发](evidence/'+name+')：现有retention owner显式runtime观察和复用descriptor/env的只读CLI已开发。prepared前进而旧generation仍mounted的真实文件/受控Docker回归，单独保OBSERVED_RUNNING_MOUNT；write/foreign/fragment错/途中变动及无效观察拒绝，空观察不冒完整引用全集。忽略runtime的有界mutation失败，原Sky/release/preview四组受影响检查42通过；不是实际Docker/远端验收。现有SSH只读核查不可用，输出只保有限category，不当服务终止/无挂载，不刷新凭据或循环连接排查。无清理/部署/发布/重启；actual receipts/rollback/backup绑定和原load-by-prepared消费者仍待收口，独审MISSING。\n\n'
next_step='当前唯一下一依赖仍是D：runtime-aware保留owner/只读CLI已开发，接validated operation/release/current/rollback/backup来源引用，先核schema/实际文件边界/环境身份/失败及旧v1含义；不能把声明list/旧成功receipt/prepared pointer当当前mount或全集。SSH本次读回不可用保持未知，不重复此runtime矩阵/旧库存/HTTP/dry-run或SSH启动诊断，不清理/部署/发布；推进必要owner消费者开发和可读实际来源。当前/获准旧URL/来源/未知引用继续保留；非deploy load仍按prepared选择overlay，需要实际current/receipt/runtime联合绑定，不能冒已修。B完整图质保持开放，局部matching不采用/不循环参数，背景/绿晕/弱结构/coverage、三级显示/来源权益信用加工/独审/批量出版/Source Back仍须交付。ordinary science/Prepared registry空，HST矩形FAILED/M82完整输入缺；实际page/native/Android/iOS/newMoon、全产品总资源/物理保留与180GB余量、10/20普通混合冷进入/200DAU容量义务不缩减。'
p=TASK/'PLAN.md';s=p.read_text(encoding='utf-8');assert '实际mount绑定静态保留开发' not in s
lines=s.splitlines();i=next(i for i,l in enumerate(lines) if l.startswith('当前唯一下一依赖转入既有独立D：'));lines[i]=summary.rstrip()+'\n\n'+next_step
s='\n'.join(lines)+'\n';s=s.replace('D的实际mount/receipt/回滚/备份引用与现有保留owner连接；B完整图质仍未完成','D的operation/release/current/rollback/backup来源引用接已开发runtime-aware保留owner；远端mount未验、B完整图质仍未完成',1);p.write_text(s,encoding='utf-8')
p=TASK/'CONTINUE-CLOUD-SKY.md';s=p.read_text(encoding='utf-8');i=s.index('新增[成熟局部PSF匹配否决]');end=s.index('\n\n',i);s=s[:end+2]+summary+s[end+2:]
s=s.replace('[current-execution-state-2026-10-03-r37.json](evidence/current-execution-state-2026-10-03-r37.json)','[current-execution-state-2026-10-03-r38.json](evidence/current-execution-state-2026-10-03-r38.json)');p.write_text(s,encoding='utf-8')
p=ROOT/'project_context/deployment/decisions-and-verification.md';s=p.read_text(encoding='utf-8');anchor='## Remaining Decisions And External Inputs';assert anchor in s
entry='The same retention owner now optionally inspects the validated Compose project’s actual running Caddy ID and two readonly Sky mounts, retaining an older mounted generation separately from the current prepared pointer. It rechecks runtime/publication under the existing lease; invalid, foreign, ambiguous or changed observations fail without authorizing cleanup. `tools/deployment/sky-static-retention.mjs` reuses descriptor/environment validation for host-local read-only inspection, expecting Docker/store filesystem correspondence. This does not supply release/rollback/backup reference completeness or fix non-deploy load-by-prepared behavior. Current remote SSH readback was unavailable; controlled filesystem/runtime responses and affected release/preview checks are development evidence only, with new independent review missing. See [runtime-bound retention scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+name+').\n\n'
s=s.replace(anchor,entry+anchor,1);p.write_text(s,encoding='utf-8')
p=TASK/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8')
new_sources=['tools/deployment/sky-static-retention.mjs','tools/deployment/sky-static-release.mjs','tools/deployment/sky-static-release.test.mjs']
new_sources=[v for v in new_sources if "'"+v+"'" not in s and '"'+v+'"' not in s]
s=s.replace('$sources = @(\n','$sources = @(\n'+''.join("  '"+v+"',\n" for v in new_sources)+'  "$taskRoot/scripts/inspect-existing-preview-sky-runtime-2026-10-03.mjs",\n  "$taskRoot/scripts/record-runtime-retention-continuity-2026-10-03.py",\n',1)
results=['output/sky-existing-runtime-observation-1003-r1/result.json','output/sky-runtime-retention-development-1003-r1/result.json']
s=s.replace('$results = @(\n','$results = @(\n  "$taskRoot/evidence/'+name+'",\n'+''.join("  '"+v+"',\n" for v in results),1)
lines=s.splitlines()
for i,l in enumerate(lines):
 if l.strip().startswith("toolObserved='"):
  lines[i]="    toolObserved='Runtime-aware existing retention owner and validated host inspection CLI developed. Real sealed filesystem generations with controlled Docker observations demonstrate prepared-newer/mounted-older kept separately as OBSERVED_RUNNING_MOUNT. Readonly in-store same-generation publication/fragment, actual source seal/union and runtime recheck; writable/foreign/mismatched/changed/ambiguous/invalid observations reject, leases released. Ignoring runtime mutation fails new behavioral regression.42affected owner/release/preview checks pass; controlled observations, not live Docker/remote receipt acceptance. Existing SSH read unavailable, no sensitive stdout/metadata persisted, no absence/stopped claim. No cleanup/pull/release/publish/workflow/secret refresh/service restart. Original load-by-prepared unchanged and operation/release/current/rollback/backup binding open. Quality/source/device/capacity and independent review gaps remain.'"
 if l.strip().startswith("next='"):
  lines[i]="    next='PLAN D: bind validated operation/release/current/rollback/backup source references to runtime-aware retention owner, including actual schema/file/environment/identity/failure/oldv1 meaning. Remote unavailable remains unknown, no repeated SSH/runtime matrix/old inventory/HTTP/dry-run or cleanup/deployment. Nondeploy prepared-overlay resolver remains unbound to actual current receipt/runtime. All current/allowed old URLs and unknown references retain. B complete image quality/source credit/processing/publication/Source Back remains open with matching trial not adopted. Native page/devices/resources/full host disk and200DAU mixed capacity unverified.'"
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
baseline=json.loads((TASK/'evidence/current-execution-state-2026-10-03-r37.json').read_bytes());count=0
for v in baseline['currentSources']:
 if v['path'].startswith(('data-pipelines/','workers/','apps/','packages/')):
  p=ROOT/v['path'];assert p.stat().st_size==v['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256'];count+=1
print(json.dumps({'otherProductionFilesExactAgainstR37':count,'changedOwner':'Sky_static_retention','remote':'UNAVAILABLE_NOT_ABSENT','currentNext':'D_receipt_reference_binding'}))
