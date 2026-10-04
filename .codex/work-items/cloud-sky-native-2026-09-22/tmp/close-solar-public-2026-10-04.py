from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[4];task='.codex/work-items/cloud-sky-native-2026-09-22';ev='experience-real-taro-solar-public-2026-10-04.md'
def read(p):return (root/p).read_text(encoding='utf-8-sig')
def obj(p):return json.loads(read(p))
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
def write(p,s):(root/p).write_text(s,encoding='utf8',newline='')
if sys.argv[1]=='prepare':
 result=obj('output/sky-real-taro-solar-public-readback-1004-r3/result.json');assert result['status']=='SAVED_REAL_TARO_SOLAR_PUBLIC_BODY_IMAGE_PICK_TIME_RETIREMENT_DEVELOPMENT'
 maxima=result['separateObservedMaxima']
 rows='\n'.join('| '+b['reference']+' | '+str(b['altitudeDeg'])+' | '+str(b['diameterDeg'])+' | '+str(b['radiusPx'])+' | '+str(b['actualImageFamily'] or '解析外观')+' |' for b in result['distinctBodies'])
 document=f'''# 原页面日月七行星与月面暖返回开发证据

本增量只新增任务脚本、保存开发证据与更新对应Sky Context，没有修改生产代码、云观星以外业务逻辑或六项Settings/outbox保护；原分支、HEAD、BFF/watch、预算、普通Prepared采用保持。没有下载/重复月面加工/手机预览/提交推送/采购部署发布。

## 消费者与结果范围

实际安装Taro/React/Query Provider、完整SpotSkyPage/Sources JSX及原搜索Input/按钮/Canvas手势与公共时间尺运行；沿原正式测试点context lookup/store/report/本地同帧Astronomy geometry、隔离原API controllers/service/真实公共影像。401前端、162服务project源、r63的309源及六保护绑定；四个任务epoch共用同一前端bundle，r2九天体失败epoch只有before、r4暖月面正常exit0且before/after/61公共read当前字节精确。它们不是同一contextId全旅程；r2失败后不能补称结束绑定/最终退休。

仍为受控native geometry/MapFS/Image/stack及Chromium软件GL：SCSS已绑定但未合成，PNG不是WEAPP WXML/UI合成或Android/iOS实机。传感器监听在本次实际消费者为0，时间由原报告/时间尺驱动；原follow诊断边界复用但未据其传感器端口声明手机试验。根reader为自审，独立审查MISSING。

1. r1任务误用不存在的“图层”按钮自然exit1，只留下冷页证据。原快速图层开关直接可见，r2只改任务调用原“模拟地景：开”，正式关闭地景，避免地景遮挡阻止地平以下浏览；不改真高度或声称现场可见性。
2. r2原公开中文搜索/目录结果/资料/“定位到星空”、分段真实Canvas pinch，把日月七行星逐个带到视场中心并实际绘制。太阳/月球1°、七行星.05°；日月在1°视场自然有部分圆缘出画，r4原手势1.5°完整月缘已另看。每个天体都有同已绘snapshot核心拾取→原资料modal→原定位返回，9个完整核心消费者均有正向效果，非直接改camera或调用renderer。六个本时刻在地平以下仍保真实负高度；属于全景浏览，不表示可见。
3. r2月面影像首次受控503：原GPU月相和已绘月球对象仍成立，原公开“重试月面影像”恢复真实coverage-v2纹理。未执行失败状态下公开核心tap，不把后续成功tap倒填。不是弱网/真实服务器故障或手机粗细LOD验收。
4. Moon/Mercury/Mars已有真实表面、Jupiter/Saturn/Uranus/Neptune现有OPAL纬度统计供应进入原surface并上传GPU；其SHA同实际200影像HTTP正文，金星原解析相位/太阳自发光盘没有虚构表面。OPAL纬度统计、历史影像/coverage及现有来源含义不变，未认证完整画质、对外来源出版或新采用。土星原continuous rings真实submitted、A/B/C band与同帧环拾取形状成立。
5. r2九天体结果完成后，第二次月球资料任务文件名重名EEXIST自然exit1；保留失败、无final/after/full-run maxima。r3只建立新epoch月面文件/公开跟踪，不重九天体，但任务误读Query无data条目而自然exit1。r4修task optional读取和唯一资料命名，仍只补暖月面/时间/退休；原生产逻辑没变。
6. r4同epoch原月球“跟踪天体”、1.5°视场，公共时间尺预览由2026-10-04T15:59:58.700Z到16:30:00Z：月球高度-9.257284→-3.440381°、角径.5346117→.53549648°、照亮比例.37597755→.37367863及实际相机/paint同步变化，月球保持195/422中心。原touchcancel恢复原时刻/相机和RGBA精确；context revision1保持，预览未提交。
7. r4原hide后全部GL/登记/租约/队列退休；onShow从encoded文件重新取得Moon并保持选中/跟踪/时刻/像素精确，本暖阶段Moon图片HTTP0，不是native decode0。最终unload/clear活动登记/GL/encoded/lease/queue全0、inventory26B。控制端口模型不证明GC/物理200MB。

根以独立NumPy ENU向量、stereographic尺度/球面角径及sunward导数读回实际同帧报告→surface→paint，不调用生产projection/phase生成期望；仅屏幕数值算术比较，RGBA没有容差，未独立重算外部ephemeris。9张resolved、1张503相位、4张暖Moon/preview/cancel/show及两个epoch冷页共16组GL前→PNG→GL后严格。旧整周9RGB通道、旧Source2RGB通道精确相等FAILED保持，本视场pass不改变它们，不设新像素容差/窗口策略。

| 原reference | 本时刻真高度° | 角径° | 实际radiusPx | 参与影像家族 |
| --- | --- | --- | --- | --- |
{rows}

已查看Moon/完整Moon暖返回、金星相位、木星纬度带、土星环的保存实际GL图。解析/纹理消费通过不等于对参考的完整视觉质量通过；行星历史统计纹理不是当前实拍表面。

## 请求与分层资源

r2保存233实际HTTP、完成接收9586194B，未知received字段0；发生1受控Moon图片503、后原retry真成功。该失败epoch只存bounded2048资源history/阶段快照，丢弃早期history且没有完整累计maxima/final，**九天体全段临时峰和最终退休UNVERIFIED**，不把最大片段当全峰。不能因body画面成立就省略此义务。

r4正常完成73HTTP/6102665B、1114模型观察，源/public文件before-after保持。独立MAX：MapFS含staging {maxima['fsLogicalBytes']}B、encoded {maxima['entries']}项/{maxima['bytes']}B、reserved {maxima['reserved']}B/two running/pending {maxima['pending']}；GL texture {maxima['gpuTextureUploadModelBytes']}B/buffer {maxima['gpuBufferUploadModelBytes']}B、活动native登记{maxima['activeDecodedImageHandles']}、源RGBA等价 {maxima['sourceRgbaEquivalentBytes']}B。这些MAX各发生时刻独立，不可求和当物理总峰；包含宽场/constellation/galactic/月面临时重叠和诊断开销，不是完整W3/光学/日月行星全家族同场容量。测试正式点与fixture weather/API不是已部署4GB或16GB生产压测，HTTP正文不是官方包体或200DAU月成本/12Mbps峰值容量。

## 直接证据与唯一后续

- [r1缺按钮任务失败](../../../../output/playwright/cloud-sky-real-taro-solar-public-1004-r1/failed.json)、[r2重名任务失败](../../../../output/playwright/cloud-sky-real-taro-solar-public-1004-r2/failed.json)、[9个实际body](../../../../output/playwright/cloud-sky-real-taro-solar-public-1004-r2/observed-bodies.json)
- [r3无data读取任务失败](../../../../output/playwright/cloud-sky-real-taro-solar-public-1004-r3/failed.json)、[r4正常完成](../../../../output/playwright/cloud-sky-real-taro-solar-public-1004-r4/result.json)、[r4实际phase](../../../../output/playwright/cloud-sky-real-taro-solar-public-1004-r4/phases.json)
- [当前根saved读回](../../../../output/sky-real-taro-solar-public-readback-1004-r3/result.json)、[错要求暖epoch含早期故障的根失败](../../../../output/sky-real-taro-solar-public-readback-1004-r1/failed.json)、[旧reader归档](../../../../output/sky-real-taro-solar-public-readback-1004-r2/executed-reader.py)、[当前reader](../scripts/readback-real-taro-solar-public-2026-10-04.py)
- [唯一PLAN](../PLAN.md)：下一实际page完整冷暖组合及全部参与家族同场/切换/临时峰/退休与原spot-proposal入口返回。九body独立已绘物理链和warm-Moon消费者不单独重跑；全组合中真实场景需要的切换不是重复旧矩阵。失败时也保存累计resourceSummary及实际现场，不能丢阶段后宣称全峰；无需为补失败结尾重九体矩阵。

WEAPP/WXML FAILED、Android/iOS新版Moon、完整全景+层/时间/来源/入口组合、所有家族物理与临时资源/200MB binary/包体、B背景接缝绿晕弱结构覆盖配准/rights/批量出版、Prepared-science registry空/HST矩形FAILED/M82 OV-MED科学输入缺、静态保留引用/端云成本/200DAU全业务容量/12Mbps10-20混合/180GB及独审保持开放。原完整义务不变，Goal active、无预算、未完成。
'''
 write(task+'/evidence/'+ev,document)
 p=task+'/PLAN.md';s=read(p);start=s.index('**当前唯一下一依赖（');end=s.index('\n',start)
 s=s[:start]+'**当前唯一下一依赖（2026-10-04原page日月七行星开发后）：** 九天体公开搜索/定位/缩放/同帧核心点选与实际纹理/环、Moon503相位保留/原retry，以及另一epoch暖月面跟踪/时间预览取消/hide-show/退休有开发证据；r2重名任务FAILED无全峰/final，非同context全旅程。下一原page完整冷暖组合、全部参与家族总资源/临时峰/退休与原spot/proposal入口返回；WXML/手机/完整图质/物理/容量/独审仍缺。'+s[end:]
 start=s.index('当前唯一下一依赖是A/D真实page日月七行星');end=s.index('\n',start)
 new='新增[原page日月七行星/真实影像与暖月面时间退休](evidence/'+ev+')：401前端/162服务project/r63的309源六保护；r2原公开中文搜索/定位/真实pinch/同已绘snapshot核心资料消费9body，Moon-Mercury-Mars及四OPAL纬度图实际surface/GPU、Venus解析相位/solar解析盘、Saturn连续A/B/C rings，6body真实负高度在关闭模拟地景的全天浏览可绘可pick不供现场可见性。Moon图片503保相位/已绘对象，原retry真恢复；失败状态public core tap未验。r2第二Moon资料文件重名taskFAILED无after/final/完整累计max，r3仅暖Moon task缺data读取FAILED保；r4同bundle仅暖Moon公共跟踪/16:30preview/原cancel/actualhide-show精确与全活动0/26B，73HTTP6102665B/1114模型obs/61公共read前后精确。根独立ENU/角径/相位screen导数算术和16单次GL-PNG-GL读回，自审非独审、两contextepoch不拼全旅程；Rootr1错把r2故障要求到r4先FAILED，r2/r3仅改reader无HTTP replay。r2 HTTP233/9586194B received已知，完整全九段瞬态峰UNVERIFIED；r4 MAX分层含staging3459615/encoded59项3413989/reserved1607583/two running、GLtex9961472/buffer25788/native10/RGBAeq22806528，非物理总。原OPAL/coverage来源含义/图质/采用未变，产品/其他业务/六保护/原进程/预算保持。\n\n'
 nxt='当前唯一下一依赖是A/D原page完整冷暖组合、全部真正参与家族总资源/临时峰/退休与原spot/proposal入口返回：复用既有完整Taro/provider/current API图/公共read/同encoded owner，组合实际全景渐隐/层切换/时间跟踪/SourceBack/失败细化保粗/月面行星/入口返回，失败也保存完整累计maxima与现场证据，不按九体失败段2048尾部history冒全峰。九体独立物理链、warm-Moon、follow校准/断流/SourceBack、W3ready/M51失败重试/整周混合等闭合机制不单独重跑；完整组合实际切换需要正向消费者，非靠拼独立epoch。旧task/精确像素FAILED和缺证保持，不新设容差/窗口策略或从旧probe倒填原因，无新证据不循环DevTools启动。允许实测支持调queue/decode暖缓存/必要生命周期，不凭猜测搭框架。B完整质量/rights/批量来源出版/空Prepared-science/HST矩形FAILED/M82缺输入、WXMLFAILED/Android-iOS新版Moon/物理200MBbinary包体/静态retention refs/全200DAU端云成本/12Mbps10-20混合容量/180GB/独审保留。只改Sky及必要共享依赖，不改外部业务/六保护，保32MiB/two-transfer/完整性/lease取消迟到粗层回退；Goal active无预算，无提交推送采购部署发布或重复下载加工。'
 s=s[:start]+new+nxt+s[end:];write(p,s)
 p=task+'/CONTINUE-CLOUD-SKY.md';s=read(p)
 s=s.replace('## 6. 当前依赖与尚未执行的工作','新增[原page日月七行星与暖月面](evidence/'+ev+')：九体原搜索/定位/pinch/同帧核心点选、实际纹理与Saturn环已开发；Moon503保相位/原retry；r4只补暖Moon原跟踪/时间preview-cancel/hide-show/退休。r2重名taskFAILED无full maxima/final、r3无data taskFAILED保持，两epoch不拼全旅程；16单次GL-PNG-GL严格/本视场暖pixel精确不升级旧精确FAILED或native/独审。无生产/外部业务/六保护/进程/预算变化。\n\n## 6. 当前依赖与尚未执行的工作',1)
 old='下一实际page日月七行星/适用影像/时间选择及全部家族资源，再完整冷暖/原spot-proposal入口返回；native/手机、完整视觉与物理资源仍缺，不重已闭合链。';assert old in s
 s=s.replace(old,'日月七行星公开consumer已有原page结果，r2全九段资源累计峰/final未存，warmMoon补段在另一epoch。下一原page完整冷暖组合、全部家族临时/总模型/退休及原spot-proposal入口返回；native/手机、完整视觉与物理资源仍缺，不独立重九体或已闭合链。').replace('current-execution-state-2026-10-04-r63.json','current-execution-state-2026-10-04-r64.json');write(p,s)
 addition=[('project_context/architecture/runtime-and-domain.md','The complete Taro page development path now observes public solar-body search/locate/pinch and same-painted-frame core picking for Sun/Moon/seven planets, real eligible image submissions and Saturn continuous rings. A lunar image transport outage preserves the painted phase/object until original public retry succeeds. A separate warm-Moon epoch observes original ruler preview/track/cancel, exact hide/show pixels and retired model activity. Nine-body failed task history lacks final binding and accumulated full-run resource maxima; do not combine independent context epochs or bounded tail history into complete journey/physical peak proof. Historical OPAL latitude profiles and lunar coverage keep their existing source meaning. See [actual solar consumer scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').'),('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md','原整页日月七行星公开搜索/定位/真实pinch/同已绘核心点选已观察，真实月面/水星/火星与OPAL纬度图进入surface/GPU、Saturn连续环；金星相位/太阳解析盘保原来源含义。关闭模拟地景后六个地平以下body保持真高度并可全景浏览，不表示现场可见性。Moon图片503仍绘相位/对象、原retry恢复；独立warmMoon原跟踪/公共尺preview/cancel/hide-show精确与退休成立。九体task失败未存完整maxima/final，两个epoch不代全组合/物理/原生手机/独审；来源完整出版和图质缺口保留。详[太阳系原消费者](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').')]
 for p,text in addition:
  s=read(p);pos=s.index('experience-real-taro-follow-calibration-2026-10-04.md');end=s.index('\n',pos);s=s[:end]+'\n\n'+text+s[end:];write(p,s)
 p=task+'/scripts/capture-current-execution-2026-10-03.ps1';s=read(p)
 names=['build-real-taro-solar-public-2026-10-04.mts','experience-real-taro-solar-public-2026-10-04.mts','readback-real-taro-solar-public-2026-10-04.py']
 s=s.replace('$sources = @(\n','$sources = @(\n'+''.join("  '"+task+'/scripts/'+n+"',\n" for n in names),1)
 paths=[task+'/evidence/'+ev,task+'/evidence/current-execution-state-2026-10-04-r63.json',task+'/tmp/create-solar-public-2026-10-04.py',task+'/tmp/close-solar-public-2026-10-04.py','output/playwright/cloud-sky-real-taro-follow-calibration-1004-r4/continuity-checks.json']
 for folder in [root/f'output/playwright/cloud-sky-real-taro-solar-public-1004-r{i}' for i in [1,2,3,4]]+[root/f'output/sky-real-taro-solar-public-readback-1004-r{i}' for i in [1,2,3]]:
  paths.extend(p.relative_to(root).as_posix() for p in sorted(folder.iterdir()) if p.is_file() and p.name!='continuity-checks.json')
 s=s.replace('$results = @(\n','$results = @(\n'+''.join("  '"+q+"',\n" for q in paths),1)
 observed='r63 strict309+6protected/401frontend162backendproject. r2actual nine public solar bodies search-locate-pinch-corepick/original disclosure/current geometry and eligible Moon-Mercury-Mars-fourOPAL textures/SaturnABCcontinuousrings; six true negative altitudes browse with publicgroundoff/not sitevisibility. Moonimage controlled503 retains phase-object/originalretry restores real image; failed-phase publiccoretap unexercised. r1nonexistent layerbutton/r2duplicate Moonartifact/r3taskmissing Querydata failed retained; r2noafter-final-accumulated transient maxima. r4samebuild warm-only newcontext no bodymatrixrepeat; publicMoontrack/ruler preview16:30/cancel/fullMoon1.5fov/hide-show exact/time-pose-shape updated/current61publicreads beforeafter/exit0. Root independentENU-screen-angle-phase arithmetic/not independentephemeris;16GL-PNG-GLcaptures/currentrootr3 selfreview. r2HTTP2339586194B no unknownReceived/r4HTTP736102665B/resource1114/max separate file3459615-encoded593413989-reserved1607583-GLtex9961472buf25788-native10-RGBA22806528/nonphysical/final all0inventory26B/warm MoonimageHTTP0-not decode0. Oldexactpixel failures/nativeWXML-phone-imagequality-fullcombined-allfamily-physical-capacity-independentreview remain. Product-outsidebusiness-protected-BFFwatch-budget-downloadprocessing-phone-commitpushdeployadoption unchanged; Goalactiveunbudgeted.'
 nxt='PLAN actualpage wholecoldwarmcombinedjourney/allreallyparticipatingfamily resource total-temporarymaxima-retirement/originalspot-proposalentryreturn. Ninebody separate physicalconsumer chain and warmMoon developed in separatecontext epochs not complete journey; failedr2bodyepoch lacks accumulated full transient maxima/final; save resourceSummary on failure in new combination, do not replay standalone bodymatrix merely to close failed task. Existing follow-W3-M51-orbit-mixed resolved mechanisms only revisit for new combination/relevant finding; no unchanged DevTools loops. Oldfailedexactpixels/tasks maintained/no new tolerance/window policy. Bfullqualityrights-publication/emptyPrepared/HSTrectangleFAILED/M82inputs/nativeWXMLFAILED/Android-iOSnewMoon/200MBbinary-physicaltotal-package/retentionrefs/whole200DAUcost-egress12Mbps10-20mixedcapacity180GB/independentreview remain; nooutsideSkybusiness/commitpushdeployadoption.'
 s,n=re.subn(r"    toolObserved='[^\n]*'","    toolObserved='"+observed+"'",s);assert n==1
 s,n=re.subn(r"    next='[^\n]*'","    next='"+nxt+"'",s);assert n==1;write(p,s);print(json.dumps({'prepared':True,'newEvidenceBindings':len(paths)}))
elif sys.argv[1]=='verify':
 cp=task+'/evidence/current-execution-state-2026-10-04-r64.json';state=obj(cp)
 for key in ['currentSources','protected','evidence']:
  for row in state[key]:assert (root/row['path']).stat().st_size==row['bytes'] and sha(row['path'])==row['sha256'],row['path']
 previous=obj(task+'/evidence/current-execution-state-2026-10-04-r63.json');old={r['path']:r for r in previous['currentSources']};changed=[r['path'] for r in state['currentSources'] if r['path'] in old and r!=old[r['path']]]
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
 assert len(state['currentSources'])==312 and state['worktree']['stagedEntries']==0 and state['goal']['status']=='active' and state['goal']['budget'] is None
 assert {p['ProcessId'] for p in state['processes']}=={24040,18132} and state['processes']==previous['processes']
 result={'status':'CURRENT_SOLAR_PUBLIC_INCREMENT_CONTINUITY_VERIFIED','checkpoint':cp,'checkpointSha256':sha(cp),'selectedSourcesExact':312,'evidenceExact':len(state['evidence']),'protectedExact':6,'changedSelectedSourcesFromR63':changed,'newSelectedSources':new,'productCodeChanges':[],'contextValidation':'exit0','diffCheck':'exit0','appTypecheck':'not repeated; product source unchanged from pinned5.9.3 pass r58','ordinaryLocalLinks':{'files':5,'links':count,'missing':missing},'stagedEntries':0,'goal':{'status':'active','budget':None},'originalProcessesLive':state['processes'],'scope':'Original nine solar-body public consumer and separate warmMoon development; r2taskFAILED/no final or accumulated full-run peak; r4normalexit0. Root selfreview not full combined/native/physical/fullquality/independent acceptance. No product/outside-business changes; old failures/gaps retained.'}
 write('output/playwright/cloud-sky-real-taro-solar-public-1004-r4/continuity-checks.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
