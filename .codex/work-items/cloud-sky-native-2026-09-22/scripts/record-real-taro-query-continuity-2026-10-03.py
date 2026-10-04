"""Reconcile the actual Hook boundary and keep one next page dependency."""
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parents[4]; TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
prior=read(TASK/'evidence/current-execution-state-2026-10-03-r50.json')
for v in prior['currentSources']+prior['protected']:
    b=(ROOT/v['path']).read_bytes()
    assert len(b)==v['bytes'] and hashlib.sha256(b).hexdigest()==v['sha256'],v['path']
r=read(ROOT/'output/sky-real-taro-query-readback-1003-r2/result.json')
assert r['points']==[324,279,324] and r['protectedExact']==6 and r['nativeReadCount']==22
summary=('新增[真实Taro React/Query消费者](evidence/experience-real-taro-query-consumer-2026-10-03.md)：当前已装App React18.3.1/Taro renderer4.2.1/reconciler0.29.0与Query5.90实际运行Provider/useQuery/useResourceQuery/完整SAO Hook、Taro逻辑组件文本，未手写effect端口/安装依赖/改生产源码。164实际构建源前后及r50全271源/六保护精确；完整API科学校验/URL-env/hash/nativeUTF8/current catalog命名、真Node文件与实际BSC/Astronomy geometry供应。冷324点→hidden-clear Query/store文件0→同hash新identity返回一tile503保279→真实retry恢复324；扣原read delivery时hide-clear如约incomplete/lease1，迟到不恢复帧→lease0/I-O退休完→明确再清理活动资源0/26B空inventory。22 callback按descriptor/hash核，19受控请求正文1224096B非HTTP编码出口/容量，原failures累计1保持。r1-r6任务接入/期待/提前重试失败保留；r7断言/绑定保存后进程未自然退出，仅停验证任务叶进程，不认证静默/整轮exit通过。根读回固定21callback误判失败保留，r2核实际22；自审非独审。完整page/report-context消费者/Scene绘帧与公开UI/native仍缺，不升级r16旧源。无其他业务/共享BFF-watch重启/下载加工/部署采用。\n\n')
next_step=('当前唯一下一依赖是A/D的真实整页消费者：SAO完整Hook/Provider边界已取得上述开发事实，下一项以当前 `SpotSkyPage` 原完整JSX及实际 `useSkyForecastQuery`/`useResourceQuery`/同一Query Provider执行清缓存隐藏返回的小路径，接原context/report与Scene已绘帧/标签/点选责任，验证新delivery真正进入paint及公开重试动作；先核真实Taro页面生命周期/组件能力与现有隔离API/software/native端口，不用抽取Hook/effect/手写Provider冒整页。复用上述已安装renderer和当前API/源/单encoded owner，按实际descriptor/hash核文件/退休；已闭合Hook7阶段、五组合/solar/old9/clear2/rollback/static/加工矩阵不重跑。来源route/Back与完整时间/跟随校准仍按原义务保留，受控page不冒native验收；没有新根因不重启DevTools/BFF/watch。若实际平台能力不足，明确该层失败并转PLAN已有独立B/D事项，不新框架/换选型/扩大其他业务。保32MiB/two-transfer/同帧/科学bytes/完整写入/租约/取消迟到/粗回退及六保护，禁止修改云观星以外业务逻辑。B整图背景接缝绿晕弱结构配准覆盖/rights/来源批量出版、空Prepared/science registry/HST矩形FAILED/M82缺输入；旧新WEAPPbinary/200MB/native公开UI/WXMLFAILED/Android-iOS新Moon/物理总峰/retention refs/whole200DAU月成本流量/CPU-RSS-DB-Redis-outbox-media/12Mbps10-20混合容量/180GB/独审仍开放。Goal active无预算；无提交推送采购云部署发布或重复下载加工。')
p=TASK/'PLAN.md';s=p.read_text(encoding='utf-8');lines=s.splitlines()
i=next(i for i,l in enumerate(lines)if l.startswith('当前唯一下一依赖仍是D：'))
lines[i]=summary.rstrip()+'\n\n'+next_step;s='\n'.join(lines)+'\n'
old='D已修旧owner JSON漏计与迁移；核真正React/useQuery-provider消费者，完整图质/原生/物理/容量未验'
assert old in s;s=s.replace(old,'A/D已核真实Provider/完整SAO Hook；推进真实整页JSX/context-report/Scene消费者，完整图质/原生/物理/容量未验',1)
p.write_text(s,encoding='utf-8')
p=TASK/'CONTINUE-CLOUD-SKY.md';s=p.read_text(encoding='utf-8')
anchor='新增[旧owner回退与JSON库存保留]';i=s.index(anchor);end=s.index('\n\n',i)
s=s[:end+2]+summary+s[end+2:]
s=s.replace('current-execution-state-2026-10-03-r50.json','current-execution-state-2026-10-03-r51.json')
p.write_text(s,encoding='utf-8')
p=ROOT/'project_context/architecture/runtime-and-domain.md';s=p.read_text(encoding='utf-8')
old='full React useQuery/provider, Settings UI and native recovery remain unverified.'
assert old in s;s=s.replace(old,'At that earlier epoch, full React useQuery/provider, Settings UI and native recovery were unverified; the current complete Hook boundary is separately recorded below.',1)
anchor='See [catalog rollback and migration](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-old-binary-catalog-retention-2026-10-03.md).'
assert anchor in s
new=(' The installed app React/Taro renderer and reconciler now execute the actual QueryClientProvider/useQuery/useResourceQuery/complete SAO Hook, with real logical Taro component text and current full API/URL/environment/hash/UTF8 file path. Controlled native callbacks/storage/transport on isolated Node files supply cold/clear-hidden-return/partial-failure/explicit-retry and retained-read release evidence; no hand-written effect port or dependency update. Query store removal and observer-held old delivery are distinct. Actual file callbacks complete before retry can certify cleanup; pending native I/O must not be called complete. This is not full SpotSkyPage/report-context consumer, WXML/Canvas, public UI or native physical resource validation. The task process did not exit naturally after saved assertions and only its verified leaf was stopped; runtime process quiescence is not established. See [actual Taro React consumer scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-real-taro-query-consumer-2026-10-03.md).')
s=s.replace(anchor,anchor+new,1);p.write_text(s,encoding='utf-8')
p=ROOT/'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md';s=p.read_text(encoding='utf-8')
anchor='见[回退保留](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-old-binary-catalog-retention-2026-10-03.md)。';assert anchor in s
new=(' 当前已装真实Taro React/Query Provider与完整SAO Hook/实际逻辑组件文本已核clear新交付/partial保留/明确retry及hide-held-read退休；真实Node文件/完整API URL-hash科学验证不冒WEAPP宿主。整页SpotSkyPage/report-context/Scene与公开重试/Back消费者仍未由本项执行，原native/物理/图质缺口不变；任务自然退出未证。见[真实Hook消费者](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-real-taro-query-consumer-2026-10-03.md)。')
s=s.replace(anchor,anchor+new,1);p.write_text(s,encoding='utf-8')
p=TASK/'scripts/capture-current-execution-2026-10-03.ps1';s=p.read_text(encoding='utf-8')
names=['experience-real-taro-query-consumer-2026-10-03.mts','readback-real-taro-query-consumer-2026-10-03.py','record-real-taro-query-continuity-2026-10-03.py']
s=s.replace('$sources = @(\n','$sources = @(\n'+''.join(f'  "$taskRoot/scripts/{n}",\n'for n in names),1)
evidence=[str((TASK/'evidence/experience-real-taro-query-consumer-2026-10-03.md').relative_to(ROOT)).replace('\\','/')]
for rev in range(1,7):
    evidence += [f'output/sky-real-taro-query-1003-r{rev}/{n}' for n in ['failed.json','executed-script.mts']]
for n in ['result.json','trace.json','commits.json','requests.json','native-reads.json','scientific-inputs.json','source-bindings-before.json','source-bindings-after.json','observed-boundaries.json','metafile.json','consumer.mjs','executed-script.mts','process-completion.json']:
    evidence.append('output/sky-real-taro-query-1003-r7/'+n)
evidence += ['output/sky-real-taro-query-readback-1003-r1/failed.json','output/sky-real-taro-query-readback-1003-r2/result.json','output/sky-real-taro-query-readback-1003-r2/executed-readback.py']
for n in evidence: assert (ROOT/n).is_file(),n
s=s.replace('$results = @(\n','$results = @(\n'+''.join(f"  '{n}',\n"for n in evidence),1)
lines=s.splitlines()
observed=('r50 exact271pins+6protected/branchHEAD. Task-only/no production changes. Actual installed AppReact18.3.1/TaroReact4.2.1/reconciler0.29.0/Query5.90 Provider-useQuery-useResourceQuery-fullSAOHook and real logicalTaro text. 164 built sources before-after exact; full API/scientific/URL-env-hash-current catalog file/UTF8 native owner executes on isolated NodeFS with controlled native transport/storage/callback and actual BSC/Astronomy geometry. Cold324-clear hidden store/file0-epoch1-return newidentity samehash tile503 retains279-explicit retry324. Held read hide-clear incomplete lease1; actual latecallback lease0/no visibleframe; finish existing I/O and explicit clear completes owner entries-leases-bytes-reserved-running-pending-retired0/26Bemptyv2. 22reads bydescriptorhash;19controlledrequests1224096B not HTTP encoding/capacity; failures1 kept. r1-r6task failures retained. r7 saved assertions/source-after then task did not exit naturally; verified task leaf stopped/wrapperexit1/no process-quiescence claim. Rootreadback firstfixed21callbacks failed; r2actual22/current pins6protected exact/self-review. No fullSpotSkyPage/report-context/Scene/publicUI/native physical/quality/capacity/independent claim; no dependencies or otherbusiness/BFF-watchrestart/downloadprocessing/phone/commitpushdeployadoption.')
remaining=('PLAN A/D actualcomplete SpotSkyPage JSX/context-report forecast/resourceQuery with same installed TaroReact/QueryProvider and current Scene paint-label-picking consumers for clear-hide-return/newdelivery/public retry. Inspect real Taro page lifecycle/components first; reuse existing isolated API/software/native ports and descriptor-hash owner diagnostics, no extractedHook/effect/newframework as completepage. Do not replay closed Hook7-stage/5-solar-old9-clear2-rollback-static-processing or DevTools startup withoutnewrootcause. Preserveoneowner32MiB/two-transfer/scientific-frame-integrity-leases-cancel-coarsefallback/6protected/nootherbusinesslogic. ActualoldnewWEAPPbinary/full200MB/fullretentionrefs/nativegesture-time-followcalibration-sourceBack/WXMLFAILED/Android-iOS-newMoon/physicaltotal/whole200DAUcostmonthlyflow/CPU-RSS-DB-Redis-outbox-media/12Mbps10-20capacity/180GB/Bfullqualityrights-publication/independentreview remain. Goalactiveunbudgeted/no commitpushdeployadoption.')
for i,l in enumerate(lines):
    if l.strip().startswith("toolObserved='"):lines[i]="    toolObserved='"+observed+"'"
    if l.strip().startswith("next='"):lines[i]="    next='"+remaining+"'"
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(dict(protectedExact=6,priorSourcesExact=271,productionEdits=0,goal='active_unbudgeted',next='A_D_actual_complete_page_consumer')))
