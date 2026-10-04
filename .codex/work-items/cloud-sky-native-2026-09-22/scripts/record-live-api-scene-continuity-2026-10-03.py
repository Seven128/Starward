"""Keep one actual next dependency and scope after the measured live-port repair."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
baseline=json.loads((TASK/'evidence/current-execution-state-2026-10-03-r42.json').read_text(encoding='utf-8'));count=0
for v in baseline['currentSources']+baseline['protected']:
 if v['path'].startswith(('data-pipelines/','workers/','apps/','packages/','tools/deployment/')):
  raw=(ROOT/v['path']).read_bytes();assert len(raw)==v['bytes'] and hashlib.sha256(raw).hexdigest()==v['sha256'],v['path'];count+=1
summary=('新增[当前API/实际软件Scene与混合测量端口](evidence/experience-live-api-scene-and-mixed-protocol-2026-10-03.md)：当前page175/API149源去重270精确，真实隔离HTTP报告/BSC/星座/position/SAO/image已接当前page effects/paint/lifecycle/Scene，未预注入。r2五段20帧与101成功/2取消实际编码7279261B及Source Back/hide退休已核；但普通请求提前结束实际交集0，FAILED_NO_OVERLAP、任务async storage缺失及三个暖200保持。最终abort返回Node对象的RPC失败已用void修task，两held请求复现/关闭，未重五段。r3只补task异步storage和发起barrier，8普通请求与首个冷Scene实际37对交集，不延迟响应；58完成/编码1925356B/4软件帧及Caddy multiset读回，bootstrap/cold后/module restart三次各三304零正文，12→32真实chunk writes/23项2775121存储B。limited cold压力较小不解释旧三200。读回r1descriptor多字段误拒保失败、r2核三字段后通过。实际图查看/源270与原生产保护保持，不改其他业务逻辑/共享BFF/部署；仅软件协议，不冒WEAPP/物理资源/10-20容量/独审。\n\n')
next_step=('当前唯一下一依赖仍是D：沿已接真实HTTP的当前page/Scene，在同一实际context/time及家族owner补时间/跟踪、图层/全景与地景渐隐、选中细化失败保粗、取消迟到及返回的完整组合结果，并观察实际cache/queue/decode所有权和退休资源。复用现有真实端口与源，先核具体压力/缺口再优化，不重复已取得的冷矩阵、五段R5/static cohorts或新建框架；r2三个暖200仍须有实际owner原因才能处理，r3有限压力304不覆盖。普通业务只作隔离现有消费者，禁止改云观星以外业务逻辑。各epoch/编码正文/解码/物理层不混相加；fixture不冒生产population/provider权益费用、200DAU不当200并发。WEAPPencoding/实际UI-Back/WXML失败、Android+iOS/newMoon、物理端云峰/CPU-RSS/DB-Redis-outbox-media/12Mbps/10-20完整混合冷入口/月流量月费180GB及remote mounts-receipts-fullrollback/Skybackup仍缺，不循环SSH/DevTools或清理部署发布。B完整图质/背景接缝绿晕弱结构配准覆盖/rights/三级显示加工来源/批量出版与独审继续开放，ordinary Prepared/science registry空、HST矩形FAILED/M82完整输入缺；matching不采用，不重复下载/无变化加工，不缩减完整体验和最终验收。')
p=TASK/'PLAN.md';s=p.read_text(encoding='utf-8');assert '当前API/实际软件Scene与混合测量端口' not in s
lines=s.splitlines();i=next(i for i,l in enumerate(lines)if l.startswith('当前唯一下一依赖仍是D：'));lines[i]=summary.rstrip()+'\n\n'+next_step
s='\n'.join(lines)+'\n';old='D实际page/Scene接隔离context/report/catalog/figures/positions并与普通业务同场消费；已测业务编码单位，远端/全集/容量及B完整图质未验'
assert old in s;s=s.replace(old,'D当前实际HTTP/page-Scene补时间跟踪、图层全景渐隐、细化失败保粗及取消返回组合；最小交集和有限暖持久化已核，真实压力/物理/容量与B完整图质未验',1);p.write_text(s,encoding='utf-8')
p=TASK/'CONTINUE-CLOUD-SKY.md';s=p.read_text(encoding='utf-8');anchor='新增[隔离业务冷入口/真实编码出口]';i=s.index(anchor);end=s.index('\n\n',i)
s=s[:end+2]+summary+s[end+2:];s=s.replace('current-execution-state-2026-10-03-r42.json','current-execution-state-2026-10-03-r43.json')
scope='**最新持续授权范围补充：不得修改云观星以外的业务逻辑。** 普通业务仅作为隔离测试仓库中的现有消费者；云观星必需的共享依赖和文档维持责任边界，不借容量测量扩展其他业务。\n\n'
assert scope not in s;s=s.replace('这是一份独立恢复说明：',scope+'这是一份独立恢复说明：',1)
old='现在直接沿共享图质异常复用真源/母图/LOD，形成有依据的背景/接缝/弱结构处理候选，过质量与完整普通发布/来源条件再采用Prepared/default。'
new='当前唯一执行顺序直接见PLAN顶部及当前依赖段；共享图质异常继续复用真源/母图/LOD，过质量与完整普通发布/来源条件再采用Prepared/default。'
assert old in s;s=s.replace(old,new,1);p.write_text(s,encoding='utf-8')
p=ROOT/'project_context/deployment/decisions-and-verification.md';s=p.read_text(encoding='utf-8')
old='Actual WEAPP encoding, live page/Scene mixed consumption, production population/provider/host costs and capacity remain unverified.'
new=('Current full API/cache/catalog/position/SAO and extracted software page/Scene now consume live isolated HTTP without seeded report/catalog/figures/positions/images. The first five-condition task had zero actual ordinary/cold interval overlap and an incomplete async storage port; these failures remain. A bounded corrected task coordinates dispatch (no response delay), observes actual ordinary/cold request intersections and conditional zero-body 304s before/after cold demand and after client-module reload from task storage. This does not establish the higher-pressure warm miss cause, complete native journey, device persistence, physical client/server resources, actual WEAPP encoding, 10/20 cold-entry or production capacity. Other business logic is outside this work; ordinary consumers run only in isolated fixtures. Production population/provider/host costs remain unverified. See [current live consumers and limits](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-live-api-scene-and-mixed-protocol-2026-10-03.md).')
assert old in s;s=s.replace(old,new,1);p.write_text(s,encoding='utf-8')
p=TASK/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8')
files=['build-live-page-bundles-2026-10-03.mjs','live-page-bundle-generated-2026-10-03.mts','build-live-mixed-runner-2026-10-03.mjs','experience-live-mixed-api-scene-2026-10-03.mts','verify-live-abort-rpc-2026-10-03.mjs','readback-live-api-scene-2026-10-03.py','build-live-cold-dispatch-runner-2026-10-03.mjs','experience-live-cold-dispatch-2026-10-03.mts','readback-live-cold-dispatch-2026-10-03.py','record-live-api-scene-continuity-2026-10-03.py']
addition=''.join(f'  "$taskRoot/scripts/{name}",\n'for name in files)
for name in ['apps/wechat-miniapp/src/services/api-client.ts','apps/wechat-miniapp/src/services/response-cache.ts','workers/miniapp-api/src/constellation.controller.ts','workers/miniapp-api/src/constellation-publication.ts','workers/miniapp-api/src/sao-publication.controller.ts','workers/miniapp-api/src/sao-publication.ts']:
 if "'"+name+"'" not in s: addition+=f"  '{name}',\n"
assert '$sources = @(\n' in s;s=s.replace('$sources = @(\n','$sources = @(\n'+addition,1)
evidence=['.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-live-api-scene-and-mixed-protocol-2026-10-03.md',
 'output/playwright/cloud-sky-live-mixed-build-failed-1003-r1/failed-build.mts',
 'output/playwright/cloud-sky-live-mixed-1003-r1/runner-import-failed.mts','output/playwright/cloud-sky-live-mixed-1003-r1/live-failure.json',
 'output/playwright/cloud-sky-live-mixed-1003-r2/live-failure.json','output/playwright/cloud-sky-live-mixed-1003-r2/inputs-before.json','output/playwright/cloud-sky-live-mixed-1003-r2/inputs-after.json','output/playwright/cloud-sky-live-mixed-1003-r2/final-owner.json',
 'output/playwright/cloud-sky-live-mixed-readback-1003-r1/result.json','output/playwright/cloud-sky-live-abort-rpc-1003-r1/result.json',
 'output/playwright/cloud-sky-live-mixed-1003-r3/result.json','output/playwright/cloud-sky-live-mixed-1003-r3/inputs-before.json','output/playwright/cloud-sky-live-mixed-1003-r3/inputs-after.json','output/playwright/cloud-sky-live-mixed-1003-r3/warm-owner-readback.json','output/playwright/cloud-sky-live-mixed-1003-r3/dispatch-overlap.json','output/playwright/cloud-sky-live-mixed-1003-r3/wire-requests.json',
 'output/playwright/cloud-sky-live-cold-dispatch-readback-1003-r1/failed.json','output/playwright/cloud-sky-live-cold-dispatch-readback-1003-r1/executed-script.py','output/playwright/cloud-sky-live-cold-dispatch-readback-1003-r2/result.json']
for name in evidence: assert (ROOT/name).is_file(),name
assert '$results = @(\n' in s;s=s.replace('$results = @(\n','$results = @(\n'+''.join(f"  '{name}',\n"for name in evidence),1)
lines=s.splitlines()
for i,line in enumerate(lines):
 if line.strip().startswith("toolObserved='"):
  lines[i]="    toolObserved='Current rebuilt full API and extracted software page/Scene live HTTP measured. r2 fiveconditions20frames101success+2abort encoded7279261B, sourceBack/hide retirement verified; actual ordinary/cold intersection0 and missing asyncstorage/warm3x200 remain failed/open. NodeabortRPC serialization fixed only taskvoid with oldfailure/twoheldrequests regression. r3 affected cold dispatch+asyncstorage only: actual37intervalpairs/8ordinaryrequests,58completed encoded1925356B/4GLframes;3warmphases each3conditional304zero body,12to32actualasyncchunkwrites/23persistedentries2775121B/clientmodule reload observed. Caddyprivacy/statussize/PNG-RGBA/source270/currentproductionprotected readback. Limitedpressure does not explain old3warm200. First descriptor-extra-fields readback failure retained and threefield comparison fixed without HTTP rerun. No otherbusinesslogic/productcode/sharedBFFwrite-restart/download/SSH/deploy/adoption. No native/physical/10-20capacity/quality/wholecost/independentreview claim.'"
 if line.strip().startswith("next='"):
  lines[i]="    next='PLAN D: live current page/Scene samecontexttime families combine time-tracking/layers-panorama-landscapefade/selectedrefinementfailure-coarsefallback/cancel-late-return; observe exactcache-queue-decodeowner/retirement before optimisation. Reuse measured dispatch/storage ports; no oldcoldmatrix/fiveconditions/R5/staticcohorts or speculativeframework. Ordinarybusiness isolatedconsumers only; otherbusinesslogic forbidden. Priorwarm3x200 cause unknown, limitedr3conditional304 not substitute. NativeUIBack/WXMLfailure/devices/newMoon/physicaltotal/WEAPPencoding/12Mbps/10-20coldcapacity/productionCPU-RSS-DB-Redis-outbox-media/whole200DAUcostflow180GB/remotemountreceiptrollbackSkybackup/qualityrightsfullpublication/independentreview remain open. No SSH-DevTools loops, cleanup/deploy/publish/adoption.'"
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'productionAndProtectedFilesExactAgainstR42':count,'next':'D_live_combination_and_actual_owners','goal':'active_unbudgeted','otherBusinessLogicChanged':False}))
