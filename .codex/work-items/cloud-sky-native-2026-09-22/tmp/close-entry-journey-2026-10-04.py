from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[4];task='.codex/work-items/cloud-sky-native-2026-09-22';ev='experience-real-taro-entry-journey-2026-10-04.md'
def read(p):return (root/p).read_text(encoding='utf-8-sig')
def obj(p):return json.loads(read(p))
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
def write(p,s):(root/p).write_text(s,encoding='utf8',newline='')
if sys.argv[1]=='prepare':
 r=obj('output/sky-real-taro-entry-journey-readback-1004-r2/result.json');assert r['status']=='SAVED_ORIGINAL_MAP_SKY_COMBINED_RESOURCE_PARTIAL_DEVELOPMENT'
 rows='\n'.join('| '+k+' | '+str(v)+' |' for k,v in r['separateObservedMaxima'].items() if k in ['gpuTextureUploadModelBytes','gpuBufferUploadModelBytes','activeDecodedImageHandles','sourceRgbaEquivalentBytes','fsLogicalBytes','entries','leased','bytes','reserved','running','pending'])
 document=f'''# 原地图入口、同实例组合与跨家族资源开发读回

本增量只新增Sky任务脚本、保存证据和更新对应Sky Context；生产源码与云观星以外业务逻辑均未修改。六项Settings/outbox保护、原分支/HEAD、原BFF/watch、普通Prepared空registry/未采用保持。没有下载、重复月面加工、手机预览、提交推送、采购部署发布。Goal active，无预算，未完成。

## 原消费者和执行范围

完整原MapPage/SpotSkyPage/Sources JSX、实际已安装Taro/React/Query Provider、原marker事件/云观星按钮/Back、原搜索/Canvas手势/时间尺，执行原controller/service/当前真实公共影像。506前端和162服务project输入，r64的312当前源/六保护绑定；实际项目编译常量取当前config，未改Map逻辑。Map起始viewport/时间/报告由显式受控输入及隔离真实API初始化，第二提案是API客户端/原服务在in-memory隔离库创建的合成测试夹具，不是用户投稿UI/真实提交或发布。

native Map视觉、geometry、MapFS/Image/scroll/sensors/导航栈端口受控，软件GL真实执行；SCSS绑定但不合成。PNG只表示GL画布，不能替代WEAPP WXML/真机、真实地图UI/系统返回或生产容量。原BFF/watch未重启；隔离服务加载当前源码不证明原BFF加载。

## 同一正式点context/原Sky实例组合

原Map正式marker→FORMAL_SPOT解析→原云观星按钮→冷Sky/SAO→99.59°FOV银河/插画/地景→W3全部当前wanted 0/1/2/3/4/7→原三段球面拖动/地景渐隐→双网格/星座关闭恢复/W3关闭银河恢复→原地景关闭→M51定位与0.1°MEDIUM→0.05°DETAIL受控503保原MEDIUM→原公开retry真实DETAIL→原资料/来源route→hide全部活动退休→SourceBack同pose/DETAIL→原关闭资料按钮→Moon/Mercury/Mars及四OPAL家族切换/Saturn连续A/B/C环→暖Moon跟踪→原时间尺未来preview/cancel→actual hide/show→原SkyBack同Map/正式点/同地点同已提交时刻。

七个真实影像盘面consumer同一formal context由保存geometry/同帧painted identity与独立NumPy ENU/屏幕角径算术读回；独立算术不是独立星历真值。13类实际传入的图像资源包含银河、地景、星座插画、W3、深空HST、SDSS、月面/水星/火星/四OPAL；恒星目录、网格/星座线、相位/环和背景解析绘制仍属于同Scene，图像分类不是全部功能清单或将13家族全部同时显示。地景渐隐、层组合实际GL已查看。M51当前实际DETAIL暖底/颗粒/疑似绿晕仍明显，来源返回保持像素不改善图质；普通Prepared仍空/未采用。

SourceBack与暖Moon hide/show在本视场原始RGBA精确相等；13次单独GL-before/PNG/GL-after严格一致。它们不升级过去2/9 RGB channel差1的精确FAILED。当前时间cancel核pose/时刻，没有单独cancel PNG，不补称该状态精确像素。暖Moon图片HTTP0不表示decode0。

## 原proposal入口/返回的实际差异

原Map本人pending marker/原proposal-cloud按钮解析MAP_POINT与真实candidate坐标，天空报告保proposal_id而不伪造formal spot；实际GET本人200、匿名403/PERMISSION_DENIED、另一owner404/NOT_FOUND。请求凭证仅内存使用，不保存/打印。

返回的是原Map，Context/坐标/时刻保持，但候选点panel没有恢复，**FAILED_RETAINED**。当前Map的selectedSpotId为空且hide时关闭spot-panel（index.tsx约1902），已有逻辑未区分pending selection。r4完整组合因此任务超时，缺after binding/正常final。r5仅proposal入口/返回/退出在另一epoch复现panel差异，核原Map/坐标时刻、Sky root退休与final资源；不能将r5的最终退休倒填r4。遵守“不改云观星之外业务逻辑”，本轮不改Map，此消费者差异继续开放；重新点marker或降级回到地图都不代panel保持。

## 累计资源、临时峰与退休

r4在33?段之外实际累计{r['resourceObservations']}次资源观测，336 HTTP/15,017,980B收到body、未知received0；不把HTTP body当公网账单/IP-TLS出口。失败catch保存整个epoch的累计maxima及相应现场sample，2048尾部history截断不再冒全峰。以下MAX是分别测得，往往不在同一时刻，不能相加：

| 活动模型/压缩文件层 | 本epoch分别观测MAX |
| --- | ---: |
{rows}

GPU上传logical models不含驱动/纹理物理分配；sourceRGBA equivalent不含解码器working set、GC、native OS管理；MapFS为受控内存逻辑文件/暂存，不是微信200MB物理文件或package。峰sample保存同瞬间其他层，用户全小程序物理总资源、启动/尾延迟/帧时/真实网络与服务器CPU/RSS/磁盘仍缺。不能由这个上界模型证明200DAU或10/20人冷缓存容量。

本formal组合的Source hide、普通hide及正式Back活动图像/GL/租约/队列退休已保存。r5 scoped after506前端/162backend/r64的312源六保护/29公共read精确；最终registration/GL/encoded/lease/queue全0、MapFS只余26B清理inventory。本正式组合r4仅保存before、失败现场/累计max；根当前字节读回与r5after不使r4成为正常完整final。

## 失败代次及可复用输出

- r1任务遗漏原编译常量，Map未进入Sky；catch额外scope缺inspect，实际failed/resource保存保原。
- r2原正式入口/返回和final退休已有正结果，但selector缺scrollOffset，两浏览器错误使task FAILED。
- r3组合到SourceBack，原M51资料仍开而正确禁止Canvas手势；任务漏公开close，bounded wait FAILED，整epoch累计maxima保。
- r4补原关闭按钮后完成上述同实例组合，pending panel保持失败，before-only/无normalfinal保持。
- r5仅proposal scoped收口，panel FAILED继续；after/final/result均已保存后最后console误取未经过的formal returned导致TypeError/exit1，task仍FAILED。当前task只修console fallback，不为一条日志重跑旅程，保存executed-script差异显式核对。
- 根reader r1错误把W3 loaded对象直接放set而FAILED；r2按pixel/hash/dimensions核保存真实对象，无HTTP/renderer重跑，自审不是独审。

[组合r4失败与累计max](../../../../output/playwright/cloud-sky-real-taro-entry-journey-1004-r4/failed.json)、[r4全峰](../../../../output/playwright/cloud-sky-real-taro-entry-journey-1004-r4/failed-resource-summary.json)、[r5原入口导航](../../../../output/playwright/cloud-sky-real-taro-entry-journey-1004-r5/actual-both-entry-navigation.json)、[r5面板FAILED](../../../../output/playwright/cloud-sky-real-taro-entry-journey-1004-r5/proposal-return-panel-result.json)、[当前根保存读回](../../../../output/sky-real-taro-entry-journey-readback-1004-r2/result.json)。

完整原page冷暖体验仍缺follow/完整校准/断流/全景/模式/公共时间play-commit跨午夜的组合及真实UI，pending panel消费者差异保留。下一依当前PLAN，不能反复单独闭合九体/W3/M51/入口片段。B完整质量/rights/来源出版、静态retention实际引用、全200DAU成本/容量、native WXML FAILED、Android/iOS新版Moon与物理资源/独审继续开放。
'''.replace('r4在33?段之外实际累计','r4实际累计')
 write(task+'/evidence/'+ev,document)
 nxt='当前唯一下一依赖是A/D补同一原page的follow/完整校准冻结确认-取消/断流、全景/图层/暖红与公共时间play-commit跨午夜/跟踪/SourceBack/退出的组合结果及完整资源：复用当前实际Taro/Query/完整JSX/源与已采用图像，不单独重跑九体/W3/M51/原入口片段。原Map正式入口/返回、同formal Sky影像家族切换/细化503保粗及retry/SourceBack/暖Moon/preview-cancel/hide-show已有本代组合；r4pending返回panel FAILED无after-final，r5scope独立核返回/退休不倒填完整旅程。该Map消费者差异保FAILED且不改Sky以外业务逻辑；继续独立Sky组合，不静默把地图路由成功/重开marker代面板保持。失败也存累计maxima，按真正参与资源/同瞬间层区分compressed/decode/GPU/temp/retirement；物理总与native/设备仍缺。旧task/严格pixel失败不升级，无新证据不循环DevTools。只有实测瓶颈才优化queue/decode暖缓存或必要生命周期，SAO去重先复现实请求突发，不猜框架。B全质量/rights批量出版、空普通Prepared/HST矩形FAILED/M82缺输入、标准静态retention实际refs、Android-iOS新版Moon/200MBbinary包体、全200DAU成本/12Mbps10-20混合容量/180GB和独审保持。Goal active无预算，无生产/外部业务/六保护/原进程改变或提交推送采购部署发布。'
 p=task+'/PLAN.md';s=read(p);start=s.index('**当前唯一下一依赖（');end=s.index('\n',start)
 s=s[:start]+'**当前唯一下一依赖（2026-10-04原Map/Sky组合开发后）：** 同formal Sky跨13图像家族/全景层切换/M51失败保粗重试/SourceBack/暖Moon时间取消-hide-show及正式Map返回已有组合开发结果和完整累计资源模型。pending返回panel FAILED保留、不改Map；r4无正常final，r5scope不倒填。下一补follow/校准/断流、全景模式/时间play-commit跨午夜/跟踪来源返回完整组合；native/手机/全图质/物理/容量/独审仍缺。'+s[end:]
 start=s.index('当前唯一下一依赖是A/D原page完整冷暖组合');end=s.index('\n',start)
 addition='新增[原Map/Sky同实例组合及资源](evidence/'+ev+')：506frontend/162backend/r64的312源六保护，完整原正式marker-cloud入口/返回同Map同Context，99.59°W3全部wanted与layer/全天fade→M51 MED/DETAIL503保粗/retry/实际SourceBack→7真实影像家族/Saturn环→暖Moontrack/timepreview-cancel/hide-show，同formal context13类image输入；13GL-PNG-GL保存/独立NumPy ENU-screen算术、当前SourceBack与warmshowexact不升级旧2/9channel FAILED。r4累计36372modelobservations/HTTP33615017980B已知，MAX各层GLtex21757952/buf149208/native26/RGBAeq24117248/MapFS9307292/encoded2549111124/lease36/reserved1603796/running2/pending8；非物理总/不能相加或容量结论。本人pending入口context/真实HTTP200匿名403他人404，返回原Map同坐标时刻但原panel不恢复FAILED；Map约1902 hide逻辑未改，r4任务FAILED无after-final。r5只proposal scoped复现，506/162/312+6/29publicreads beforeafter及all0/26B后console undefined returned taskFAILED保；当前修日志不重旅程。Root r1set(dict) taskFAILED/r2读保存结果通过、自审非独审，第二epochfinal不倒填r4。M51暖底颗粒疑似绿晕仍实际可见、空Prepared/品质未过。\n\n'
 s=s[:start]+addition+nxt+s[end:];write(p,s)
 p=task+'/CONTINUE-CLOUD-SKY.md';s=read(p);s=s.replace('## 6. 当前依赖与尚未执行的工作','新增[原Map/Sky组合及全累计资源](evidence/'+ev+')：同formal Sky组合跨13实际图像家族/全景图层/M51细化失败保粗重试/SourceBack/暖Moon时间取消-hide-show与正式Map返回；累计模型保存，不冒物理总。pending原Map路由/坐标时刻返回但panel FAILED，遵守用户范围不改Map；r4无正常final，r5独立退休不倒填。所有task/旧pixel/native/图质/容量缺口保留，Goal active无预算，无产品或外部业务/六保护/进程变化。\n\n## 6. 当前依赖与尚未执行的工作',1)
 old='日月七行星公开consumer已有原page结果，r2全九段资源累计峰/final未存，warmMoon补段在另一epoch。下一原page完整冷暖组合、全部家族临时/总模型/退休及原spot-proposal入口返回；native/手机、完整视觉与物理资源仍缺，不独立重九体或已闭合链。';assert old in s
 s=s.replace(old,'同formal原page影像家族/全景图层/M51保粗恢复/SourceBack/暖Moon时间取消hide-show与正式Map入口返回已有组合/累计资源模型；pending面板返回FAILED无完整final，另epochscope退休不倒填。下一follow/校准/断流与全景模式/时间play-commit跨午夜/跟踪/来源/退出完整组合；不改外部Map业务、不独立重九体/W3/M51/入口片段。').replace('current-execution-state-2026-10-04-r64.json','current-execution-state-2026-10-04-r65.json');write(p,s)
 additions=[('project_context/architecture/runtime-and-domain.md','An original Map/Sky/Sources full-Taro development combination now observes formal-entry/return, family switches, failure/coarse recovery, SourceBack and warm-Moon time/hide under one formal context with accumulated compressed/decode-registration/GL/temporary-file maxima. These distinct resource models are not physical memory and cannot be summed into capacity. Original pending-proposal navigation preserves coordinates/time and authorization, but Map hides the pending panel and does not restore it on return; this consumer discrepancy remains FAILED and Map business code is unchanged. The failed combined epoch has no final binding; a separate scoped proposal epoch supplies after-binding/retirement without retroactive full-journey proof. See [combined consumer limits](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').'),('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md','原正式marker→云观星→同Map/Context返回及同Sky实例影像跨家族/全景图层/细化保粗重试/SourceBack/暖Moon时间取消-hide-show已组合观察，当前视场SourceBack/暖show原始像素精确不升级旧失败。本人pending原入口/权限与坐标时刻返回成立，但Map hide关闭其panel，返回panel保持FAILED；用户限定Sky范围，本轮不改Map。失败全程累计资源保存，另一epochscope的after/final退休不能倒填完整组合；模型不代物理/native/手机/图质/容量/独审。详[原入口与组合边界](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').')]
 for p,text in additions:
  s=read(p);pos=s.index('experience-real-taro-solar-public-2026-10-04.md');end=s.index('\n',pos);s=s[:end]+'\n\n'+text+s[end:];write(p,s)
 p=task+'/scripts/capture-current-execution-2026-10-03.ps1';s=read(p)
 names=['build-real-taro-entry-journey-2026-10-04.mts','experience-real-taro-entry-journey-2026-10-04.mts','readback-real-taro-entry-journey-2026-10-04.py'];s=s.replace('$sources = @(\n','$sources = @(\n'+''.join("  '"+task+'/scripts/'+n+"',\n" for n in names),1)
 paths=[task+'/evidence/'+ev,task+'/evidence/current-execution-state-2026-10-04-r64.json',task+'/tmp/create-entry-journey-2026-10-04.py',task+'/tmp/extend-entry-combination-2026-10-04.py',task+'/tmp/scope-entry-retirement-2026-10-04.py',task+'/tmp/close-entry-journey-2026-10-04.py','output/playwright/cloud-sky-real-taro-solar-public-1004-r4/continuity-checks.json']
 for folder in [root/f'output/playwright/cloud-sky-real-taro-entry-journey-1004-r{i}' for i in [1,2,3,4,5]]+[root/f'output/sky-real-taro-entry-journey-readback-1004-r{i}' for i in [1,2]]:
  paths.extend(p.relative_to(root).as_posix() for p in sorted(folder.iterdir()) if p.is_file() and p.name!='continuity-checks.json')
 s=s.replace('$results = @(\n','$results = @(\n'+''.join("  '"+q+"',\n" for q in paths),1)
 observed='r64 strict312+6protected. Original complete Map/Sky/Sources JSX actual Taro/React/Query with506frontend162backendproject. Original formal marker-cloud and sameMap/Context return, one formalSky full-sphere/W3allwanted-layer switches/M51MED-DETAIL503coarse retry/SourceBack/7realbitmapbodyfamilies-SaturnABC/warmMoontrack-rulerpreview-cancel-hide-show. All13 image family resource inputs/36372accumulated observations/MAX independent GL21757952buf149208-native26RGBA24117248-MapFS9307292encoded2549111124lease36reserved1603796running2pending8 nonphysical/nonadditive; HTTP33615017980B no unknownReceived. Current SourceBack/warmshowrawexact and13singleGLPNGGL/independent ENU-screen math not independent ephemeris. Pending proposal owner200/anonymous403other404/context coords-time return but originalMap panel closed FAILED; noMapbusinesschange. r1missing buildconstant/r2selectorScrollOffset/r3modalClose/r4pendingPanel/noafter-final/r5scoped-after-final thenloggingTypeError terminal taskFAILED preserved. Rootreader r1dictsetFAILED/r2saved readback/selfreview; r5scope506162312+6/29publicread exact/all0inventory26B not r4fullfinal. Original Moon/HST-M51/SDSS/OPAL rights-quality-native allgap unchanged; no production/outsidebiz/protected/process/budget/downloadprocessing/phone/commitpushdeployadoption changes.'
 s,n=re.subn(r"    toolObserved='[^\n]*'","    toolObserved='"+observed+"'",s);assert n==1
 s,n=re.subn(r"    next='[^\n]*'","    next='Originalpage follow-fullrotationcalibration confirm-cancel-stale/greatcircle-theme red/publictimeplaycommitmidnight-track-source-return complete combination and resources. Original formal/allfamily combination developed but failed r4pendingMap panel noafterfinal; scopedr5 final not retroactive. Pending consumer panel remainsFAILED with explicit nooutsideSkybusiness scope. Do not standalone replay W3M51ninebodyentry or unchanged DevTools. Bfullqualityrights-publication-emptyPrepared/HSTFAILED/M82inputs/nativeWXMLFAILED/Android-iOSnewMoon/200MBphysicalbinarypackage/staticretentionrefs/whole200DAUcost12Mbps10-20mixedcapacity180GB/independentreview remain.'",s);assert n==1;write(p,s)
 print(json.dumps({'prepared':True,'newEvidenceBindings':len(paths)}))
elif sys.argv[1]=='verify':
 cp=task+'/evidence/current-execution-state-2026-10-04-r65.json';state=obj(cp);previous=obj(task+'/evidence/current-execution-state-2026-10-04-r64.json')
 for key in ['currentSources','protected','evidence']:
  for row in state[key]:assert (root/row['path']).stat().st_size==row['bytes'] and sha(row['path'])==row['sha256'],row['path']
 old={r['path']:r for r in previous['currentSources']};changed=[r['path'] for r in state['currentSources'] if r['path'] in old and r!=old[r['path']]]
 assert set(changed)=={task+'/PLAN.md',task+'/CONTINUE-CLOUD-SKY.md',task+'/scripts/capture-current-execution-2026-10-03.ps1','project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'},changed
 new=[r['path'] for r in state['currentSources'] if r['path'] not in old];assert len(new)==3 and all(p.startswith(task+'/scripts/') for p in new)
 files=[task+'/PLAN.md',task+'/CONTINUE-CLOUD-SKY.md',task+'/evidence/'+ev,'project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'];links=0;missing=[]
 for p in files:
  for link in re.findall(r'\]\(([^)]+)\)',read(p)):
   link=link.strip('<>').split('#')[0]
   if not link or ':' in link or link.startswith('/'):continue
   links+=1
   if not ((root/p).parent/link).exists():missing.append([p,link])
 assert not missing,missing
 assert len(state['currentSources'])==315 and state['worktree']['stagedEntries']==0 and state['goal']['status']=='active' and state['goal']['budget'] is None
 assert state['processes']==previous['processes'] and {p['ProcessId'] for p in state['processes']}=={24040,18132}
 result={'status':'CURRENT_ENTRY_COMBINATION_PARTIAL_CONTINUITY_VERIFIED','checkpoint':cp,'checkpointSha256':sha(cp),'selectedSourcesExact':315,'evidenceExact':len(state['evidence']),'protectedExact':6,'changedSelectedSourcesFromR64':changed,'newSelectedSources':new,'productCodeChanges':[],'contextValidation':'exit0','diffCheck':'exit0','appTypecheck':'not repeated; product unchanged from pinned5.9.3 pass r58','ordinaryLocalLinks':{'files':5,'links':links,'missing':missing},'goal':{'status':'active','budget':None},'stagedEntries':0,'originalProcessesLive':state['processes'],'scope':'Same formal combination full accumulated resource models and original entry development; pendingMap panel FAILED/r4noafterfinal/r5scopedfinal-logtaskFAILED retained, selfreview not full/native/physical/quality/independent acceptance. No product/outside-business changes.'}
 write('output/playwright/cloud-sky-real-taro-entry-journey-1004-r5/continuity-checks.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
