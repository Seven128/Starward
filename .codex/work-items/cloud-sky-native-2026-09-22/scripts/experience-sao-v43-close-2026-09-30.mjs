import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const root=path.resolve('.'),task=path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22');
try { await fs.access(path.join(task,'evidence/experience-sao-v43-binding-2026-09-30.json'));
  throw Error('This SAO record is frozen; do not replace it with later observations.');
} catch(error) { if(error.code!=='ENOENT')throw error; }
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=name=>fs.readFile(path.join(task,name));
const json=async name=>JSON.parse((await read(name)).toString().replace(/^\uFEFF/,''));
const traceBytes=await read('evidence/experience-sao-v43-native-events-2026-09-30.jsonl');
const trace=traceBytes.toString().trim().split(/\r?\n/u).map(line=>JSON.parse(line));
const last=stage=>trace.findLast(row=>row.stage===stage)?.value;
const state=last('final-sao-pass-idle'),prior=await json('evidence/experience-v42-binding-2026-09-30.json');
assert.equal(state.mode,'pass');assert.equal(state.counts.activeTiles,0);
const context=(await json('tmp/v43-context-current-readback.json')).data;
assert.equal(sha(context.contextId),prior.context.idSha256);assert.equal(context.revision,4);
assert.equal(context.selectedAtUtc,'2026-09-29T16:00:05.153Z');assert.equal(context.contextFingerprint,prior.context.fingerprint);
const report=(await json('tmp/v43-current-public-report.json')).data;
const baseState=await json('tmp/v43-base-end-state.json');
assert.equal(baseState.counts.contextPuts,3);assert.equal(baseState.counts.targets,16);
assert.equal(baseState.astronomyModuleSha256,'a189d24738a1cf33b664cb6968c3737455bbb8124eaf410b146058daa4b8bf17');
const candidate=path.join(root,'apps/wechat-miniapp/dist/weapp-check-sky-sao-v43');
const build=await fingerprintBundle(candidate);
const sourcePaths=[...new Set([...prior.sourceHashes.map(row=>row.path),
  'apps/wechat-miniapp/src/features/sky/use-sky-stellar-supplement.ts',
  'apps/wechat-miniapp/src/features/sky/sky-stellar-tile-loader.ts',
  'apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts',
  'apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts',
  'apps/wechat-miniapp/src/features/sky/sky-scene-render.ts',
  'apps/wechat-miniapp/src/features/sky/sky-object-picking.ts',
  'apps/wechat-miniapp/src/services/sao-catalog-client.ts'])];
const sourceHashes=await Promise.all(sourcePaths.map(async name=>({path:name,sha256:sha(await fs.readFile(path.join(root,name)))})));
for(const previous of prior.sourceHashes)assert.equal(sourceHashes.find(row=>row.path===previous.path).sha256,previous.sha256,'Production source changed since v42: '+previous.path);
const captures=[];
for(const stage of ['altair-45-baseline','altair-8-9-failed','altair-8-9-recovered','sao-125013-sources','source-back-current-sky','paired-source-before','paired-source-after']){
  const filename='experience-sao-v43-'+stage+'-2026-09-30.png',bytes=await read('evidence/'+filename),image=PNG.sync.read(bytes);
  captures.push({file:filename,sha256:sha(bytes),bytes:bytes.length,width:image.width,height:image.height});
}
assert.equal(captures[5].sha256,captures[6].sha256);
assert.equal(last('paired-source-before').nativeCanvas,last('paired-source-after').nativeCanvas);
assert.equal(last('paired-source-page').currentPage.path,'sky/sources/index');
assert.equal(last('actual-source-current-page').currentPage.path,'sky/sources/index');
assert.equal(last('final-sdk-window').result.result.sdk,'3.17.3');
const reads=state.tileReads,aborted=reads.filter(row=>row.aborted);
assert.equal(aborted.length,8);assert.ok(aborted.every(row=>row.upstreamStatus===null&&row.status===null&&row.bytes===0));
const statuses=Object.fromEntries([...new Set(reads.map(row=>row.aborted?'aborted':String(row.status)))].map(status=>[status,reads.filter(row=>(row.aborted?'aborted':String(row.status))===status).length]));
const timeline=reads.flatMap(row=>row.durationMs===null?[]:[{at:Date.parse(row.receivedAt),delta:1},{at:Date.parse(row.receivedAt)+row.durationMs,delta:-1}])
  .sort((a,b)=>a.at-b.at||a.delta-b.delta);
let active=0,peak=0;const overlaps=[];
for(let index=0;index<timeline.length;index++){
  active+=timeline[index].delta;peak=Math.max(peak,active);
  if(active>3&&timeline[index+1]?.at>timeline[index].at)overlaps.push({startUtc:new Date(timeline[index].at).toISOString(),durationMs:timeline[index+1].at-timeline[index].at,active});
}
const points=await json('evidence/experience-sao-v43-painted-points-2026-09-30.json');
const binding={capturedAtUtc:new Date().toISOString(),scope:'云观星原生DevTools开发检查；目标设备／整体交付未完成',
  build:{path:path.relative(root,candidate).replaceAll('\\','/'),files:build.fileCount,rawBytes:build.totalBytes,treeSha256:build.sha256,
    skyPageSha256:sha(await fs.readFile(path.join(candidate,'sky/detail/index.js')))},sourceHashes,
  context:{...prior.context,currentReadbackSha256:sha(await read('tmp/v43-context-current-readback.json'))},
  report:{sha256:sha(await read('tmp/v43-current-public-report.json')),at:report.context.at,dataRevision:report.context.dataRevision,catalog:report.skyScene.catalog.catalogVersion,
    limit:'按本次真实JSON原字节读取；route中的历史dataRevision提示不当成当前报告版本。开发地点及气象夹具不是现场观测。'},
  runtime:{windowId:'s3',sdk:'3.17.3',logicalCanvas:{width:points.width,height:points.height},source:':60063 owned proxy -> existing :60061 epoch (PID16572; exec9420; internal52555)',proxyPid:30852,proxyExec:39111,
    publicationHash:state.tileReads[0].publicationHash,mode:'pass',activeTiles:0,finalFrame:last('paired-source-after').nativeCanvas,selection:'SAO:125013',modeAndType:'手动／DAY／标准字号，无modal、列表、时间面板、播放或跟踪'},
  transport:{counts:state.counts,statuses,abortedReads:aborted,approximatePeakFromMillisecondIntervals:peak,overlapsAboveThree:overlaps,
    limit:'loader上限3描述客户端owner。代理socket关闭可晚于下一请求到达，实际代理峰值4；不宣称native始终3或远端工作已终止。8秒等待放在转发前，已取消请求未读上游正文；不冒充迟到正文已送到客户端的检查。'},
  baseState:{mode:baseState.mode,counts:baseState.counts,astronomyModuleSha256:baseState.astronomyModuleSha256},captures,
  nativeTrace:{file:'experience-sao-v43-native-events-2026-09-30.jsonl',sha256:sha(traceBytes),scope:'公开SDK输入及实际WXML/Canvas、页面状态和task HTTP；单个调用ok不认证效果'},
  actualResults:{failureAndRecovery:'九个新增瓦片503；保亮星／目标／选择，实际重试暗星WXML公开tap后同九片200，画布新增点源',
    sameFramePick:'SAO125013的新原生亮点公开坐标tap -> 实际SAO125013资料WXML／8.20视觉星等／HD186536；SAO125140极淡光点tap后页面选择和modal为空，不计普通覆盖层视觉通过',
    obsoleteRequests:'两深层请求缩小取消，三不同视角请求拖动返回取消，三请求来源页hide取消；全部在8秒转发前结束',
    sourceBack:'第二次前后实际Canvas label、时刻、选择一致，完整原生PNG字节SHA相同；不认证不可见普通覆盖层',
    pixelAnalysis:'experience-sao-v43-painted-points-2026-09-30.json',
    boundaries:'源码未变；共享加载／位置／显示与点选owner沿用。未新建天体渲染器、模拟星点、目录、设备参数或预算。'},
  developmentChecks:{build:'隔离v43通过，3项既有警告；不重跑无新源码变化的检查',console:'最终clone|recursive|Error的官方过滤返回空；先前双引号CLI参数解析失败不算通过，过滤也不是全日志或性能结论'},
  investigationFailures:['首次SDK导航启动超时，地图就绪后新调用成功','牛郎星无匹配，Altair匹配HR7557／河鼓二；常用中文别名仍需核查，英文结果不认证中文体验','截图stage含下划线被任务helper拒绝，后以合法新名实际取证','初次分析以PowerShell对象再序列化改写ISO表示，严格几何失败；改读真实HTTP原JSON字节后成功','曾误点来源摘要文字，仍在Sky、请求未取消；只计后续实际来源与许可按钮进入Sources的观察','console初次参数在cmd shim解析失败，后修正命令获得空过滤'],
  limitations:['手机仍不可用，旧手机不认证新版月面或本次结果','Sky普通WXML覆盖层／呼吸／modal视觉仍不可由Canvas-only截图证明；Sources普通控件在本机截图可见','真实GC/GPU/native峰值、OS姿态/生命周期、目标帧时/首屏/官方包体/云成本及最终独立审查仍未验','全场深度、参考构图／面状纹理、配准及模拟环境质量不由两个SAO样本或局部图片完成']};
await fs.writeFile(path.join(task,'evidence/experience-sao-v43-binding-2026-09-30.json'),JSON.stringify(binding,null,2)+'\n');
const note=`# 暗星分层、同帧点选与来源返回：v43\n\n沿原生WEAPP Canvas/WebGL、既有SAO出版／加载／资源和统一渲染owner。Goal active，无预算，未完成；只改云观星，大字号暂停，未触手机／发布。本文是开发证据，唯一当前方案仍为PLAN。\n\n## 实际用户结果\n\n| 模块结果 | 实际观察 | 边界 |\n| --- | --- | --- |\n| 放大后取得更暗的真实恒星 | 同一地点／00:00:05.153／Altair局部45°→8.934°。九个新瓦片503保原星场、三个目标和选择；实际公开“重试暗星”后同九片200，原生画布增加星点 | aria的4120是BSC基础目录，不是SAO新增总数。算法207个新可见位置预测不冒充207个逐点验收 |\n| 显示与点击身份一致 | 预测SAO125013在逻辑(99.596,608.240)，新原生像素RGB总增408；公开坐标tap实际资料为SAO125013／HD186536／8.20视觉星等。另一个SAO125140淡痕RGB总增12，公开tap后页面选择、modal为空 | 同一已绘帧/星等/相机owner；不从星等推断距离，不认证普通标记／呼吸的视觉合成 |\n| 快速缩放与拖动不接旧视角数据 | 8秒有界等待中，缩小取消两深片请求，拖动反向返回取消三不同视角请求；三个来源hide请求取消。最后等待归零，星场／Context／所选时刻仍在 | 本组等待在转发前，取消八请求未到真实上游正文。不是非配合迟到正文已送达的案例 |\n| 来源与返回 | 真正“来源与许可”按钮进入SAO125013来源页；平台Back保时刻／视场／选择。随后一次完整前后原生PNG相同SHA，Canvas label同一45.4°／00:00:05.153 | 曾误点摘要文字未导航，不计通过。Sources普通控件截图可见；Sky普通控件仍缺可靠截图 |\n\n失败与恢复的原图分别为[失败](experience-sao-v43-altair-8-9-failed-2026-09-30.png)、[恢复](experience-sao-v43-altair-8-9-recovered-2026-09-30.png)。同候选同场景裁去系统区后${points.nativeCapture.changed}个像素改变、${points.nativeCapture.increased}个RGB总和增加；具体合法数据／位置／像素与限制见[同帧分析](experience-sao-v43-painted-points-2026-09-30.json)。这不是全场测光、普通UI或手机验收。\n\n## 当前恢复绑定\n\n[完整绑定](experience-sao-v43-binding-2026-09-30.json)与[公开输入／原生节点／HTTP记录](experience-sao-v43-native-events-2026-09-30.jsonl)保实际调用、失败及限制。候选${binding.build.path}，${build.fileCount}文件／${build.totalBytes} rawB／SHA256 ${build.sha256}；v42的16项生产输入hash全部相同。隔离编译通过，既有CSS顺序／资源体积／无异步chunk三个警告保留；源码未变，不重复无新风险的type/owner检查。\n\n只有v43窗口s3，实际SDK3.17.3；此前v42窗口已关。任务代理60063／PID30852／exec39111只转发原60061／PID16572／exec9420／内部52555。本次Context权威读回仍revision4、观测夜09-29、Asia/Shanghai次日00:00:05.153，id哈希与v42相同，没有迁移到另一内存服务。完整权威临时数据在tmp/v43-context-current-readback.json；报告原JSON在tmp/v43-current-public-report.json。不要把route历史dataRevision提示当当前报告hash。最终手动45.4°／DAY标准字号／SAO125013选择，无modal、播放／跟踪／面板。\n\n代理最终pass、active0，瓦片${state.counts.tiles}请求，HTTP状态${JSON.stringify(statuses)}。代理实际连接峰值4；毫秒区间推算峰值${peak}，超过3的非零区间${JSON.stringify(overlaps)}。客户端上限3、代理连接关闭与上游处理是不同观察，不能据实现常量宣称始终3。基本服务最终report${baseState.counts.reports}、targets16、PUT3；期间独立报告更新仍有，不能说整个开发过程没有请求。没有逐帧PUT或本轮新时间提交；没有提高缓存／请求／GPU预算。\n\n## 后续与保留义务\n\n本次“牛郎星”无匹配，Altair能到HR7557／河鼓二。沿已有中文别名owner核查这个常用名，不以英文替代认证中文体验，不据此无界追加别名集合。然后按完整旅程集中整场图层／资料／时间／恢复与质量。两对象面状参考、v42细时刻目标及此前组合保原条件；全部33项义务、商业排除与理由不变。\n\n普通Sky覆盖层／呼吸、面状纹理与构图、星系边缘／配准／源条带、模拟环境整体质量、真实资源峰值／官方包体／费用、最终审查与手机／真实姿态OS验收仍开放。旧手机不认证新月面或本次候选。任务的首次导航／参数／截图命名／对象再序列化失败都保绑定记录，不列产品通过。\n`;
await fs.writeFile(path.join(task,'evidence/experience-sao-v43-native-2026-09-30.md'),note);
const overview='**当前：Goal active、无预算、未完成；只改云观星，大字号暂停、手机暂不可用。** 单窗v43沿v42源码和本代Context，核真实SAO瓦片503保星场／公开重试新增星点、同帧身份点选／淡痕不误选，缩放／平移／来源hide取消及来源Back。当前手动45.4°、所选当地次日00:00:05.153、revision4；原v42细时刻目标／v41跨日跟踪保各自条件。最新[暗星与来源组合](evidence/experience-sao-v43-native-2026-09-30.md)。下一沿既有中文别名owner核“牛郎星”未匹配，再集中整场图层／组合质量。普通覆盖层／呼吸、完整面状呈现、资源／官方包体／成本、最终审查及目标设备仍开放；全部有效范围和商业理由不变。';
const recovery='**恢复与证据：** [当前v43绑定](evidence/experience-sao-v43-binding-2026-09-30.json)保原生产输入hash、候选、实际原图／节点／HTTP和边界；完整权威Context在tmp/v43-context-current-readback.json，原JSON报告在tmp/v43-current-public-report.json。只有v43／s3／实际3.17.3；60063 owned代理（PID30852／exec39111）pass／active0转原60061（PID16572／exec9420／内部52555），原Context没有跨epoch迁移。代理短暂连接峰值4如实记录，不由loader=3宣称native始终3。v42临时SDK／桥诊断已还原，不作根因或新版本验收；当前无产品诊断包装。重建服务先建新Context，旧ID不能迁移；本机／SAMPLE_DATA／Canvas／rawB及一次v24审查不认证整体、手机、性能、成本或最终变化。';
function replaceUnique(text,old,next){assert.equal(text.split(old).length,2,'Expected one current anchor: '+old.slice(0,70));return text.replace(old,next);}
function replaceLine(text,prefix,next){const line=text.split(/\r?\n/u).find(row=>row.startsWith(prefix));assert.ok(line,'Missing current line: '+prefix);return replaceUnique(text,line,next);}
for(const filename of ['PLAN.md','INDEX.md','STATE.md']){
  const filenamePath=path.join(task,filename);let text=await fs.readFile(filenamePath,'utf8');
  text=replaceLine(text,'**当前：Goal active',overview);text=replaceLine(text,'**恢复与证据：**',recovery);
  if(filename==='PLAN.md'){
    text=replaceLine(text,'历史闲置候选窗口已退，','历史闲置候选窗口已退，当前只有v43一个开发者工具窗口；任务60063代理pass转60061本代服务，不改其它业务／共享运行服务。8791/8789历史epoch不作当前健康声明。CLI、节点和Canvas提交成功不代替普通控件合成、整场质量或目标验收。');
    text=replaceUnique(text,'深层瓦片迟到/失败与自然点选、完整时间跟踪/跨午夜/生命周期和整场质量待验','v43已核真实SAO新增／公开重试／同帧点选门槛及缩放／平移／来源hide取消；完整深层／时间／姿态生命周期和整场质量仍待目标验');
    text=replaceUnique(text,'真实手机双指/跟随固定朝向回最新姿态、细层到达稳定性、名称合成/拥挤及目标组合待验','v43细层故障恢复／过时请求取消有开发者工具证据；真实手机双指／跟随回最新姿态、目标细层稳定性／完整名称合成与拥挤仍待验');
    text=replaceLine(text,'3. **下一依赖：','3. **下一依赖：整场呈现与稳定组合。** 细时刻目标／事件／缓存与v42真实失败恢复保原条件；v43真实SAO新增／点选、缩放／平移／来源hide取消及返回有绑定开发证据，无新生产源码或预算。下一先核本次“牛郎星”搜索未匹配与HR7557／河鼓二现有中文别名，再按实际owner补必要的常用入口；不能把英文结果当中文体验完成，也不无界添加名称。随后集中整场图层／面状构图和完整进入→全天／局部→识别→搜索资料→时间／跟踪→返回组合，保持全部义务。普通覆盖层／呼吸没有可靠Sky截图，旧CoverView／RootPortal失败实验不盲重做；两对象参考不取消全部面状渐隐。公共时间固定／预览／播放沿现有单一owner，放大不启动或改变角速度，不新增第二时钟／逐帧报告和PUT。真实OS／目标完整组合仍未验。');
    text=replaceUnique(text,'SAO真实迟到/失败、未解析光斑拾取、星系矩形背景/条带/配准','SAO目标完整渐显／稳定性与资源、面状渐隐构图、星系矩形背景/条带/配准');
    text=replaceLine(text,'当前运行：','当前运行：分支codex/remote-main-20260908、HEAD7898962b80d20df371a758748bc62e8c48db33a7保持，无提交／推送／切换。只有v43／s3，实际3.17.3；60063 owned代理PID30852／exec39111，pass／active0，转原60061／PID16572／exec9420／内部52555。当前权威Context在tmp/v43-context-current-readback.json，revision4／观测夜09-29／当地次日00:00:05.153／手动45.4°／DAY标准字号／SAO125013选中，无面板／modal／播放／跟踪。末次基本服务local'+baseState.counts.local+'／report'+baseState.counts.reports+'／targets16／PUT3；代理123瓦片、9个503、17个延迟、8个取消、峰值4是该epoch开发读数，不是内存／云费用／目标性能。源码及候选hash和全部限制见[绑定](evidence/experience-sao-v43-binding-2026-09-30.json)。失去句柄先核状态，服务重建必须新Context，旧ID不迁移。');
  }
  if(filename==='INDEX.md')text=replaceLine(text,'[当前v41真实fine目标与时间','[当前v43暗星／同帧点选／来源返回](evidence/experience-sao-v43-native-2026-09-30.md)是当前开发入口；[v42细时刻目标／面状参照](evidence/experience-v42-fine-recovery-and-reference-2026-09-30.md)、v41及v38–v30组合保各自原条件。唯一下一依赖见PLAN；普通覆盖层、整场面状／质量、资源／最终审查与手机交付未完成。');
  await fs.writeFile(filenamePath,text);
}
const ownerPath=path.join(root,'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md');
let owner=await fs.readFile(ownerPath,'utf8');
const ownerAnchor='当前BSC5P与已采用SAO分层、加载和连续显示曲线已接入本地开发链，具体责任见[运行与目录边界](../../../../architecture/runtime-and-domain.md)；当前覆盖、显示尺度或软件输出仍不足以自动证明目标设备的完整深层渐显与最终体验。';
const noteLink=path.relative(path.dirname(ownerPath),path.join(task,'evidence/experience-sao-v43-native-2026-09-30.md')).replaceAll('\\','/');
owner=replaceUnique(owner,ownerAnchor,ownerAnchor+' 官方DevTools已核真实SAO瓦片失败保独立星场、公开重试产生新点源与实际资料身份，同帧淡痕不进入可点选集合；缩放／平移／来源hide的过时请求取消和返回保Context沿既有owner。具体候选／点位／像素及范围见[暗星组合开发证据]('+noteLink+')，不升级为完整目标渐显、普通控件合成或实际资源验收。');
await fs.writeFile(ownerPath,owner);
process.stdout.write(JSON.stringify({build:binding.build,transport:binding.transport.counts,statuses,contextRevision:context.revision,sourceBackSamePngSha256:captures[5].sha256,productionSourcesUnchangedSinceV42:true,sourcePaths:sourceHashes.length})+'\n');
