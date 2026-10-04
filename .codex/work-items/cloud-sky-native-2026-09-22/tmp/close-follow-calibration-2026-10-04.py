from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[4];task='.codex/work-items/cloud-sky-native-2026-09-22';ev='experience-real-taro-follow-calibration-2026-10-04.md'
def read(p):return (root/p).read_text(encoding='utf-8-sig')
def write(p,s):(root/p).write_text(s,encoding='utf8',newline='')
def obj(p):return json.loads(read(p))
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
if sys.argv[1]=='prepare':
 result=obj('output/sky-real-taro-follow-calibration-readback-1004-r2/result.json');assert result['status'].endswith('FOUR_EPOCHS')
 r3=result['completedEpochs']['r3'];r4=result['completedEpochs']['r4'];max4=r4['separateObservedMaxima']
 document=f'''# 原页面完整旋转校准、断流与来源返回开发证据

本增量没有修改产品源码或云观星以外业务逻辑，没有调整资源预算或采用。401完整前端输入、162当前服务project源码图和r62全306源/六项设置-outbox保护严格绑定。四个独立contextId：r1/r2只有执行前绑定及失败快照、无结束绑定/最终退休；r3/r4前后保持，各68/83实际公共read文件当前字节保持。不能拼成同一context实例的完整冷暖旅程或最终验收。

使用已安装Taro/React/Query Provider、完整原SpotSkyPage与Sources JSX、原Canvas touch/实际按钮和原controller/tracker。本机隔离API使用原controllers/service/astronomy/assets与fixture天气/测试正式点。受控`getDeviceInfo.platform=android`提供合法degree事件，80ms持续回调与原Date.now/500ms计时，不模拟手机硬件或认证Android/iOS；其他系统/geometry/MapFS端口为DevTools式受控值。原controller/tracker body保持，只读changed/raw/snapshot诊断；r3新增保留原JSX确认闭包并把同一闭包返给原按钮的任务诊断，生产页未改。SCSS绑定而未合成，PNG只取软件WebGL，不供native UI/WXML/手机/姿态性能。

## 实际结果与历史失败

1. **r1广角/冻结：** 原公开“跟随手机”进入live，改变alpha/beta/gamma确实改变已绘相机；公开pinch至>90°后“重新校准”回45°，冻结实际完整basis。继续完整俯仰/侧倾/方位变化时raw变而paint basis与raw pixels精确不变。原Canvas拖动/双指事件被编辑状态忽略，时间控件disabled。确认前在同一个同步evaluate中先送最新180/-65/60原回调再原“确定”tap，没有RAF先画它；原owner从editing转aligned。之后任务深相等失败，最大已绘basis差6.106226635438361e-16，r1自然exit1保留，不称最终退休。
2. **r2确认/取消：** 同r1 bundle、仅任务修矩阵运算roundoff比较/缩小原atomic paint诊断，并`post-confirm-only`建立新普通follow/freeze，未重r1广角/输入锁段。确认前后RGBA精确，无确认跳帧。225/-120/-30确实继续三轴跟随；第二次冻结后移动260/-50/45再公开“取消”，恢复原校准关系下当前姿态，非回到旧姿态。断流后STALE、ready false、needs-alignment、原“确定”控件消失。
3. **r2任务节点身份失败：** 缓存逻辑“确定”节点再tap，状态变CALIBRATING/参照epoch2→3；没有变aligned。根据实际新启动事件及原处理代码，它触发的是重连。r3同路径直接读到这个节点文本已变“重新连接”：React/Taro复用节点，不是原确认回调。r2自然exit1、无最终退休保留，不能称过期确认被接受或原queued callback无效。
4. **r3真实过期回调/新参照：** `outage-source-only`不重r2确认/取消段。任务额外诊断保留并明确调用**原JSX确认闭包**，不向复用节点派发事件、不直接调用controller。原Date.now计时实际断流后调用，before/after相同、STALE/ready false/needs-alignment保持。新有效300/-95/20样本仍保冻结视图；原公共校准/最新未绘330/-55/-55确认后，以355/-115/35继续真实三维结果。旧generation回调在Source隐藏时无效。
5. **r3 Sources/Back：** 原已绘恒星pick/原来源按钮进入原Source页面，方向监听/活动图像登记/GL/lease全退休；原CustomNav Back恢复同相机时刻且新参照needs-alignment/ready true。严格前后取图各自成立，但回程对原图有2像素2RGB通道各差1、alpha不变，**精确回程相等FAILED保留**。未记录本次resident窗口，不把旧r61因果对照倒填到此case，不设像素容差或声称原生视觉过关。
6. **r4 Back后真正恢复跟随：** 同r3诊断bundle、`source-reanchor-only`只建立必要已校准Source入口并验证未闭合的返回消费者，不重广角/锁定/首轮取消/断流。原Source/Back同Sky实例且Source root实际卸载；本视场返回RGBA精确，不改判r3/旧整周失败。返回后公开“重新校准”、同同步回合最新45/-70/-60确认，再95/-125/40：owner和实际paint回到aligned并随三轴移动。Back-held→确认RGBA精确，后续follow图实际改变。原监听最多各1，Source/final活动全退休。

根另用NumPy轴矩阵核原Android degree到ENU及`target × referenceᵀ × current`，不调用Quaternion.js或生产校准实现生成期望。原raw、aligned owner、实际paint的本代最大算术误差7.771561172376096e-16；错误采用确认前300度旧raw参照，实际误差0.6257965221436887。128×float64 epsilon只用于小矩阵浮点运算检查，不是产品/设备姿态或图像容差；原r1逐浮点字节相等FAILED保留。共20组完成capture均GL前→PNG→GL后精确；不同epoch之间不合并pixel/effect/资源。

已查看保存的确认与三轴follow图、Source Back后follow图；星空及插画随完整旋转改变。控件状态从原逻辑树另核，不把Canvas PNG当WXML控件合成。根保存readback为自审，独立审查MISSING。原r3 execution-mode说明文字沿用r2描述，真实mode/outage分支以保存executed script为准；r4亦沿用该旧描述，mode/source-reanchor分支已绑定，不据其旧说明缩小结果。

## 分层资源与出口

| 完成epoch | 请求/收到正文 | 模型观察 | 含staging文件logical MAX | encoded MAX |
| --- | --- | --- | --- | --- |
| r3 | {r3['requests']} / {r3['receivedBodyBytes']}B | {r3['resourceObservations']} | {r3['separateObservedMaxima']['fsLogicalBytes']}B | {r3['separateObservedMaxima']['entries']}项 / {r3['separateObservedMaxima']['bytes']}B |
| r4 | {r4['requests']} / {r4['receivedBodyBytes']}B | {r4['resourceObservations']} | {max4['fsLogicalBytes']}B | {max4['entries']}项 / {max4['bytes']}B |

r4独立MAX GL texture上传模型{max4['gpuTextureUploadModelBytes']}B、buffer{max4['gpuBufferUploadModelBytes']}B、活动native登记{max4['activeDecodedImageHandles']}、源RGBA等价{max4['sourceRgbaEquivalentBytes']}B、reserved{max4['reserved']}B/running{max4['running']}/pending{max4['pending']}。每观察更新峰值行/history2048，持续合成事件及软件GL/取图/诊断自身有开销，不能当native性能或把不同时间MAX相加成物理总峰。两个完成epoch final登记/GL/encoded/lease/Query/pending全0，inventory26B；不是GC/200MB binary/云200DAU或12Mbps容量。r1 atomic误含完整mask的11,459,231B文件是工具诊断产物，r2起保存compact view；不当产品磁盘或native内存。

## 当前入口

- [r1失败](../../../../output/playwright/cloud-sky-real-taro-follow-calibration-1004-r1/failed.json)、[r2节点身份失败](../../../../output/playwright/cloud-sky-real-taro-follow-calibration-1004-r2/failed.json)
- [r3完成结果](../../../../output/playwright/cloud-sky-real-taro-follow-calibration-1004-r3/result.json)、[真实原闭包过期回调](../../../../output/playwright/cloud-sky-real-taro-follow-calibration-1004-r3/late-original-confirm-after-outage.json)
- [r4完成结果](../../../../output/playwright/cloud-sky-real-taro-follow-calibration-1004-r4/result.json)、[原Sources/Back实例事实](../../../../output/playwright/cloud-sky-real-taro-follow-calibration-1004-r4/actual-navigation.json)、[最新确认回执](../../../../output/playwright/cloud-sky-real-taro-follow-calibration-1004-r4/source-back-latest-reference-confirmed-atomic-confirm.json)
- [三epoch旧根读回](../../../../output/sky-real-taro-follow-calibration-readback-1004-r1/result.json)、[四epoch当前根读回](../../../../output/sky-real-taro-follow-calibration-readback-1004-r2/result.json)、[当前reader](../scripts/readback-real-taro-follow-calibration-2026-10-04.py)
- [唯一PLAN](../PLAN.md)：下一实际page日月七行星/适用纹理/时间/选择与全家族资源，再完整冷暖组合/原入口返回。以上开发边界不消除此义务。

原整周9RGB通道相等FAILED、r61任务窗口对照未采用/无新容差、r3两通道精确回程FAILED保持。WEAPP/WXML FAILED、Android/iOS新版Moon、完整家族/物理资源/包体、Prepared registry空、完整B图质/rights/批量出版、静态保留引用、200DAU全产品成本/12Mbps10-20混合容量/180GB及独审均未验。产品/其他业务/六保护/原BFF-watch/预算保持；Goal active、无预算、未完成。无提交推送采购部署发布/新增数据下载加工。
'''
 write(task+'/evidence/'+ev,document)
 p=task+'/PLAN.md';s=read(p);start=s.index('**当前唯一下一依赖（');end=s.index('\n',start)
 s=s[:start]+'**当前唯一下一依赖（2026-10-04完整旋转校准/返回开发后）：** A/D原跟随广角回45冻结、最新完整旋转确认/取消、500ms断流原回调拒绝、新参照及Source Back再次校准跟随已有四epoch开发证据，非同一全旅程；r1/r2任务失败及r3两RGB通道回程相等FAILED保持。下一核实际page日月七行星与适用影像/时间/选中细化、全部参与家族资源和退休/临时峰，再完整冷暖/原入口返回；原生/图质/物理/容量仍缺。'+s[end:]
 start=s.index('当前唯一下一依赖是A/D原整页跟随完整旋转冻结');end=s.index('\n',start)
 summary='新增[原整页完整旋转校准/断流与Back后恢复跟随](evidence/'+ev+')：401前端/162服务project/r62全306源六保护；r3/r4前后68/83公共read保持，四独立context epoch。r1广角回45冻结及三轴raw变化/Canvas输入锁定保持；最新未绘确认后逐浮点字节等失败6.1e-16/无final保持。r2同bundle修task算术/compact，确认pixel无跳/旧关系当前姿态cancel成立；cached节点tap被复用成重连导致task失败，无final保持。r3仅原JSX闭包任务诊断，真实500msSTALE原确认回调不生效/新有效参照仍持视图/最新确认后跟随；Source retired/Back相机时刻保持但2RGBdelta1精确FAILED。r4仅未闭合SourceBack校准新参照/45--70--60最新确认/后续三轴跟随，同Sky实例/Source root卸载，确认前后及本视场回程pixel精确。根NumPy轴/rigid矩阵误差最大7.8e-16、错误旧raw参照0.6258，自审非独审；小矩阵128epsilon不供像素容差。20单次raw-PNG-raw严格；r3/r4各80HTTP5996965B/95HTTP6147317B，MAX分层/diagnostic overhead不求物理总，各final活动全0/26B。产品/其他业务/六保护/原进程/预算保持，不作native-phone-quality-capacity通过。\n\n'
 nxt='当前唯一下一依赖是A/D真实page日月七行星与全部实际影像家族：沿原公共搜索/点选/定位/跟踪与缩放/时间，核真实位置/相位/角尺寸、适用Moon-Mars-Mercury/OPAL-profile/Saturn环等供应与出处、细化失败保粗，所有真正参与家族/临时峰/退休；再核完整冷暖组合与原spot/proposal入口返回，不能以四epoch模块结果当完整旅程。跟随/校准/断流/SourceBack再校准已有原page开发结果，无新机制不重广角/冻结/取消/过期回调/旧矩阵；r1/r2任务失败、r3两通道相等FAILED及旧整周9通道FAILED保持，无新像素容差/窗口策略采用，不倒填未记录窗口原因。无需重W3ready-Source/M51细化失败重试/横向整周混合手势或无变化DevTools；新实测偏移/缺图/源变更才重开对应责任。全部有效需求保持，great-circle非所有纬度/六W3非全天/注销非GC；复用Taro/provider/当前API project图/公共read epoch/单encoded owner/严格checkpoint，只实测支持才调队列decode暖缓存或生命周期。只改Sky及必要共享依赖，不改外部业务/六保护，保32MiB/two-transfer/完整性/lease-cancel-coarse。B背景接缝绿晕弱结构配准覆盖/rights/批量来源出版、空Prepared-science/HST矩形FAILED/M82缺输入；WEAPP/WXMLFAILED/Android-iOS新版Moon/200MBbinary/物理总峰/retention refs/whole200DAU成本出口CPU-RSS-DB-Redis-outbox-media/12Mbps10-20混合容量/180GB/独审仍开放。Goal active无预算，无提交推送采购云部署发布或重复下载加工。'
 s=s[:start]+summary+nxt+s[end:];write(p,s)
 p=task+'/CONTINUE-CLOUD-SKY.md';s=read(p)
 s=s.replace('## 6. 当前依赖与尚未执行的工作','新增[完整旋转校准/断流/Back后再跟随](evidence/'+ev+')：原page广角回45冻结、最新未绘完整旋转确认不跳/旧关系下当前姿态cancel、500ms断流原确认闭包拒绝、新参照持视图及Source Back原控件再校准跟随已有四epoch开发证据，非同实例全旅程。r1逐float精确失败/r2复用节点事件身份失败无final、r3两RGBdelta1回程相等FAILED保持；r4本视场pixel精确不升级历史，根算术仅float检查不是图像容差/独审。无产品/其他业务/六保护/原进程/预算变化。\n\n## 6. 当前依赖与尚未执行的工作',1)
 old='下一原跟随完整旋转冻结/校准确认取消/断流拒绝及导航返回，再日月七行星/全部家族；native/手机、完整视觉与物理资源仍缺，不重已闭合链。';assert old in s
 s=s.replace(old,'完整旋转校准/取消/真实断流/SourceBack再校准有四epoch新开发结果，r1/r2任务失败/r3两RGBdelta1相等FAILED仍保。下一实际page日月七行星/适用影像/时间选择及全部家族资源，再完整冷暖/原spot-proposal入口返回；native/手机、完整视觉与物理资源仍缺，不重已闭合链。').replace('current-execution-state-2026-10-04-r62.json','current-execution-state-2026-10-04-r63.json');write(p,s)
 additions=[('project_context/architecture/runtime-and-domain.md','Actual full-page calibration development now observes full-rotation frozen paint, latest accepted unrendered raw confirmation, old-relation/current-pose cancellation, real500ms expiry and SourceBack public new-reference confirmation/follow. A cached React/Taro logical button node can be reused for reconnect; expired-confirm testing retains the exact original JSX closure rather than treating node identity as callback identity. Independent axis/rigid-matrix readback and exact confirmation pixels support these software mechanisms only. Four context epochs are not a full experience; two RGB channels differ by one on one Source return and remain an exact-equality failure. No production filter/cache/float or pixel policy change; native/physical/device/independent review remains open. See [actual full rotation/control scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').'),('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md','原整页完整旋转校准开发已观察广角回45冻结、最新未绘raw确认不跳、取消恢复旧关系下当前姿态、真实500ms断流原确认闭包拒绝、新参照保持及Sources/Back后原控件重新确认并继续三轴跟随。React/Taro逻辑按钮会复用为重连，不能把旧node tap当原queued确认；四独立context epoch不代同实例完整旅程。一次Source回程2RGB通道差1的精确相等FAILED保持，另一视场及确认pixel精确不升级旧失败；仅小矩阵算术roundoff检查，无产品或像素容差修改。native/WXML/手机/物理/独审仍缺。详[完整旋转与原控件](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').')]
 for p,text in additions:
  s=read(p);pos=s.index('experience-real-taro-midnight-ruler-2026-10-04.md');end=s.index('\n',pos);s=s[:end]+'\n\n'+text+s[end:];write(p,s)
 p=task+'/scripts/capture-current-execution-2026-10-03.ps1';s=read(p);names=['build-real-taro-follow-calibration-2026-10-04.mts','experience-real-taro-follow-calibration-2026-10-04.mts','readback-real-taro-follow-calibration-2026-10-04.py']
 s=s.replace('$sources = @(\n','$sources = @(\n'+''.join("  '"+task+'/scripts/'+n+"',\n" for n in names),1)
 paths=[task+'/evidence/'+ev,task+'/evidence/current-execution-state-2026-10-04-r62.json',task+'/tmp/create-follow-calibration-2026-10-04.py',task+'/tmp/close-follow-calibration-2026-10-04.py','output/playwright/cloud-sky-real-taro-midnight-ruler-1004-r2/continuity-checks.json']
 for folder in [root/f'output/playwright/cloud-sky-real-taro-follow-calibration-1004-r{i}' for i in [1,2,3,4]]+[root/'output/sky-real-taro-follow-calibration-readback-1004-r1',root/'output/sky-real-taro-follow-calibration-readback-1004-r2']:
  paths.extend(p.relative_to(root).as_posix() for p in sorted(folder.iterdir()) if p.is_file() and p.name!='continuity-checks.json')
 s=s.replace('$results = @(\n','$results = @(\n'+''.join("  '"+path+"',\n" for path in paths),1)
 observed='r62 strict306+6protected; 401frontend162backendproject; four separatecontextepochs. r1wide-to45-fullfreeze/inputlock/latest unrenderedconfirm observed/exactfloat6.1e-16 taskFAILED/no final. r2samebundle taskfloatarith/compact post-confirm-only/no pixeljump/allaxes/oldrelation-current cancel; cachedlogicalnode reused reconnect event taskFAILED/no final. r3additional originalJSXclosure diagnostic/no productchange/outage-only real500msSTALE originalconfirm rejects/fresh holds/latest reanchor/fullrotation; Sourcehide owner-sensor-GLlease0/Backpose same but2RGBdelta1 exactreturnFAILED retained. r4same r3bundle/source-reanchor-only publicBacknewconfirm/follow consumer/sameSkyinstance/Source rootremoved/actualallaxes, held-confirm andthisviewreturnpixels exact. RootNumPy axis-rigid calc max7.8e-16/wrongpreconfirmrawref0.6258;128float64epsilon numeric only/no pixel policy tolerance.20singlecapture GLbefore-PNG-GLafter strict/r3-r4 beforeafter68-83publicread;80HTTP5996965B-95HTTP6147317B/maxima-separated/all activity final0/26B. r1atomic11MBmask diagnostic compactlater/not productdisk/physicalpeak. Fourepoch module evidence notfulljourney/native/phone/quality/capacity/independentreview. Product-outsidebusiness-protected-budget-BFFwatch-downloadprocessing-phone-commitpushdeployadoption unchanged. Goalactiveunbudgeted.'
 nxt='PLAN actualpage SunMoonsevenplanets/appropriate physicalgeometry-source-surfaces/time-selection-coarsefallback/allfamilyresources-retirement-temporarymodels; then wholecoldwarmcombinedjourney/originalspot-proposalentryreturn. Fourepoch follow-calibration module developed notsinglefulljourney; r1exactfloat-taskFAILED/r2logicalnodeidentity-taskFAILED/r3twoRGBdelta1returnFAILED/no tolerance remain; old9channel exactpixelFAILED retained. Do not replay closed wide/freeze/cancel/expiry-callback/W3readySource/M51failure/fullorbit/mixedgesture/oldmatrices/unchangedDevTools. Bfullqualityrights-publication/emptyPrepared/HSTrectangleFAILED/M82inputs/nativeWXMLFAILED/Android-iOSnewMoon/200MBbinary/physicaltotal/retentionrefs/whole200DAUcost-egress12Mbps10-20mixedcapacity180GB/independentreview remain. All requirements/nooutsideSkybusiness/no commitpushdeployadoption.'
 s,n=re.subn(r"    toolObserved='[^\n]*'","    toolObserved='"+observed+"'",s);assert n==1
 s,n=re.subn(r"    next='[^\n]*'","    next='"+nxt+"'",s);assert n==1;write(p,s);print(json.dumps({'prepared':True,'newEvidenceBindings':len(paths)}))
elif sys.argv[1]=='verify':
 cp=task+'/evidence/current-execution-state-2026-10-04-r63.json';state=obj(cp)
 for key in ['currentSources','protected','evidence']:
  for row in state[key]:assert (root/row['path']).stat().st_size==row['bytes'] and sha(row['path'])==row['sha256'],row['path']
 previous=obj(task+'/evidence/current-execution-state-2026-10-04-r62.json');old={r['path']:r for r in previous['currentSources']};changed=[r['path'] for r in state['currentSources'] if r['path'] in old and r!=old[r['path']]]
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
 assert len(state['currentSources'])==309 and state['worktree']['stagedEntries']==0 and state['goal']['status']=='active' and state['goal']['budget'] is None
 assert {p['ProcessId'] for p in state['processes']}=={24040,18132} and state['processes']==previous['processes']
 result={'status':'CURRENT_FOLLOW_CALIBRATION_INCREMENT_CONTINUITY_VERIFIED','checkpoint':cp,'checkpointSha256':sha(cp),'selectedSourcesExact':309,'evidenceExact':len(state['evidence']),'protectedExact':6,'changedSelectedSourcesFromR62':changed,'newSelectedSources':new,'productCodeChanges':[],'contextValidation':'exit0','diffCheck':'exit0','appTypecheck':'not repeated; product source unchanged from pinned5.9.3 pass r58','ordinaryLocalLinks':{'files':5,'links':count,'missing':missing},'stagedEntries':0,'goal':{'status':'active','budget':None},'originalProcessesLive':state['processes'],'module':'Four epochs original fullrotation-calibration/cancel/expiry/SourceBack-newpublicconfirm-follow developed; rootselfreview not singlewholejourney/native. r1-r2 taskfailed/no final retained; r3exactreturn2RGBdelta1FAILED; r4observed return/nojump exact does not pass oldfailed cases.','olderBackgroundExactPixelEquality':'FAILED_9_RGB_CHANNEL_DELTA1_OLD_WINDOW_UNOBSERVED_RETAINED','scope':'Task-only/Sky Context; no product/outside-business changes or native/physical/quality/independent acceptance.'}
 write('output/playwright/cloud-sky-real-taro-follow-calibration-1004-r4/continuity-checks.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
