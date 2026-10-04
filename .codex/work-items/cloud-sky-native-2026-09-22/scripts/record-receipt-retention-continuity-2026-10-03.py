"""Keep one current dependency after file-bound receipt retention development."""
from pathlib import Path
import json, hashlib
ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
name = 'experience-receipt-bound-static-retention-2026-10-03.md'
summary = ('新增[已有回执/current引用绑定开发](evidence/' + name + ')：同一retention owner/CLI按实际v1/v2合同读已验证环境的plain回执文件，绑定admitted source/sealed generation及current成功deploy/原overlay；旧mount、新prepared和current分别保留。成功缺绑定/步骤、foreign/links/身份错拒绝；失败/早期null/legacy显式未知；结束复核文件全集/字节。移除字节guard的有界mutation检出变化被错误接受，四组受影响检查45通过，均为本机文件/注入Docker开发证据。数据库backup-v1无Sky备份合同、无单独typed rollback合同，不补造全集。无清理/部署/发布/SSH重试，独审MISSING；非deploy按prepared选择仍未修。\n\n')
next_step = ('当前唯一下一依赖仍是D：已有operation/release/current文件引用已接runtime-aware保留owner，继续收口非deploy load的实际current/receipt/runtime联合绑定；先核消费者check/stop/backup/inspect/maintain与实际旧v1、失败、缺观察、身份不一致及途中变化含义，不能prepared当运行态。远端读回不可用保持未知，不重复SSH/runtime矩阵/旧库存/HTTP/dry-run，不清理/部署/发布。历史release保可能回滚资源，DB backup-v1不冒Sky备份；完整引用全集/物理保留仍未验，当前/获准旧URL/来源/未知继续保留。B完整图质保持开放，局部matching不采用/不循环参数，背景/绿晕/弱结构/coverage、三级显示/来源权益信用加工/独审/批量出版/Source Back仍须交付。ordinary science/Prepared registry空，HST矩形FAILED/M82完整输入缺；实际page/native/Android/iOS/newMoon、全产品总资源/180GB余量、10/20普通混合冷进入/200DAU义务不缩减。')
p = TASK / 'PLAN.md'; s = p.read_text(encoding='utf-8'); assert '已有回执/current引用绑定开发' not in s
lines = s.splitlines(); i = next(i for i,l in enumerate(lines) if l.startswith('当前唯一下一依赖仍是D：')); lines[i] = summary.rstrip() + '\n\n' + next_step
s = '\n'.join(lines) + '\n'
s = s.replace('D的operation/release/current/rollback/backup来源引用接已开发runtime-aware保留owner；远端mount未验、B完整图质仍未完成', 'D非deploy消费者actual current/receipt/runtime联合绑定；文件引用已开发，远端/全集及B完整图质仍未验', 1)
p.write_text(s, encoding='utf-8')
p = TASK / 'CONTINUE-CLOUD-SKY.md'; s = p.read_text(encoding='utf-8'); i = s.index('新增[实际mount绑定静态保留开发]'); end = s.index('\n\n', i)
s = s[:end+2] + summary + s[end+2:]
s = s.replace('current-execution-state-2026-10-03-r38.json', 'current-execution-state-2026-10-03-r39.json'); p.write_text(s, encoding='utf-8')
p = ROOT / 'project_context/deployment/decisions-and-verification.md'; s = p.read_text(encoding='utf-8'); anchor = '## Remaining Decisions And External Inputs'; assert anchor in s
entry = ('The optional receipt observation in the same retention owner binds selected environment v2 release/operator-preview files to admitted sealed sources and generations, and the successful preview-deploy current pointer to its exact receipt and existing overlay. It rechecks filenames/bytes under the lease and keeps runtime mount separate from prepared/current claims. Legacy v1, failed/no binding and unknown references remain explicit; failures reject rather than disappearing. Verified-backup v1 is database-only, not a Sky-publication backup contract; historical release resources remain possible rollback references, not completeness. The inspection CLI enables both observations, while non-deploy load-by-prepared remains unchanged. Development filesystem/injected-Docker checks and a receipt-byte-guard mutation do not establish remote acceptance or independent review. See [receipt/current retention scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/' + name + ').\n\n')
s = s.replace(anchor, entry + anchor, 1); p.write_text(s, encoding='utf-8')
p = ROOT / 'infrastructure/deployment/README.md'; s = p.read_text(encoding='utf-8'); anchor = 'On the existing Linux deployment host, use its private validated environment:'; assert anchor in s
entry = ('With `observeReceipts: true`, the same owner reads the selected environment’s known release/operator-preview receipt files and current pointer through the plain-file boundary. V2 identities bind actual admitted sealed source/generation bytes; successful static steps and existing current overlay must agree. Filename/byte changes invalidate the observation. Legacy v1 and failed/no-binding records remain explicit. Historical releases retain possible rollback resources; database backup v1 supplies no Sky-publication backup contract. Recorded file claims are separate from live mounts and do not complete the reference set. The CLI below enables both observations. Non-deploy `loadSkyStaticDelivery` still selects prepared state and requires further current/receipt/runtime binding.\n\n')
s = s.replace(anchor, entry + anchor, 1); p.write_text(s, encoding='utf-8')
p = TASK / 'scripts/capture-current-execution-2026-10-03.ps1'; s = p.read_text(encoding='utf-8')
s = s.replace('$sources = @(\n', '$sources = @(\n  "$taskRoot/scripts/record-receipt-retention-continuity-2026-10-03.py",\n  "$taskRoot/scripts/verify-receipt-retention-mutation-2026-10-03.mjs",\n', 1)
s = s.replace('$results = @(\n', '$results = @(\n  "$taskRoot/evidence/' + name + '",\n  \'output/sky-receipt-retention-development-1003-r1/result.json\',\n  \'output/sky-receipt-retention-development-1003-r1/mutation-output.txt\',\n', 1)
lines = s.splitlines()
for i,l in enumerate(lines):
    if l.strip().startswith("toolObserved='"):
        lines[i] = "    toolObserved='Same retention owner/CLI now binds validated-environment v2 release/operation/current files to actual admitted sources/sealed generations/existing overlays, separately from actual runtime and prepared claims. Successful missing binding/steps, foreign/links/tampering/current mismatch reject; legacy v1, failed and early null remain explicit. Filenames/bytes rechecked under lease; removing byte recheck mutation admits changed receipt and fails behavioral regression.45affected owner/consumer/release/preview checks pass. Local real files/injected Docker, not remote receipt/mount acceptance or independent review. Database-backup-v1 not a Sky contract; possible historical rollback references do not prove completeness. Nondeploy prepared resolver unchanged. No cleanup/deployment/publication/restart/SSH retry. Prior quality/source/device/full disk/capacity gaps preserved.'"
    if l.strip().startswith("next='"):
        lines[i] = "    next='PLAN D: bind nondeploy prepared-overlay consumer to actual current/receipt/runtime, inspecting check/stop/backup/inspect/maintain and legacy/failure/missing/mismatch/changing observation meanings. Receipt file bindings developed; remote/full rollback/Sky-backup references and physical retention unknown. No repeated SSH/runtime matrix/old inventory/HTTP/dryrun or cleanup/deploy. All admitted URLs/source/unknown refs retain. B complete quality/source processing/publication/Source Back open, local matching not adopted. Native page/devices/resources/host180GB and200DAU mixed capacity unverified.'"
p.write_text('\n'.join(lines)+'\n', encoding='utf-8')
baseline = json.loads((TASK / 'evidence/current-execution-state-2026-10-03-r38.json').read_bytes()); count = 0
for v in baseline['currentSources']:
    if v['path'].startswith(('data-pipelines/', 'workers/', 'apps/', 'packages/')):
        p = ROOT / v['path']; assert p.stat().st_size == v['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest() == v['sha256']; count += 1
print(json.dumps({'otherProductionFilesExactAgainstR38': count, 'next': 'D_nondeploy_current_receipt_runtime_binding', 'cleanup': False}))
