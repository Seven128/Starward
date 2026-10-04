from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[4];task='.codex/work-items/cloud-sky-native-2026-09-22'
ev='experience-real-taro-w3-full-ready-source-retirement-2026-10-04.md'
def read(p):return (root/p).read_text(encoding='utf-8-sig')
def write(p,s):(root/p).write_text(s,encoding='utf8',newline='')
def obj(p):return json.loads(read(p))
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
if sys.argv[1]=='prepare':
 p=task+'/PLAN.md';s=read(p)
 start=s.index('**当前唯一下一依赖（');end=s.index('\n',start)
 s=s[:start]+'**当前唯一下一依赖（2026-10-04完整W3开发路径后）：** A/D当前适用视场W3六瓦片完整ready、稳定像素/来源披露、Source Back及final逻辑退休已有有界软件证据。下一推进横向全天/手势释放中断、跨午夜/公共时间尺与跟随校准等剩余组合，再核日月七行星及全部实际家族总资源；原生/手机/图质/物理/容量仍未验。具体范围见下面当前依赖段。'+s[end:]
 start=s.index('当前唯一下一依赖是A/D同页适用W3');end=s.index('\n',start)
 summary=f'新增[完整W3/公开披露和返回退休](evidence/{ev})：严格r58全294/六保护、401前端/162服务project/53公共read；原Hook仅任务诊断，99.589°六wanted/decoded/Scene供应、loading-failed false/decode pending0，原galactic撤下。五组actual GL前后-PNG严格，恒星Source前/后相机时刻选中和像素保持，独立W3披露实际消费但不与恒星Source packet混同。Source/final登记-lease-GL0/最后26B；66请求6272666B、回程1018607B非零网络。r1遗漏展开列表失败、299043620B无限工具历史/自然退出1/清理命令中断无停止回执保留；r2复用同bundle、修任务步骤/有界诊断，103310观察更新峰值行、2048历史，自审非独审/非产品优化。各层MAX file2624041、GL21757952/78288、native26/RGBA24117248、encoded2585029/reserved890719/running2，不求物理总峰；旧2tile分开PNG-RGBAFAILED仍历史。产品/其他业务/六保护/原进程/预算未改，无下载加工/提交发布。\n\n'
 nxt='当前唯一下一依赖是A/D同一真实整页剩余横向全天/公开手势释放与中断恢复：沿已绘相机/身份/时刻核全球连续浏览和地景渐隐，补跨午夜/公共时间尺预览取消提交/播放跟踪、跟随冻结校准确认取消断流及导航生命周期组合，再补日月七行星/所有实际影像家族owner账。当前W3六tile完整ready/稳定像素/实际披露-SourceBack/final及M51细化失败保粗-重试链有本代软件开发事实，不重跑闭合链或旧开关循环；六tile不当全天/全家族/图质通过。逐层区分encoded/冷lease/数值RLE/decode/native/GL/staging、替换临时峰与退休，注销不当GC，hide后最后frame是历史。复用installed Taro/provider/当前API project图/公共read epoch/单encoded owner与严格checkpoint；有实测瓶颈才优化队列/decode/暖缓存或提取必要生命周期，不重旧矩阵/无变化DevTools。只改Sky及必要共享依赖、不改外部业务或六保护，保32MiB/two-transfer/同帧完整性/lease-cancel-coarse。B完整背景接缝绿晕弱结构配准覆盖/rights/批量来源出版、空Prepared-science/HST矩形FAILED/M82缺输入；WEAPP/WXMLFAILED/Android-iOS新版Moon/200MB新旧binary/物理总峰/retention refs/whole200DAU成本出口CPU-RSS-DB-Redis-outbox-media/12Mbps10-20混合容量/180GB/独审仍开放。Goal active无预算，无提交推送采购云部署发布或重复下载加工。'
 s=s[:start]+summary+nxt+s[end:];write(p,s)
 p=task+'/CONTINUE-CLOUD-SKY.md';s=read(p)
 s=s.replace('## 6. 当前依赖与尚未执行的工作',f'新增[适用W3完整加载/公开来源和退休](evidence/{ev})：原Hook实际六wanted/decoded/Scene供应与无pending，五组GL前后-PNG稳定；原W3披露和独立恒星Source Back保持原视场时刻/像素，Source/final活动退休/26B。有界诊断不改产品；r1漏展开列表/无限工具历史失败与自然退出、清理中断无停止回执保留，r2正常退出。只云观星任务/Context修改，六保护/原BFF-watch保持，非WXML/物理/图质/独审通过。\n\n## 6. 当前依赖与尚未执行的工作',1)
 s=s.replace('选中细化失败保粗已有本轮有界证据；下一组合为适用W3全ready/稳定同帧及退出资源，再补横向全天/释放中断及跨午夜/时间尺等剩余义务；native/手机、全家族与物理资源仍缺。','选中细化失败保粗与适用视场六张W3全ready/稳定像素/来源返回和逻辑退休已有本代有界证据；下一推进横向全天/手势释放中断及跨午夜/公共时间尺/跟随校准等剩余义务，再核日月七行星和全部实际家族；native/手机、全家族与物理资源仍缺。')
 s=s.replace('current-execution-state-2026-10-04-r58.json','current-execution-state-2026-10-04-r59.json');write(p,s)
 p='project_context/architecture/runtime-and-domain.md';s=read(p)
 old='Eligible wide W3 supplies real tiles and withdraws the galactic input, but its partial lane PNG/RGBA captures differ and full readiness/final resource evidence remain open.'
 assert old in s
 s=s.replace(old,'The earlier eligible-wide lane supplied only two tiles and its split PNG/RGBA captures differ; that failure remains historical. A subsequent complete-page software path diagnoses the unchanged original W3 Hook wanted/loaded/loading/failed states: all six wanted tiles at the tested 99.589° view reach decoded Scene supply, withdraw galactic, and preserve actual raw/screenshot pixels before and after Source Back. The original W3 disclosure and separate star Source route are distinct consumers. Source/final active native registrations, leases and GL models retire; bounded task peak diagnostics are not product optimization or physical GC. See [full W3 software scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').')
 write(p,s)
 p='project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md';s=read(p)
 old='适用99.589°W3两真实tiles与银河替换已有局部事实，但后续taskport失败/分开PNG-RGBA同帧FAILED、完整ready/final退休仍待。';assert old in s
 s=s.replace(old,'早期99.589°W3两tiles部分路径的taskport及分开PNG-RGBA同帧FAILED保留。后续真实整页在原Hook六wanted/loaded身份、无loading/failed/pending及Scene供应齐全条件下取得稳定GL前后-PNG；原W3列表来源披露与独立恒星Source Back分别执行，回程保相机时刻/选中/像素，Source/final登记-lease-GL归零。六tile仅该视场，逻辑退休不冒物理GC/整天球覆盖，任务诊断限额不冒产品优化。详[完整W3软件证据](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').')
 write(p,s)
 p=task+'/scripts/capture-current-execution-2026-10-03.ps1';s=read(p)
 new=[task+'/scripts/'+name for name in ['build-real-taro-w3-ready-journey-2026-10-04.mts','experience-real-taro-w3-ready-journey-2026-10-04.mts','readback-real-taro-w3-ready-journey-2026-10-04.py']]
 s=s.replace('$sources = @(\n','$sources = @(\n'+''.join("  '"+path+"',\n" for path in new),1)
 paths=[task+'/evidence/'+ev,task+'/evidence/current-execution-state-2026-10-04-r58.json',task+'/tmp/create-w3-ready-journey-2026-10-04.py',task+'/tmp/close-w3-ready-2026-10-04.py','output/playwright/cloud-sky-real-taro-w3-selected-1004-r4/continuity-checks.json']
 for folder in [root/'output/playwright/cloud-sky-real-taro-w3-ready-1004-r1',root/'output/playwright/cloud-sky-real-taro-w3-ready-1004-r2',root/'output/sky-real-taro-w3-ready-readback-1004-r1']:
  paths.extend(p.relative_to(root).as_posix() for p in sorted(folder.iterdir()) if p.is_file() and p.name!='continuity-checks.json')
 s=s.replace('$results = @(\n','$results = @(\n'+''.join("  '"+path+"',\n" for path in paths),1)
 observed='r58 strict294+6protected; actual401frontend162backendproject53publicread. Original W3 hook diagnostics only; sixwanted-loaded-Scene supply at99.589deg loadingfalse failedfalse decodepending0/galacticwithdrawal. Five rawbefore-PNG-rawafter pairs exact; actual public W3 disclosure distinct from paintedstar Source route; Back sameSkyinstance-camera-instant-selection-pixels. Source-final registrations-lease-GL0/final26B;66HTTP6272666B/sourcewarm1018607B notzero network.103310modelcallback observations boundpeakrows/2048history, no product optimization. Independent maxima fs2624041B texture21757952B buffer78288B native26 sourceRGBA24117248B encoded2585029B reserved890719B running2 retired50; not physicaltotal. r1missinglistopenFAILED/unbounded299043620B toolhistory/naturalexit1/cleanupinterrupted before StopProcess receipt preserved; r2taskfix reused401bundle exit0/root savedselfreview. OldtwoW3tile PNG-RGBAFAILED remains historical. No production/outsideSkybusiness/protected/budget/BFFwatch/downloadprocessing/phone/commitpushdeployadoption changes. Goalactiveunbudgeted.'
 nxt='PLAN actual horizontal-fullsphere-publicgesture releaseinterruption and recovery; crossmidnight-publicruler-previewcancelcommit/playtracking-followcalibration/navigation; then full solar/imagery families parsed-mask-decode-nativeGPU-encodedcoldlease-staging-temporarypeak-retirement. Do not replay closed current sixW3ready-Source-final/M51failure-retry-Source/oldtoggles/oldmatrices/unchangedDevTools. Bfullqualityrights-publication/emptyPrepared/HSTrectangleFAILED/M82inputs/nativeWXMLFAILED/Android-iOSnewMoon/200MBbinary/physicaltotal/retentionrefs/whole200DAUcost-egress12Mbps10-20mixedcapacity180GB/independentreview remain. Preserve contracts and nooutsideSkybusiness/no commitpushdeployadoption.'
 s,n=re.subn(r"    toolObserved='[^\n]*'","    toolObserved='"+observed+"'",s);assert n==1
 s,n=re.subn(r"    next='[^\n]*'","    next='"+nxt+"'",s);assert n==1;write(p,s)
 print(json.dumps({'prepared':True,'evidenceAdded':len(paths)}))
elif sys.argv[1]=='verify':
 cp=task+'/evidence/current-execution-state-2026-10-04-r59.json';state=obj(cp)
 for key in ['currentSources','protected','evidence']:
  for row in state[key]:assert (root/row['path']).stat().st_size==row['bytes'] and sha(row['path'])==row['sha256'],row['path']
 old={r['path']:r for r in obj(task+'/evidence/current-execution-state-2026-10-04-r58.json')['currentSources']}
 changed=[r['path'] for r in state['currentSources'] if r['path'] in old and r!=old[r['path']]]
 allowed={task+'/PLAN.md',task+'/CONTINUE-CLOUD-SKY.md',task+'/scripts/capture-current-execution-2026-10-03.ps1','project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'}
 assert set(changed)==allowed,changed
 new=[r['path'] for r in state['currentSources'] if r['path'] not in old];assert len(new)==3 and all(p.startswith(task+'/scripts/') for p in new)
 files=[task+'/PLAN.md',task+'/CONTINUE-CLOUD-SKY.md',task+'/evidence/'+ev,'project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'];count=0;missing=[]
 for p in files:
  for link in re.findall(r'\]\(([^)]+)\)',read(p)):
   link=link.strip('<>').split('#')[0]
   if not link or ':' in link or link.startswith('/'):continue
   count+=1
   if not ((root/p).parent/link).exists():missing.append([p,link])
 assert not missing,missing
 assert state['worktree']['stagedEntries']==0 and state['goal']['status']=='active' and state['goal']['budget'] is None
 assert {p['ProcessId'] for p in state['processes']}=={24040,18132}
 result={'status':'CURRENT_W3_READY_INCREMENT_CONTINUITY_VERIFIED','checkpoint':cp,'checkpointSha256':sha(cp),'selectedSourcesExact':len(state['currentSources']),'evidenceExact':len(state['evidence']),'protectedExact':6,'changedSelectedSourcesFromR58':changed,'newSelectedSources':new,'productCodeChanges':[],'contextValidation':'exit0','diffCheck':'exit0','appTypecheck':'not repeated; product sources unchanged from pinned5.9.3 pass r58','ordinaryLocalLinks':{'files':5,'links':count,'missing':missing},'stagedEntries':0,'goal':{'status':'active','budget':None},'originalProcessesLive':state['processes'],'w3SoftwareDevelopment':'six original wanted/decoded/Scene supply; paired pixels/source-back/final retirement saved-readback passed','scope':'Current task-only and Sky owner facts; no outside business or product logic edits. Historical failed epochs retained. No native/physical/full-family/quality/capacity/independent acceptance.'}
 write('output/playwright/cloud-sky-real-taro-w3-ready-1004-r2/continuity-checks.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
