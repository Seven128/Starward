from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[4];task='.codex/work-items/cloud-sky-native-2026-09-22';ev='experience-real-taro-horizontal-interruption-2026-10-04.md'
def read(p):return (root/p).read_text(encoding='utf-8-sig')
def write(p,s):(root/p).write_text(s,encoding='utf8',newline='')
def obj(p):return json.loads(read(p))
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
if sys.argv[1]=='prepare':
 p=task+'/PLAN.md';s=read(p);start=s.index('**当前唯一下一依赖（');end=s.index('\n',start)
 s=s[:start]+'**当前唯一下一依赖（2026-10-04横向整周/中断后）：** A/D公开30步362.439°横向great-circle、混合手势取消/释放/第三指及hide/show相机逻辑退休已有软件事实；后台前后9像素RGB各差1，原paint/编码来源相同但根因未证，像素完全一致FAILED保持。下一只核新decode/source-window/上传采样责任，再补跨午夜/公共时间尺/跟随校准与全部家族资源；原生/图质/物理/容量仍未验。'+s[end:]
 start=s.index('当前唯一下一依赖是A/D同一真实整页剩余横向全天');end=s.index('\n',start)
 summary=f'新增[横向整周/混合手势中断及返回像素差异](evidence/{ev})：401前端与上一代相同，162服务project/138公共read/r59全297源六保护精确；原公开74touch、30完成move围绕screen-up362.439°连续，非全天所有纬度。单指转双指/松一指/cancel整事务及像素恢复、完整release提交/迟到忽略/第三指取消有原页面事实。hide/show相机FOV时刻恢复、活动登记-lease-GL退休，final全部0/26B。后台前后原paint全等/编码来源保持但9像素9RGB各差1，单次raw前后-PNG仍严格；旧根完全相等FAILED保持，原reader归档、当前仅partial分类，不增容差/不倒改。149HTTP7901995B、39980模型观察/2048历史，独立MAX file4392565/GL17301504-82284/native29-RGBA25690112/encoded4286287-reserved890719-running2，不求物理总。产品/其他业务/六保护/原BFF-watch/预算未改，非SCSS-WXML-phone-quality-capacity-independent通过。\n\n'
 nxt='当前唯一下一依赖是A/D后台返回9个RGB通道各差1的来源绑定：不重整周或已闭合W3/M51/混合手势矩阵，只在小恢复路径记录新decode/source-window/GPU上传和原采样输入，区分原bitmap内容、不同驻留窗口的浮点采样与实际缺图/漂移；不能猜根因、建立容差冒通过或凭bit差改产品缓存框架。证据若支持修复，只改责任owner及实际消费者、保成功/失败/迟到/同帧/lease/coarse，再核受影响路径；若是精确位图检查边界则仍保历史失败并明确证明范围。然后推进跨午夜/公共时间尺预览取消提交/播放跟踪、跟随冻结校准确认取消断流/导航生命周期组合及日月七行星和全部实际影像家族资源。30步整周只great-circle不外推全天区域；W3六tile只已测视场；注销不当GC，hidden最后frame是历史。复用installed Taro/provider/当前API project图/公共read epoch/单encoded owner/严格checkpoint，实测支持才调队列decode暖缓存或生命周期，不重旧闭合矩阵/无变化DevTools。只改Sky及必要共享依赖，不改外部业务/六保护，保32MiB/two-transfer/完整性/lease-cancel-coarse。B背景接缝绿晕弱结构配准覆盖/rights/批量来源出版、空Prepared-science/HST矩形FAILED/M82缺输入；WEAPP/WXMLFAILED/Android-iOS新版Moon/200MBbinary/物理总峰/retention refs/whole200DAU成本出口CPU-RSS-DB-Redis-outbox-media/12Mbps10-20混合容量/180GB/独审仍开放。Goal active无预算，无提交推送采购云部署发布或重复下载加工。'
 s=s[:start]+summary+nxt+s[end:];write(p,s)
 p=task+'/CONTINUE-CLOUD-SKY.md';s=read(p)
 s=s.replace('## 6. 当前依赖与尚未执行的工作',f'新增[公开横向整周/混合手势中断](evidence/{ev})：30完成move362.439°great-circle/74touch，取消及释放/第三指处理、hide/show相机与逻辑退休有真实原page软件证据。后台前后9像素9RGB各差1，原paint/编码来源相同、单次raw前后-PNG严格，完全相等FAILED保持；根只partial分类，不增容差或猜原因。产品和外部业务未改、六保护/原进程保持。\n\n## 6. 当前依赖与尚未执行的工作',1)
 old='下一推进横向全天/手势释放中断及跨午夜/公共时间尺/跟随校准等剩余义务，再核日月七行星和全部实际家族；native/手机、全家族与物理资源仍缺。';assert old in s
 s=s.replace(old,'横向整周及混合手势逻辑恢复已有本代有界事实，但后台9个RGB通道差1的原source-window/decode/上传原因未证，完全相等FAILED；下一只核该差异责任，不重整周，再补跨午夜/公共时间尺/跟随校准和日月七行星/全部家族；native/手机、全家族与物理资源仍缺。')
 s=s.replace('current-execution-state-2026-10-04-r59.json','current-execution-state-2026-10-04-r60.json');write(p,s)
 additions=[('project_context/architecture/runtime-and-domain.md','A subsequent complete-page public gesture path performs a continuous 362.439-degree great-circle turn about screen-up, then verifies mixed single/two-finger cancellation, remaining-finger release, complete-release commit/stale event rejection and third-finger cancellation. Actual page hide/show restores the original transaction camera/time with logical native/lease/GL retirement. The saved background-return paint snapshot and encoded sources are identical, but nine RGB channels differ by one; exact pixel equality remains FAILED, cause unverified. No tolerance, product code change, physical GC or full-latitude coverage follows. See [horizontal gesture/interruption scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').'),('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md','原公开Canvas事件已走30完成move/362.439°绕screen-up整周great-circle，非全天所有纬度。单指转双指/松一指/取消、完整释放与迟到事件/第三指处理及真实hide-show原相机/FOV/时刻恢复、逻辑资源退休有受控软件事实。后台前后原paint快照/编码来源完全相同，但9个RGB通道各差1，完全相等FAILED、根因未证，不能增容差或冒完整视觉恢复通过。没有产品/外部业务变化。详[横向整周/中断范围](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').')]
 for p,text in additions:
  s=read(p);pos=s.index('experience-real-taro-w3-full-ready-source-retirement-2026-10-04.md');end=s.index('\n',pos);s=s[:end]+'\n\n'+text+s[end:];write(p,s)
 p=task+'/scripts/capture-current-execution-2026-10-03.ps1';s=read(p)
 new=[task+'/scripts/'+name for name in ['build-real-taro-horizontal-interruption-2026-10-04.mts','experience-real-taro-horizontal-interruption-2026-10-04.mts','readback-real-taro-horizontal-interruption-2026-10-04.py']]
 s=s.replace('$sources = @(\n','$sources = @(\n'+''.join("  '"+path+"',\n" for path in new),1)
 paths=[task+'/evidence/'+ev,task+'/evidence/current-execution-state-2026-10-04-r59.json',task+'/tmp/create-horizontal-interruption-2026-10-04.py',task+'/tmp/inspect-horizontal-return-2026-10-04.py',task+'/tmp/close-horizontal-interruption-2026-10-04.py','output/playwright/cloud-sky-real-taro-w3-ready-1004-r2/continuity-checks.json']
 for folder in [root/'output/playwright/cloud-sky-real-taro-horizontal-interruption-1004-r1',root/'output/sky-real-taro-horizontal-interruption-readback-1004-r1',root/'output/sky-real-taro-horizontal-interruption-readback-1004-r2']:
  paths.extend(p.relative_to(root).as_posix() for p in sorted(folder.iterdir()) if p.is_file() and p.name!='continuity-checks.json')
 s=s.replace('$results = @(\n','$results = @(\n'+''.join("  '"+path+"',\n" for path in paths),1)
 observed='r59 strict297+6protected; actual401frontend unchanged162backendproject138publicread. Public30completed horizontalmoves362.439deg fullgreatcircle aboutscreenup/74touch; no timechanges/selection. Single-to-two finger/remainingfinger/cancel restores original camera-pixels, completerelease commits staleevents ignored, thirdfinger cancels. Actualpage hide-show restores transaction camera-FOV-instant/logical registration-lease-GL retirement; finalall0/26B. Backgroundexactpixel equalityFAILED retained:9pixels9RGBchannels delta1/paint entire snapshot same/encoded sources same/newnativeidentities; cause UNKNOWN source-window/decode/upload/sampling. Each9capture beforeGL-PNG-after exact; rootoldreader archived/currentpartialclassification no tolerance/no replay.149HTTP7901995B/39980modelobservations2048history; separateMAX fs4392565B texture17301504B buffer82284B native29 sourceRGBA25690112B encoded4286287B reserved890719B running2 pending8 retired136 notphysicaltotal. No product or outsidebusiness/protected/budget/BFFwatch/downloadprocessing/phone/commitpushdeployadoption changes. Goalactiveunbudgeted.'
 nxt='PLAN small backgroundreturn delta9RGB1 source-window-decode-upload-sampling binding; no guessing/tolerance/adoptedframe reset. Do not replay closed fullorbit-mixedgestures/W3readySource/M51failure chains/oldmatrices/unchangedDevTools. Then crossmidnight-publicruler-previewcancelcommit/playtracking-followcalibration/navigation/fullsolarfamily resources. Greatcircle notalllatitudes/sixW3notwhole sky/native retirement notGC. Bfullqualityrights-publication/emptyPrepared/HSTrectangleFAILED/M82inputs/nativeWXMLFAILED/Android-iOSnewMoon/200MBbinary/physicaltotal/retentionrefs/whole200DAUcost-egress12Mbps10-20mixedcapacity180GB/independentreview remain. Preserve contracts/nooutsideSkybusiness/no commitpushdeployadoption.'
 s,n=re.subn(r"    toolObserved='[^\n]*'","    toolObserved='"+observed+"'",s);assert n==1
 s,n=re.subn(r"    next='[^\n]*'","    next='"+nxt+"'",s);assert n==1;write(p,s);print(json.dumps({'prepared':True,'newEvidenceBindings':len(paths)}))
elif sys.argv[1]=='verify':
 cp=task+'/evidence/current-execution-state-2026-10-04-r60.json';state=obj(cp)
 for key in ['currentSources','protected','evidence']:
  for row in state[key]:assert (root/row['path']).stat().st_size==row['bytes'] and sha(row['path'])==row['sha256'],row['path']
 old={r['path']:r for r in obj(task+'/evidence/current-execution-state-2026-10-04-r59.json')['currentSources']}
 changed=[r['path'] for r in state['currentSources'] if r['path'] in old and r!=old[r['path']]]
 assert set(changed)=={task+'/PLAN.md',task+'/CONTINUE-CLOUD-SKY.md',task+'/scripts/capture-current-execution-2026-10-03.ps1','project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'},changed
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
 result={'status':'CURRENT_HORIZONTAL_INTERRUPTION_INCREMENT_CONTINUITY_VERIFIED','checkpoint':cp,'checkpointSha256':sha(cp),'selectedSourcesExact':len(state['currentSources']),'evidenceExact':len(state['evidence']),'protectedExact':6,'changedSelectedSourcesFromR59':changed,'newSelectedSources':new,'productCodeChanges':[],'contextValidation':'exit0','diffCheck':'exit0','appTypecheck':'not repeated; product source unchanged from pinned5.9.3 pass r58','ordinaryLocalLinks':{'files':5,'links':count,'missing':missing},'stagedEntries':0,'goal':{'status':'active','budget':None},'originalProcessesLive':state['processes'],'backgroundExactPixelEquality':'FAILED_9_RGB_CHANNEL_DELTA1_CAUSE_UNVERIFIED','scope':'Task-only/Sky owners; public fullgreatcircle/mixedgesture logical recovery evidence; no product/outside-business changes or native/physical/quality/independent acceptance.'}
 write('output/playwright/cloud-sky-real-taro-horizontal-interruption-1004-r1/continuity-checks.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
