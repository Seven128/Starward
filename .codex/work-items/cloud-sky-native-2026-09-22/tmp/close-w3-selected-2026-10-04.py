from pathlib import Path
import hashlib,json,re,sys
from datetime import datetime,timezone
root=Path(__file__).resolve().parents[4];task='.codex/work-items/cloud-sky-native-2026-09-22'
def read(p):return (root/p).read_text(encoding='utf-8-sig')
def write(p,s):(root/p).write_text(s,encoding='utf8',newline='')
def obj(p):return json.loads(read(p))
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
ev='experience-real-taro-w3-selected-failure-retirement-2026-10-04.md'
if sys.argv[1]=='prepare':
 p=task+'/PLAN.md';s=read(p)
 start=s.index('**当前唯一下一依赖（');end=s.index('\n',start)
 s=s[:start]+'**当前唯一下一依赖（2026-10-04选中细化/退休修复后）：** A/D公开M51细档失败保MEDIUM、公开重试DETAIL及Source返回/注销已有本代有界证据；适用W3已取得真实tiles，但完整ready/PNG-RGBA同帧与final退休未验。下一为这些W3条件与剩余全天手势/时间组合/全家族资源，原生/图质/物理/容量未验。具体范围见下面当前依赖段。'+s[end:]
 start=s.index('当前唯一下一依赖是A/D的同一真实整页剩余组合：');end=s.index('\n',start)
 addition=f'新增[适用W3/选中细化失败及native注销]({"evidence/"+ev})：原公开pinch到99.589499°取得两张W3真实tiles并撤galactic，关闭恢复；r2后续task hideKeyboard缺失失败、W3 PNG/RGBA分开取样同帧FAILED保持，非完整ready/最终退休。r3/r4仅公开搜索M51/定位/分段pinch至.1/.05，单transport503细档失败实际保MEDIUM，公开重试DETAIL与实际Sources/Back相机时刻/选中/像素保持。根发现r3登记Source留2/final留3但GPU/lease0，弱registry非物理泄漏；原register注销丢弃经兼容provider回归true≠false复现，生产只Sky页面持有注销、替换/退休/unmount执行且不进恢复file。四旧fixture缺绑定/旧hide需求先失败并已修，32受影响行为/AppTS通过。r4当前401前端/162服务project/66公共read/294执行前后源绑定，根reader一项scope变更归档，其余293源/六保护当前精确；Source/final活动登记-lease-GL0/最终26B，6组PNG/RGBA严格、selected粗细/回程保持，自审非独审。最大文件logical6036131B/GL纹理11534336B/8登记14155776源RGBA模型/encoded64项5986505B-reserved3382529B，分层非物理总；84请求含1注入/其余正文8708550B。无其他业务/预算/BFF-watch/下载加工手机提交发布变化。\n\n'
 nxt='当前唯一下一依赖是A/D同页适用W3的完整ready/稳定同帧与Source-hide/Back/final资源：先澄清原native解码/渐进与分开capture造成的r2同帧失败，不以两tiles供应或开关代完整条件，不重r1旧开关循环或已闭合r4M51选中细化-失败-重试-Source链。再补横向全天/释放中断、跨午夜/公共时间尺预览取消提交等剩余组合及日月七行星/所有实际影像家族owner账；保同帧相机时刻身份/来源，逐层区分encoded/冷lease/数值RLE/decode/native/GL/staging与替换临时峰/退休，注销不当GC，最后frame隐藏后为历史。复用installed Taro/provider/当前API project图/公共read epoch和单encoded owner，最新checkpoint严格绑定；有实测瓶颈才调队列/decode/暖缓存或必要生命周期，不重旧source/r11/Hook7/五-solar-old9-clear2-rollback-static-processing/无变化DevTools。不改云观星外业务或六保护，保32MiB/two-transfer/同帧完整性/lease-cancel-coarse。B完整背景接缝绿晕弱结构配准覆盖/rights/批量来源出版、空Prepared-science/HST矩形FAILED/M82缺输入；WEAPP/WXMLFAILED/Android-iOS新版Moon/跟随校准/旧新binary200MB/物理总峰/retention refs/whole200DAU成本出口CPU-RSS-DB-Redis-outbox-media/12Mbps10-20混合容量/180GB/独审仍开放。Goal active无预算，无提交推送采购云部署发布或重复下载加工。'
 s=s[:start]+addition+nxt+s[end:];write(p,s)
 p=task+'/CONTINUE-CLOUD-SKY.md';s=read(p)
 summary=f'新增[适用W3/选中细化回退及native登记退休](evidence/{ev})：99.589°真实W3 tiles/银河替换已有局部事实，r2后续taskport失败且PNG/RGBA同帧FAILED，完整ready/final退休待。r3/r4公开搜索定位M51/pinch .1/.05，一次注入细请求失败保MEDIUM，公开重试DETAIL/实际SourceBack保持；根发现旧选中W3登记不注销，兼容provider回归复现后生产仅Sky页面持有注销并在替换/退休/unmount执行、不进file metadata。32受影响检查/AppTS、r4原页面资源与6组像素通过，Source/final活动0/26B，模型非物理/独审仍缺；其他业务与六保护/原进程不变。\n\n'
 s=s.replace('## 6. 当前依赖与尚未执行的工作',summary+'## 6. 当前依赖与尚未执行的工作',1)
 s=s.replace('下一组合为选中细化失败保粗与适用宽场W3/银河替换，随后补','选中细化失败保粗已有本轮有界证据；下一组合为适用W3全ready/稳定同帧及退出资源，再补')
 s=s.replace('current-execution-state-2026-10-04-r56.json','current-execution-state-2026-10-04-r58.json');write(p,s)
 for p,needle,text in [
 ('project_context/architecture/runtime-and-domain.md','experience-real-taro-layers-time-tracking-resources-2026-10-04.md','Selected W3 native ownership now retains the original registration disposer with the accepted bitmap, executes it when replaced/cleared/Canvas-retired/unmounted, and strips it from recovery file metadata. A pending or failed fine request keeps the actually presented coarse bitmap. The compatible-provider regression proves retirement independently of optional file freshness; no cache budget or other business rule changed. Actual public M51 search/locate/pinch, injected one-transport503 coarse fallback, explicit detail retry and Sources/Back have saved original completion receipts/software pixels with all registrations retired at Source/final. Eligible wide W3 supplies real tiles and withdraws the galactic input, but its partial lane PNG/RGBA captures differ and full readiness/final resource evidence remain open. See [selected fallback/native retirement and partial W3 scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').'),
 ('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md','experience-real-taro-layers-time-tracking-resources-2026-10-04.md','本代公开搜索M51/定位/pinch .1/.05、一次本机细请求503保MEDIUM、公开重试DETAIL/实际来源返回有原完成回执/软件像素证据，Source/final登记-lease-GL归零。选中W3 bitmap替换/清空/Canvas退休/unmount现执行原native注销，pending或失败细图仍保已绘粗图，恢复file不带bitmap/generation/注销函数；弱registry注销不当物理GC。适用99.589°W3两真实tiles与银河替换已有局部事实，但后续taskport失败/分开PNG-RGBA同帧FAILED、完整ready/final退休仍待。原SCSS/native/手机/全家族/图质容量独审义务保留，无其他业务或预算变更。详[细化回退/退休与W3边界](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+ev+').')]:
  s=read(p);pos=s.index(needle);end=s.index('\n',pos);s=s[:end]+'\n\n'+text+s[end:];write(p,s)
 p=task+'/scripts/capture-current-execution-2026-10-03.ps1';s=read(p)
 paths=[task+'/evidence/'+ev,task+'/evidence/current-execution-state-2026-10-04-r57.json',task+'/tmp/create-w3-selected-journey-2026-10-04.py',task+'/tmp/close-w3-selected-2026-10-04.py','output/playwright/cloud-sky-real-taro-layer-time-1004-r3/continuity-checks.json']
 for lane in range(1,5):
  for folder in [root/f'output/playwright/cloud-sky-real-taro-w3-selected-1004-r{lane}',root/f'output/sky-real-taro-w3-selected-readback-1004-r{lane}']:
   if folder.exists():paths.extend(p.relative_to(root).as_posix() for p in sorted(folder.iterdir()) if p.is_file() and p.name!='continuity-checks.json')
 s=s.replace('$results = @(\n','$results = @(\n'+''.join("  '"+p+"',\n" for p in paths),1)
 observed='r57 strict294+6protected; r4selected-only actual401frontend162backendproject66publicread before-after bindings. Public searchM51-locate-pinch .1/.05; one injected local503 DETAIL keeps actual MEDIUM completion SHA; publicretry DETAIL and actualSourcesBack sameinstance-instant-camera-selection-pixels. Root r3Source2-final3 native registrations not explicitly retired, not physical leak; compatibleprovider sameCanvas replacement regression true-ne-false; Sky page only disposer ownership/replacement-retire-unmount/filemetadata strip.32affected checks AppTS5.9.3 passed, four preexisting AST fixture failures repaired/preserved. r4Source-final native-registration-filelease-GL0/26Binventory; six PNG-RGBA pairs exact.84requests includes1injected otherbodies8708550B/1215samples models distinct filesystem6036131B-texture11534336B-buffer26112B-native8-RGBA14155776B-encoded64items5986505B-reserved3382529B-two transfers. PartialW3 r2real2tiles at99.589deg galactic replacement/withdrawal observed but taskhideKeyboardFAILED, PNG-RGBA sameframeFAILED/final unknown; r1wrongfov task failed. r3-r4selected-only no W3 replay. Root293current+1reader-onlyscope archive transition/selfreview not independent. Nootherbusiness-6protected-budget-BFFwatchrestart-downloadprocessing-phone-commitpushdeployadoption. Goalactiveunbudgeted.'
 nxt='PLAN actual eligibleW3 fullready-stable sameframe-SourceBack-final resource; investigate native decode/progression/capture r2pixelpairFAILED before complete claim. Remaining horizontal-fullsphere-releaseinterruption/crossmidnight-publicruler/fullfamily parsed-mask-decode-nativeGPU-encodedcoldlease-staging-temporarypeak-retirement. Do not replay closed r4M51-failure-retry-Source or old W3 toggle/oldmatrices/unchangedDevTools startup. Bfullqualityrights-publication/emptyPrepared/HSTrectangleFAILED/M82inputs/nativeWXMLFAILED/Android-iOS-newMoon-followcalibration/200MBbinary/physicaltotal/retentionrefs/whole200DAU-cost-egress12Mbps10-20mixedcapacity180GB/independentreview remain. Preserve all contracts and nooutsideSkybusiness/no commitpushdeployadoption.'
 s,n=re.subn(r"    toolObserved='[^\n]*'","    toolObserved='"+observed+"'",s);assert n==1
 s,n=re.subn(r"    next='[^\n]*'","    next='"+nxt+"'",s);assert n==1;write(p,s)
 print(json.dumps({'prepared':True,'newEvidenceBindings':len(paths)}))
elif sys.argv[1]=='verify':
 cp=task+'/evidence/current-execution-state-2026-10-04-r58.json';state=obj(cp)
 for key in ['currentSources','protected','evidence']:
  for row in state[key]:assert (root/row['path']).stat().st_size==row['bytes'] and sha(row['path'])==row['sha256'],row['path']
 old={r['path']:r for r in obj(task+'/evidence/current-execution-state-2026-10-04-r56.json')['currentSources']}
 changed=[r['path'] for r in state['currentSources'] if r['path'] in old and r!=old[r['path']]]
 allowed={task+'/PLAN.md',task+'/CONTINUE-CLOUD-SKY.md',task+'/scripts/capture-current-execution-2026-10-03.ps1','project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md','apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'}
 assert set(changed)==allowed,changed
 new=[r['path'] for r in state['currentSources'] if r['path'] not in old];assert len(new)==4 and all(p.startswith(task+'/scripts/') or p=='apps/wechat-miniapp/src/features/sky/deep-sky-image-lifecycle.test.ts' for p in new)
 before=obj('output/playwright/cloud-sky-real-taro-w3-selected-1004-r3/source-bindings-before.json');after={r['path']:r for r in obj('output/playwright/cloud-sky-real-taro-w3-selected-1004-r4/source-bindings-before.json')};assert [r['path'] for r in before if r!=after[r['path']]]==['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx']
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
 result={'status':'CURRENT_W3_SELECTED_INCREMENT_CONTINUITY_VERIFIED','checkpoint':cp,'checkpointSha256':sha(cp),'selectedSourcesExact':len(state['currentSources']),'evidenceExact':len(state['evidence']),'protectedExact':6,'changedSelectedSourcesFromR56':changed,'newSelectedSources':new,'frontendProductChanges':['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'],'contextValidation':'exit0','appTypecheck':'installed5.9.3 exit0','diffCheck':'exit0','ordinaryLocalLinks':{'files':5,'links':count,'missing':missing},'stagedEntries':0,'goal':{'status':'active','budget':None},'originalProcessesLive':state['processes'],'widePixelPair':'FAILED_PNG_RGBA_SAME_FRAME_BINDING; W3 full readiness/final retirement remain unverified','scope':'Selected source and six protected bytes; only Sky page/test product changes. Historical execution/reader transitions retain their epochs. No native/physical/full-family/quality/capacity/independent acceptance.'}
 write('output/playwright/cloud-sky-real-taro-w3-selected-1004-r4/continuity-checks.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
