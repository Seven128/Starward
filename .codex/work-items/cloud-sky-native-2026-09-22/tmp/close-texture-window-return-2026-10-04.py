from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[4];task='.codex/work-items/cloud-sky-native-2026-09-22';ev='experience-real-taro-texture-window-return-2026-10-04.md'
def read(p):return (root/p).read_text(encoding='utf-8-sig')
def write(p,s):(root/p).write_text(s,encoding='utf8',newline='')
def obj(p):return json.loads(read(p))
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
if sys.argv[1]=='prepare':
 p=task+'/PLAN.md';s=read(p);start=s.index('**当前唯一下一依赖（');end=s.index('\n',start)
 top='**当前唯一下一依赖（2026-10-04纹理窗口小路径后）：** A/D同source decode/相机/paint下，旧resident与fresh窗口集合能产生/消除小视场7个RGB通道差1，任务对照未采用/无新容差；原整周9通道相等FAILED不倒填。下一推进实际跨午夜/公共时间尺预览取消提交、播放跟踪与跟随完整校准，再核日月七行星/全部家族资源；原生/完整图质/物理/容量仍未验。'
 s=s[:start]+top+s[end:]
 start=s.index('当前唯一下一依赖是A/D后台返回9个RGB通道');end=s.index('\n',start)
 summary=f'新增[原decode/纹理窗口小路径因果对照](evidence/{ev})：401前端不变、162服务project/50公共read/r60全300源六保护绑定。15原Scene图像四态decodedRGBA hash/paint相机时刻精确；普通返回银河672×640→544²/一插画256×224→256×160，其余已记录窗口同，小视场7个RGB通道差1。任务-only请求旧合法resident集合，原getWindow body未换，保存画面恢复hide前；删除override/再次fresh返回，恢复原普通画面。五组单次raw-before/PNG/raw-after严格，任务对照未采用、不改缓存/预算/加容差或画质通过。原整周9通道精确FAILED保留、历史resident未记录，不倒填其确切原因。r1ClampedArray任务hash类型失败/r2零复制Uint8Array修port复用bundle，正常退出0/根自审；65HTTP6900151B，final活动0/26B，counter和2D诊断非普通物理峰。只Sky任务/Context、产品和其他业务未改，原进程/六保护/预算保持。\n\n'
 nxt='当前唯一下一依赖是A/D真实整页跨午夜/公共时间尺预览取消提交与播放跟踪组合：沿原时间/context/已绘Scene/查询身份和实际控件事件核localDate/UTC/timezone、取消恢复原相机时刻/跟踪、提交更新实际消费者；再推进跟随完整旋转冻结校准确认取消/断流拒绝及日月七行星/所有实际影像家族资源、前后台恢复。纹理窗口小路径已支持不同resident造成本视场7通道差1的机制，任务对照不采用；不凭旧9通道历史失败强制大窗口/禁用裁剪/建立容差，不倒填旧窗口或称后台完整视觉验收通过，原生/图质验收继续保此gap。无需重整周、W3ready-Source、M51细化失败重试或已闭合混合手势/旧矩阵/无变化DevTools；新的实测偏移/缺图/源变更才重开相关责任。全部有效需求保持，great-circle非所有纬度/六W3非全天/注销非GC；复用Taro/provider/当前API project图/公共read epoch/单encoded owner/严格checkpoint，只实测支持才调队列decode暖缓存或生命周期。只改Sky及必要共享依赖，不改外部业务/六保护，保32MiB/two-transfer/完整性/lease-cancel-coarse。B背景接缝绿晕弱结构配准覆盖/rights/批量来源出版、空Prepared-science/HST矩形FAILED/M82缺输入；WEAPP/WXMLFAILED/Android-iOS新版Moon/200MBbinary/物理总峰/retention refs/whole200DAU成本出口CPU-RSS-DB-Redis-outbox-media/12Mbps10-20混合容量/180GB/独审仍开放。Goal active无预算，无提交推送采购云部署发布或重复下载加工。'
 s=s[:start]+summary+nxt+s[end:];write(p,s)
 p=task+'/CONTINUE-CLOUD-SKY.md';s=read(p)
 s=s.replace('## 6. 当前依赖与尚未执行的工作',f'新增[decode与窗口恢复小路径](evidence/{ev})：15原Scene图像四态decodeRGBA hash/paint相机时刻保持；普通不同resident窗口集合产生7个RGB通道差1，任务旧合法窗口请求消除差异，撤override恢复普通结果。未采用/无产品或其他业务改动/新容差，原整周9通道相等FAILED不倒填。原六保护/进程/预算保持，非WXML/手机/图质/物理/独审通过。\n\n## 6. 当前依赖与尚未执行的工作',1)
 old='下一只核该差异责任，不重整周，再补跨午夜/公共时间尺/跟随校准和日月七行星/全部家族；native/手机、全家族与物理资源仍缺。';assert old in s
 s=s.replace(old,'新的小视场同decoded像素/paint下窗口集合对照支持7通道差1机制，旧9通道无历史窗口不能倒填；任务对照不采用、不强制大窗口或设容差。下一推进跨午夜/公共时间尺/播放跟踪，再跟随完整校准及日月七行星/全部家族；native/手机、完整视觉与物理资源仍缺，不重已闭合链。')
 s=s.replace('current-execution-state-2026-10-04-r60.json','current-execution-state-2026-10-04-r61.json');write(p,s)
 additions=[('project_context/architecture/runtime-and-domain.md','A later small actual-page hide/show probe binds all 15 scene-source decoded RGBA hashes and the unchanged getWindow owner request/result. Different contained resident versus fresh crop windows produce seven RGB channel changes of one; the explicit task-only old-window request restores the original pixels, and removing it restores ordinary fresh-window pixels. It is not adopted and introduces no tolerance/budget/cache change. Normalized shader origin/scale vary with resident windows; exact byte equality cannot certify source/pose ownership alone. The earlier nine-channel background equality failure remains historical with its missing window observations, not retrospectively explained or passed. Native/visual/physical acceptance stays open. See [window/decode differential scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').'),('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md','后续小视场hide/show绑定15原Scene图像四态decodedRGBA hash与paint/相机/时刻精确相同；原getWindow保较大resident与fresh小窗口集合产生7个RGB通道差1。明确任务对照请求旧合法窗口恢复原raw，撤销后恢复普通fresh raw；未采用、不改预算/缓存或新容差。原整周9通道精确相等FAILED及缺历史窗口保持，不倒填原因，不作完整视觉/原生通过。详[解码/窗口小路径](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').')]
 for p,text in additions:
  s=read(p);pos=s.index('experience-real-taro-horizontal-interruption-2026-10-04.md');end=s.index('\n',pos);s=s[:end]+'\n\n'+text+s[end:];write(p,s)
 p=task+'/scripts/capture-current-execution-2026-10-03.ps1';s=read(p)
 new=[task+'/scripts/'+name for name in ['build-real-taro-texture-window-return-2026-10-04.mts','experience-real-taro-texture-window-return-2026-10-04.mts','readback-real-taro-texture-window-return-2026-10-04.py']]
 s=s.replace('$sources = @(\n','$sources = @(\n'+''.join("  '"+path+"',\n" for path in new),1)
 paths=[task+'/evidence/'+ev,task+'/evidence/current-execution-state-2026-10-04-r60.json',task+'/tmp/create-texture-window-return-2026-10-04.py',task+'/tmp/close-texture-window-return-2026-10-04.py','output/playwright/cloud-sky-real-taro-horizontal-interruption-1004-r1/continuity-checks.json']
 for folder in [root/'output/playwright/cloud-sky-real-taro-texture-window-return-1004-r1',root/'output/playwright/cloud-sky-real-taro-texture-window-return-1004-r2',root/'output/sky-real-taro-texture-window-return-readback-1004-r1']:
  paths.extend(p.relative_to(root).as_posix() for p in sorted(folder.iterdir()) if p.is_file() and p.name!='continuity-checks.json')
 s=s.replace('$results = @(\n','$results = @(\n'+''.join("  '"+path+"',\n" for path in paths),1)
 observed='r60 strict300+6protected; actual401frontend unchanged162backendproject50publicread. Small publicpinch99-to-narrow actualhide-show,15scene source decodedRGBA hashes-fourstates/camera-instant-paint same. OriginalgetWindow body retained, diagnostics request-result; galactic resident672x640 vsfresh544square/art256x224vs256x160 produce7RGBchannels delta1. Task-only oldlegalwindow request restores beforepixelhash, deleting override/freshhide-show restores normalfreshhash; notadopted/no tolerance/cachebudget policychange. Five rawbefore-PNG-rawafter exact; original horizontal9RGBdelta1 exactpixel FAILED retained/oldwindow unknown/not retroactively bound. r1ClampedArray hash tasktypeFAILED/r2zero-copy Uint8Array taskportfix samebundle exit0/rootsavedselfreview.65HTTP6900151B/finalregistered-lease-GL-encodedall0/26B; 2Dhash/counterfactual resource metrics not ordinary physicalmemory/capacity. No product-outsidebusiness-protected-budget-BFFwatch-downloadprocessing-phone-commitpushdeployadoption changes. Goalactiveunbudgeted.'
 nxt='PLAN actual crossmidnight-publicruler-previewcancelcommit/playtracking; then follow full calibration/navigation/fullsolarfamily imagery resources. Windowhistory differential developed only task probe, no adoption/tolerance/forcedlargewindow; old9channel exactpixelFAILED retained nativevisualgap. Do not replay closed fullorbit/mixedgestures/W3readySource/M51failure/oldmatrices/unchangedDevTools; reopen for material neweffect. Bfullqualityrights-publication/emptyPrepared/HSTrectangleFAILED/M82inputs/nativeWXMLFAILED/Android-iOSnewMoon/200MBbinary/physicaltotal/retentionrefs/whole200DAUcost-egress12Mbps10-20mixedcapacity180GB/independentreview remain. Preserve all requirements/contracts/nooutsideSkybusiness/no commitpushdeployadoption.'
 s,n=re.subn(r"    toolObserved='[^\n]*'","    toolObserved='"+observed+"'",s);assert n==1
 s,n=re.subn(r"    next='[^\n]*'","    next='"+nxt+"'",s);assert n==1;write(p,s);print(json.dumps({'prepared':True,'newEvidenceBindings':len(paths)}))
elif sys.argv[1]=='verify':
 cp=task+'/evidence/current-execution-state-2026-10-04-r61.json';state=obj(cp)
 for key in ['currentSources','protected','evidence']:
  for row in state[key]:assert (root/row['path']).stat().st_size==row['bytes'] and sha(row['path'])==row['sha256'],row['path']
 old={r['path']:r for r in obj(task+'/evidence/current-execution-state-2026-10-04-r60.json')['currentSources']};changed=[r['path'] for r in state['currentSources'] if r['path'] in old and r!=old[r['path']]]
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
 result={'status':'CURRENT_TEXTURE_WINDOW_RETURN_INCREMENT_CONTINUITY_VERIFIED','checkpoint':cp,'checkpointSha256':sha(cp),'selectedSourcesExact':len(state['currentSources']),'evidenceExact':len(state['evidence']),'protectedExact':6,'changedSelectedSourcesFromR60':changed,'newSelectedSources':new,'productCodeChanges':[],'contextValidation':'exit0','diffCheck':'exit0','appTypecheck':'not repeated; product source unchanged from pinned5.9.3 pass r58','ordinaryLocalLinks':{'files':5,'links':count,'missing':missing},'stagedEntries':0,'goal':{'status':'active','budget':None},'originalProcessesLive':state['processes'],'windowDifferential':'new smallview7RGBdelta1 explained by original resident-window collection under task-only counterfactual; not adopted','olderBackgroundExactPixelEquality':'FAILED_9_RGB_CHANNEL_DELTA1_OLD_WINDOW_UNOBSERVED_RETAINED','scope':'Task-only/Sky owners; no product/outside-business changes or native/physical/quality/independent acceptance.'}
 write('output/playwright/cloud-sky-real-taro-texture-window-return-1004-r2/continuity-checks.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
