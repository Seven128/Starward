import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const gpuDir='output/playwright/cloud-sky-area-display-support-current-checked-0930';
const gpu=JSON.parse(await fs.readFile(path.join(gpuDir,'result.json'),'utf8'));
for(const owner of gpu.sourceHashes)assert.equal(sha(await fs.readFile(owner.path)),owner.sha256);
const prior=await read('evidence/experience-image-intent-binding-2026-09-30.json');
const previous=await fingerprintBundle(path.resolve(prior.build.path));assert.equal(previous.sha256,prior.build.treeSha256);
const candidatePath='apps/wechat-miniapp/dist/weapp-check-sky-scene-v49-final';
const candidate=await fingerprintBundle(path.resolve(candidatePath));
const oldFiles=new Map(previous.files.map(file=>[file.path,file.sha256]));
const changedFiles=candidate.files.filter(file=>oldFiles.get(file.path)!==file.sha256).map(file=>file.path);
assert.equal(previous.fileCount,candidate.fileCount);
const generatedScope=await read('tmp/v49-generated-bundle-scope.json');
assert.equal(generatedScope.before.sha256,previous.sha256);
assert.equal(generatedScope.after.sha256,candidate.sha256);
assert.deepEqual(generatedScope.changedFiles,changedFiles);
for(const difference of generatedScope.differences){
  if(!difference.modules){assert.equal(difference.effect,'byte-identical after contract module ID 9192 → 8588');continue;}
  assert.deepEqual(difference.newModules,[]);
  assert.deepEqual(difference.modules.filter(module=>!module.unchangedAfterLocalNamesAndContractId).map(module=>module.id),
    difference.file==='common.js'?['9192']:['7016']);
}
const generatedMeaning='合同模块从9192重新编号为8588，额外页面产物仅重连编号；共享包其余函数体经局部变量名归一后相同。实际行为变化限云观星页及其新增显示合同';
const sourceConfig=JSON.parse(await fs.readFile('apps/wechat-miniapp/project.config.json','utf8'));
assert.equal(JSON.parse(await fs.readFile(path.join(candidatePath,'project.config.json'),'utf8')).appid,sourceConfig.appid);
const context=(await read('tmp/v49-context-readback.json')).data,png=await read('tmp/v49-png-readback.json'),process=await read('tmp/v49-owned-process.json');
assert.equal(gpu.contextIdSha256,sha(context.contextId));assert.equal(gpu.reportSha256,sha(await fs.readFile(path.join(task,'tmp/v49-current-public-report.json'))));
assert.equal(gpu.publicationHash,'8b970f207d1b99b3b92e74eb68f0aa6a7ca1f7b5ac51ad86e9d0c6e239540054');
assert.equal(png.priorContextStatus,404);assert.equal(process.processId,24728);
await fs.writeFile(path.join(task,'tmp/v49-candidate-fingerprint.json'),JSON.stringify({before:previous,after:candidate,changedFiles,appIdMatchesSource:true},null,2)+'\n',{flag:'wx'});
const evidence='evidence/experience-area-display-support-2026-09-30.md';
const binding='evidence/experience-area-display-support-binding-2026-09-30.json';
const current='**当前：Goal active、无预算、未完成；只改云观星，大字号暂停、手机暂不可用。** v49已修“局部无可见影像却退休目录识别点”：真实原图的缺测与有效黑色分开，绑定字节的无损显示信息沿出版／合同／HTTP／现有图片owner／共享可见性接入；0.05°正向及倾斜偏心视口保识别点，0.12°／0.8°有效外围、缩回及同帧点选保实际作用。原PNG、旧出版与默认JPEG保留；[当前适用证据]('+evidence+')不认证完整科学质量或原生。普通v49-final仅准备、未打开／推手机。原生末次确认v47／s8欢迎页，本轮未重读；SDK／Sky／原生Context／Canvas＋WXML未验，没有新运行状态不重复排队／刷新／重开。全部33项、商业理由、整场质量及交付义务保持。';
const recovery='**恢复与证据：** [当前v49绑定]('+binding+')保真实当前HTTP／新Context报告／PNG解码／生产GPU及普通候选摘要；[冻结v48星座OFF资源结果](evidence/experience-image-intent-binding-2026-09-30.json)、v47／v46／v45保各自原条件，不升级新版原生。60065 owned服务已因源码协议集成更新为PID24728／exec68590／内部55700；旧PID33832／exec69033已结束，旧Context读回404。新Context revision1／当地09月30日21:50:33，只保原公共正式点和时间偏好，见tmp/v49-context-readback.json；新报告见tmp/v49-current-public-report.json。原生当前Context未知，不宣称新ID已接到欢迎页。后台、磁盘和软件图不代替新版实际运行；旧审查仍限原范围。';
for(const file of ['PLAN.md','STATE.md','INDEX.md']){
  const filePath=path.join(task,file);let text=await fs.readFile(filePath,'utf8');
  assert(text.includes('**当前：Goal active、无预算、未完成；只改云观星'));
  text=text.replace(/^\*\*当前：Goal active[^\r\n]*/m,current).replace(/^\*\*恢复与证据：\*\*[^\r\n]*/m,recovery);
  if(file==='PLAN.md'){
    text=text.replace(/^3\. \*\*当前依赖：[^\r\n]*/m,'3. **当前依赖：整场面状影像与环境组合质量；完整交互和资源义务保留。** v45竖屏参考／宽角识别、v46共存缓存、v47局部真实连线、v48显式OFF资源owner保原适用证据；v49将真实原图的显示支持接到现有链，正向及倾斜偏心的空局部保目录辅助，有效外围／缩回／点选、实际新后端Context有开发证据。未新增图源、改PNG、填缺测、降清晰度或逐帧GPU回读；有限黑色与科学有效率不同。DPR3常用84.633°仍保原源采样／许可／配准／额度，不能统一减半图。下一项对同地点时刻／模式／视场下的整体面状显隐、星系灰白矩形／条带／配准、银河与昼暮夜／红光环境构图，按原始参考体验核实际组合差距并修复；两个参考样本不规定全体科学纹理常显，也不把辅助淡化当完整满足。常用组合暖帧上传8MiB／逻辑纹理22.81MB及139°组合34.93MB保原条件，完整解码／native GPU GC峰值和目标性能仍开放。当前v49-final只准备；原生末次v47欢迎页，不为此循环排队SDK、刷新、重开或重建后端。因实际源码／协议集成更新任务后端时须建立新Context，本次已完成；有新的原生运行状态后，再批量走进入→全天／局部→识别→搜索资料→时间／跟踪→返回，绑定当前Frame／Context和实际普通合成。v43／v44及fine时间恢复保原条件；公共时间无1.7°启动阈值或人为角速度变化、无逐帧报告／PUT。全部33项与商业边界保持。');
    text=text.replace('当前0.05°真实M42透明区零像素仍记已绘／目录辅助退场已复现，空间支持消费缺口为已知失败；','原0.05°真实M42无色彩作用仍记已绘／目录辅助退场已由v49在实际源及正向／倾斜偏心条件修复，原文的“透明局部”经核包含有效黑色样本；');
    text=text.replace(/^当前运行：[^\r\n]*/m,`当前运行：分支codex/remote-main-20260908、HEAD7898962b80d20df371a758748bc62e8c48db33a7保持，无提交／推送／切换。普通v49-final仅准备：${candidate.fileCount}文件／${candidate.totalBytes}rawB／SHA${candidate.sha256}；与冻结v48差异及共享模块重连核对见当前绑定。${generatedMeaning}。当前图片／共享视口／合同／HTTP检查、工作区Mini typecheck及普通构建通过，原三个构建警告保留。没有打开／推手机；末次原生v47／s8欢迎页，本轮未重读，SDK／当前Sky／原生Context／普通合成未知。60065 owned服务PID24728／exec68590／内部55700为新epoch，旧Context404；新的公共Context revision1／当地09月30日21:50:33和实际报告／当前PNG接口已绑定。源有效黑色保留、空色局部保目录辅助、有效外围／回程／点选有当前生产软件结果；native解码／删除／GPU总峰值／GC、普通合成／呼吸／完整旅程、整场面状／背景／环境质量、首屏／官方包体／费用／手机和最终必要独立审查未完成。下一依赖只由阶段3维护。`);
  }
  await fs.writeFile(filePath,text);
}
const ownerPath='project_context/architecture/runtime-and-domain.md';let owner=await fs.readFile(ownerPath,'utf8');
const old='The current cutout transport carries total nonfinite-source pixel counts but no spatial alpha support for the viewport. A successful artwork submission can therefore still cover a fully transparent local crop and retire its catalog cue incorrectly. Renderable source support must remain distinct from submission success, brightness thresholds and measured scientific validity; the current reproduced gap and inputs are retained in the Cloud Sky task evidence.';
assert(owner.includes(old));
owner=owner.replace(old,'The publisher also supplies byte-bound encoded-color display support, separate from alpha/missing data and scientific validity. Lossless row-major empty RGB runs describe original decoded pixels; archived coarse color grids remain readable. The shared contract validates actual response bytes, retains immutable metadata and decodes runs once by metadata identity. The existing registered-artwork visibility owner conservatively rejects color-empty additive-survey viewports using signed offset-view bounds, convex UV edges and source-filter/float margins. A surviving support bound remains eligibility rather than proof of readable scientific structure. Normal color-empty viewing is not a load failure: valid files/decoded images stay with the existing owner for reverse zoom, while the same-frame catalog identity/cue remains available. Byte-identical archived PNG responses may receive the current display refinement without rewriting their manifests, image bytes or source identities; default JPEG consumers retain their offer. Current production HTTP/decoded-PNG/software-GPU results establish the repaired development path, not native composition, phone performance or measured scientific validity.');
await fs.writeFile(ownerPath,owner);
const evidenceText=`# 当前面状影像：空局部保识别、有效内容与恢复保原作用

当前v49修复了“无可见影像仍记已绘并退休识别点”。沿现有出版、合同、HTTP、图片文件／解码、配准可见性、已绘来源与目录辅助接入，未逐天体另造渲染器。有效原图、旧来源身份和默认JPEG保留。[唯一下一依赖](../PLAN.md)继续整场面状／环境组合及全部有效旅程；本结果不认证整体对齐。

## 结果与证据范围

[当前真实结果](../../../../${gpuDir}/result.json)使用已更新的60065任务专属编译后端、其新公共Context报告、实际BSC响应和M42 PNG；执行现有响应owner、真实HTMLImage解码、完整生产软件WebGL与同帧点选。文件回调受控，未经过微信原生文件系统／解码或普通Canvas＋WXML。31个对照覆盖0.05°／0.12°／0.8°、正向及−67°／71°真实相机滚转与偏心中心、缺元数据反证／无图、缩回。所有GL error=0，加载错误回调=0；纹理10/10退休，唯一受控图片文件1/1释放，不能由此认证native GC、GPU总峰值或手机性能。

| 用户结果 | 当前实际作用 |
| --- | --- |
| 空局部仍能识别真实对象 | 三种视口的0.05°均不提交无作用影像、已绘来源为null，与同视口无图分支逐RGBA相同；M42目录身份和点选保留 |
| 有效外围不被一并关闭 | 0.12°／0.8°在三种视口仍有影像作用，去掉显示信息的对照和原绘制逐RGBA相同；0.8°正向也与冻结旧生产bundle相同 |
| 放大、缩回与恢复 | 同一原图／解码／文件owner复用，最后缩回再次恢复空局部识别；正常无内容不触发加载失败或重试 |
| 旧出版和图源身份 | 真实HTTP及固定测试保153张默认JPEG、旧v1／v2／v3清单和三档PNG；只在原图摘要相同的旧PNG响应补当前显示信息 |

原[反例](experience-area-source-support-2026-09-30.md)保修前失败；其“透明局部”解释在本次核准：0.05°实际采样既有alpha=0缺测，也有alpha>0的有效纯黑样本，色彩贡献均为0。全图缺测数不够，也不能把纯黑改称缺测。按原PNG编码的RGB零区间给出显示支持；零alpha邻居若有非零RGB仍保留eligibility以覆盖LINEAR混合，源alpha／有限暗数据／科学有效率不变。初步粗分区在偏心滚转视口仍会包含视口外色彩，已用更紧的共享有符号视口边界、凸UV半平面和无损源像素区间修复。宽／不确定视口继续保守eligible，支持存在不是科学结构可读性的认证。

当前出版hash为\`8b970f207d1b99b3b92e74eb68f0aa6a7ca1f7b5ac51ad86e9d0c6e239540054\`；DETAIL原PNG仍为145,243B／512²／0.9°，SHA\`6976db0ae39a46c2ee8cd165c0a375a55c819d4248c715b064983184020cc0ba\`。DETAIL显示头3,529B，三档元数据共6,761B；这是附加传输数据量，不是费用或设备延迟。科学有效比例仍未知，有限条带／饱和／缺测质量、其它图源和合规覆盖要求保持。只读既有缓存和原PNG，未重下载／重采样源数据或新月面，未填补地貌。

## 当前候选、服务与限制

普通v49-final：${candidate.fileCount}文件／${candidate.totalBytes}rawB／SHA\`${candidate.sha256}\`。${generatedMeaning}，具体差异见绑定内生成产物核对。AppID与源项目一致，diagnostics／fixtures／feedback关闭，未打开／推手机。rawB不是官方包体。

旧任务服务33832／69033已结束；60065新PID24728／exec68590／内部55700载入当前编译模块并经实际接口读回。新Context revision1，仅保原公共正式点／当地09月30日21:50:33偏好，旧ID返回404；观察结果使用该新报告中的UTC20:00，即10月01日04:00夜间帧，不提交新的公共时间。任务地点／天气仍MEMORY_TEST，不是实际运营天气。输入与新Context、编译模块、候选及截图见[绑定](experience-area-display-support-binding-2026-09-30.json)。

原生末次v47／s8欢迎页，本轮未重读；当前SDK／Sky／原生Context／普通合成未知。已检查当前正向与两幅滚转空局部及有效外围原图，属于自审；最终变化仍缺必要独立审查。完整进入／连续浏览／识别／搜索资料／时间跟踪／返回恢复、灰白矩形／条带／配准、面状渐隐、银河及昼暮夜／红光环境、普通覆盖／呼吸、首屏／帧时／内存／弱网／包体／流量／实际费用／Android+iOS均保当前PLAN义务。大字号暂停、手机暂不可用，新月面和本轮修复未推手机。

相关响应／视口／出版／HTTP检查与Mini typecheck、合同／API编译及普通构建有适用通过日志；原三个构建警告保留。本机缺astropy，完整既有FITS测试未重跑；本次三项元数据／原PNG／不可变迁移检查通过，FITS源重采样算法未改。Context validate只检查路径与显式控制源，不认证体验。没有提交／推送／切分支或修改其它业务模块。
`;
await fs.writeFile(path.join(task,evidence),evidenceText,{flag:'wx'});
const validation=spawnSync('cmd.exe',['/d','/s','/c','npm.cmd run context:validate'],{cwd:path.resolve('.'),encoding:'utf8'});
await fs.writeFile(path.join(task,'tmp/area-display-support-context-validate.log'),(validation.stdout??'')+(validation.stderr??''),{flag:'wx'});
assert.equal(validation.status,0,validation.stdout+validation.stderr);
const captures=await Promise.all(gpu.rows.map(async row=>({path:path.join(gpuDir,row.image).replaceAll('\\','/'),sha256:sha(await fs.readFile(path.join(gpuDir,row.image))),kind:'current production software GPU, not native composition'})));
const extra=['workers/miniapp-api/src/deep-sky-imagery.ts','workers/miniapp-api/src/controller.ts','data-pipelines/deep-sky/allwise_finite_tan.py',
  'data-pipelines/deep-sky/test_publish_allwise_w3.py','workers/miniapp-api/assets/deep-sky/manifest.json','workers/miniapp-api/src/deep-sky-image-http.test.ts',
  'apps/wechat-miniapp/src/features/sky/deep-sky-image-request.test.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-registration.test.ts','project_context/architecture/runtime-and-domain.md',
  ...png.modules.map(owner=>owner.path)];
const paths=new Set([...prior.sourceHashes.map(owner=>owner.path),...gpu.sourceHashes.map(owner=>owner.path),...extra]);
const sourceHashes=await Promise.all([...paths].map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const inputFiles=['tmp/v49-candidate-fingerprint.json','tmp/v49-context-resolved.json','tmp/v49-context-readback.json','tmp/v49-current-public-report.json',
  'tmp/v49-backend-state.json','tmp/v49-png-readback.json','tmp/v49-owned-process.json','tmp/v49-checked-readback.log',
  'tmp/area-display-support-current-checked-real-gpu.log','tmp/area-display-support-current-checked-mini-typecheck.log','tmp/weapp-scene-v49-settled-build.log',
  'tmp/area-display-support-settled-owner-tests.log','tmp/area-display-support-bound-view-tests.log','tmp/area-display-support-settled-http-tests.log',
  'tmp/area-display-support-settled-publisher-tests.log','tmp/area-display-support-contracts-build.log','tmp/area-display-support-api-build.log',
  'tmp/area-display-support-context-validate.log','tmp/area-alpha-sampling-result.json','tmp/area-display-support-rolled-sampling.json',
  'scripts/experience-area-display-support-2026-09-30.mts','scripts/experience-scene-v49-readback-2026-09-30.mjs',
  'scripts/experience-area-bundle-scope-2026-09-30.mjs','tmp/v49-generated-bundle-scope.json',evidence];
const inputs=await Promise.all(inputFiles.map(async file=>({path:file,sha256:sha(await fs.readFile(path.join(task,file)))})));
const changed=sourceHashes.filter(owner=>{const old=prior.sourceHashes.find(value=>value.path===owner.path);return old&&old.sha256!==owner.sha256;}).map(owner=>owner.path);
const bound={recordedAtUtc:new Date().toISOString(),goal:'active/unbudgeted/incomplete',scope:'Cloud Sky color-empty viewport cue, immutable display metadata and current compiled local epoch; development evidence only',
  sourceHashes,changedProductionOwners:changed,inputs,captures,generatedBundleScope:generatedScope,
  build:{path:candidatePath,treeSha256:candidate.sha256,rawBytes:candidate.totalBytes,files:candidate.fileCount,changedFilesFromV48:changedFiles,appIdMatchesSource:true,
    intent:'ordinary isolated check, diagnostics/fixtures/feedback off',runtime:'prepared only; not opened or phone previewed'},
  context:{idSha256:sha(context.contextId),fingerprint:context.contextFingerprint,revision:1,selectedAtUtc:context.selectedAtUtc,localDate:context.localDate,
    priorContextStatus:404,scope:'fresh public test formal spot/preferences; native Context unknown'},
  backend:{publicPort:60065,localPort:55700,processId:24728,execSession:68590,modules:png.modules,publicationHash:gpu.publicationHash,
    scope:'new epoch, real compiled services, MEMORY_TEST formal spot/weather; old owned epoch closed'},
  software:{path:path.join(gpuDir,'result.json').replaceAll('\\','/'),sha256:sha(await fs.readFile(path.join(gpuDir,'result.json'))),productionBundleSha256:gpu.productionBundleSha256,
    sourceSha256:gpu.sourceSha256,scenarios:gpu.rows.length,retired:gpu.retired},
  runtime:{lastObserved:'v47/s8 welcome; no fresh native probe this turn',sdk:'unverified',sky:'unverified',nativeContext:'unverified',canvasWxml:'unverified',phone:'unavailable; no preview'},
  visualInspection:{independence:'self review only',files:['1-current-0.05-roll0.png','12-current-0.05-roll-67.png','21-current-0.05-roll71.png','9-current-0.8-roll0.png'],meaning:'source-empty crop cues and valid wider source inspected; not complete quality acceptance'},
  remaining:'All 33 obligations and commercial exclusions; full area/environment composition, ordinary controls/motion and journey, target stability/performance/costs, Android+iOS, necessary final independent review',
  actions:{sourceImagesChanged:false,sourceDownloaded:false,nativeOpened:false,phonePreviewed:false,commit:false,push:false,branchChanged:false,otherBusinessEdited:false}};
await fs.writeFile(path.join(task,binding),JSON.stringify(bound,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidate:{files:candidate.fileCount,rawBytes:candidate.totalBytes,sha256:candidate.sha256,changedFiles},
  publicationHash:gpu.publicationHash,currentContextIdSha256:sha(context.contextId),captures:captures.length,contextValidated:true,remaining:'overall/native/device acceptance retained'}));
