"""Close current guard evidence and documentation using explicit UTF-8."""
from pathlib import Path
import json
root=Path.cwd();task=root/'.codex/work-items/cloud-sky-native-2026-09-22'
def edit(p,old,new):
    s=p.read_text(encoding='utf-8');assert old in s,(str(p),old[:70]);p.write_text(s.replace(old,new,1),encoding='utf-8')
o=root/'output/shared-flag-display-recovery-1003-r2/guard-closeout'
(o/'document-update-failed.json').write_text(json.dumps({'exitCode':1,'stage':'document update before first mutation','error':'Default GBK decoder rejected UTF-8 evidence; no document or product changed by this failed call.','intermediateCheckpoint':'r22 captured live branch/current source but retained previous tool summary and CONTINUE link; superseded by r23, not edited.'},indent=2)+'\n',encoding='utf-8')
paragraph='收口自审又补两项真实边界：已知bad扫描的fpM也必须有非空且匹配的实际PS_ID，否则未知processing不能授权恢复；导出必须与候选冻结recipe精确相同，不能保持estimate/version而换曲线。两个有界guard-removal mutation分别复现未知身份假恢复及换recipe后PNG改变；当前拒绝。最终五个受影响owner套件 **45项通过**。新增[当前守卫实际核对](../../../../output/shared-flag-display-recovery-1003-r2/guard-closeout/result.json) SHA256 `c8c9b7d5694599c90706ff533db89dd6f1df68fddcdbb9a8599fc7e115d98ef7`：当前owner只比原共享r2执行多这两项guard，原18个actualPS_ID全部已知匹配、当前冻结recipe相同，当前guarded producer消费保存estimate的三级PNG/元数据全部字节/值保持，其余原输入仍精确。原r2执行code snapshot不修改；新的guard-closeout分开绑定原执行/current owner，没有整图恢复或过滤重跑，旧当前输入报告只保当时执行条件。随后文档更新初次因默认GBK读取UTF-8失败，在首个写入前停止，[失败](../../../../output/shared-flag-display-recovery-1003-r2/guard-closeout/document-update-failed.json)保留；r22中间检查点保当时源码/旧文档状态，当前r23覆盖，不修改历史。\n\n'
p=task/'evidence/experience-cross-run-flag-display-recovery-2026-10-03.md';edit(p,'唯一下一依赖继续由[PLAN]',paragraph+'唯一下一依赖继续由[PLAN]')
p=task/'PLAN.md';edit(p,'独立display恢复owner和共享数值LOD出口已开发，','独立display恢复owner和共享数值LOD出口已开发，收口补未知bad-source处理身份拒绝及冻结recipe绑定、原18身份/三级当前读回保持，')
p=task/'CONTINUE-CLOUD-SKY.md';edit(p,'[current-execution-state-2026-10-03-r21.json](evidence/current-execution-state-2026-10-03-r21.json)','[current-execution-state-2026-10-03-r23.json](evidence/current-execution-state-2026-10-03-r23.json)')
edit(p,'独立display恢复owner和共享数值LOD出口已开发，','独立display恢复owner和共享数值LOD出口已开发，未知bad-source处理身份拒绝/冻结recipe绑定已补并核原18身份和当前三级保持，')
for relative in ['project_context/architecture/runtime-and-domain.md','data-pipelines/deep-sky/README.md']:
    p=root/relative;needle='Current recovery snapshots bind the old filter parent separately from new execution.'
    edit(p,needle,needle+' Known-bad scan flags require an actual matching processing ID; unknown identity cannot authorize recovery. Export retains the candidate frozen recipe. A subsequent two-guard closeout separately binds current code,18 actual identities and exact unchanged saved products without rerunning recovery/filtering.')
p=root/'project_context/external-capabilities.md';needle='新packet分开绑定旧过滤父证据和当前恢复code，不回填历史执行。';edit(p,needle,needle+'bad-source标记须实际处理身份匹配，导出绑候选冻结recipe；随后两guard修核分开保存当前code及原18身份/三级保持，不假称原执行用了后改代码。')
p=task/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8')
s=s.replace('$sources = @(\n','$sources = @(\n  "$taskRoot/scripts/verify-recovery-guards-2026-10-03.py",\n  "$taskRoot/scripts/closeout-display-recovery-2026-10-03.py",\n',1)
s=s.replace('$results = @(\n',"$results = @(\n  'output/shared-flag-display-recovery-1003-r2/guard-closeout/result.json',\n  'output/shared-flag-display-recovery-1003-r2/guard-closeout/executed-script.py',\n  'output/shared-flag-display-recovery-1003-r2/guard-closeout/sdss_display_recovery.py',\n  'output/shared-flag-display-recovery-1003-r2/guard-closeout/document-update-failed.json',\n",1)
needle='Related42 checks passed, added SKY regression then affected19 checks passed;';assert needle in s
s=s.replace(needle,'Final affected45 checks passed; later current owner adds only two guarded boundaries for known bad-source processing identity and frozen-recipe binding, with mutation regressions and actual18-identity/current saved-product exact readback. Original r2 owner snapshot is retained and later code is separately bound, no recovery rerun. Initial document-only GBK decoder failure made no edits; intermediate r22 retained previous tool summary/CONTINUE and is superseded by this complete checkpoint;')
p.write_text(s,encoding='utf-8');print(json.dumps({'documentsUpdated':6,'currentCheckpoint':'r23','guardCodeUnchanged':True}))
