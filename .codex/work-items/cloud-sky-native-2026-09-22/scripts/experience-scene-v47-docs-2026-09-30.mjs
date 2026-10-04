import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const binding=JSON.parse(await fs.readFile(path.join(task,'evidence/experience-scene-v47-binding-2026-09-30.json'),'utf8'));
assert.equal(binding.runtime.sdk,null);assert.equal(binding.runtime.currentPage,null);
const current='**当前：Goal active、无预算、未完成；只改云观星，大字号暂停、手机暂不可用。** v47沿真实参考修局部识别：同一星座开关／宽端退场，局部插画／名称／图片请求渐隐，真实连线保留。真实出版生产软件GPU的局部／暖红／关闭／宽角恢复有实际像素作用，已绘身份与点选保持、深局部无插画上传、退休归零；这不是整场或原生验收。[v47适用记录](evidence/experience-scene-v47-lines-2026-09-30.md)保修前失败、源采样否决与目标缺口。v46／s6已正式关闭，只新开v47／s8；开页／一次刷新只有触发回执，实际截图仍欢迎页，SDK／当前页读取超时，新版星空未验。下一核实际编译／SDK启动链及完整组合，资源和质量独立推进；全部有效范围、商业理由和交付义务不变。';
const recovery='**恢复与证据：** [当前v47绑定](evidence/experience-scene-v47-binding-2026-09-30.json)保源码、普通候选、实际出版软件原图／点选／纹理归零、12条官方回执／失败／欢迎页补证及限制。[冻结v46缓存／共存](evidence/experience-scene-v46-binding-2026-09-30.json)与[冻结v45参考／原生53事件](evidence/experience-scene-v45-binding-2026-09-30.json)保原条件，不升级新版原生。60065服务PID33832／exec69033／内部54455未重建；tmp/v47-context-readback.json后台GET读回同revision1／Context fingerprint／当地09月30日21:50:33，原报告仍在tmp/v45-current-public-report.json。当前只确认v47／s8及欢迎页，SDK／Sky页面／原生Context／Canvas＋WXML未知；无待轮询工具句柄。不得用后台、磁盘、软件图或旧SDK冒充实际新版。服务重建必须新Context，旧v44／v43／v42／v41和v24审查只保原适用范围。';
for(const file of ['PLAN.md','STATE.md','INDEX.md']){
  const absolute=path.join(task,file),old=await fs.readFile(absolute,'utf8');
  assert(old.includes('**恢复与证据：** [当前v46绑定]'));
  let text=old.replace(/^\*\*当前：[^^\r\n]*\*\*[^\r\n]*$/m,current)
    .replace(/^\*\*恢复与证据：\*\*[^\r\n]*$/m,recovery);
  assert(text.includes(current)&&text.includes(recovery));
  if(file==='PLAN.md'){
    text=text.replace(/^历史候选保各自退休回执；v45[^\r\n]*$/m,
      '历史候选保各自退休回执；v45／s5与v46／s6关闭已由官方工具确认。只新开v47／s8，开页与一次refresh仅触发回执，实际父窗口截图仍欢迎页，currentPage／带等待截图300s超时；未取得新版Sky／SDK／普通合成，不再盲目刷新或另开窗。60065服务保当前epoch，不改其它业务／共享运行服务。CLI、磁盘、节点与软件GPU成功不代替完整旅程、整場质量或目标验收。');
    text=text.replace('星座插画／线／名双端渐隐，当前深空辅助',
      '星座保同一开关和宽端退场，局部插画／名称及图片请求渐隐、真实连线保留，当前深空辅助');
    const start=text.indexOf('3. **当前依赖：识别差异与整场组合，资源义务保留。**');
    const end=text.indexOf('\n4. **整场质量、干净候选和目标验收。**',start);assert(start>=0&&end>start);
    const next='3. **当前依赖：完整组合与实际运行，资源义务保留。** v45真实竖屏参考核FOV定义并恢复84.6°星座识别；v46共享GPU缓存修整循环上传，八组实际银河或W3＋星座＋地景保原像素／身份。v47先核源采样：DPR3常用84.633°视场没有统一半尺寸档余量，DPR1网格样本的局部降档也不足以解决共存；不采用生产统一降档，不改原PNG／许可／配准。沿同一显示owner修局部插画消失后连线应保留的差异，真实修前失败、生产GPU局部／暖红／关闭／宽角恢复、实际同星点选及0.05°至宽角真实裁切均有开发证据；25°／84.633°／115°／140°及OFF原像素保持，深局部不上传插画、退休归零，未将这些等同整场验收。常用银河组合仍暖帧上传8MiB、逻辑纹理22.81MB，139°组合34.93MB；保完整解码／native GPU GC峰值与目标性能义务。下一先核当前普通候选实际编译／SDK启动链，官方开页／刷新触发有回执、实际welcome及300s读取失败不能证明进入Sky，不因超时重建服务／窗口。能进入后按进入→全天／局部→识别→搜索资料→时间／跟踪→返回组合批量取当前Frame／Context／原图。独立推进已有源／配准／共享加载责任的实际解码需求与面状／背景／环境质量，不随意缩门槛、降清晰度、扩大额度或重启选型。v44有限别名与v43／v42／v41恢复保原条件；全部33项和商业边界保持。放大只放大屏幕位移，单一公共时间无1.7°启动／人为角速度变化、无逐帧报告或PUT。';
    text=text.slice(0,start)+next+text.slice(end);
    text=text.replace('4. **整场质量、干净候选和目标验收。** v46有软件缓存／共存证据，官方新版运行仍未验；',
      '4. **整场质量、干净候选和目标验收。** v47有局部识别开发证据，v46共存／资源缺口保持；官方新版Sky仍未验，当前欢迎页与编译触发不算完成；');
    text=text.replace('参考局部连线差异与广角资源仍开放；','局部连线差异已由v47生产软件GPU修证，原生与广角资源仍开放；');
    text=text.replace(/^当前运行：分支codex\/remote-main-20260908[^\r\n]*$/m,
      `当前运行：分支codex/remote-main-20260908、HEAD7898962b80d20df371a758748bc62e8c48db33a7保持，无提交／推送／切换。普通候选v47，${binding.build.files}文件／${binding.build.rawBytes.toLocaleString('en-US')}rawB／SHA${binding.build.treeSha256}，比冻结v46只差sky/detail/index.js；相关16/16、Mini typecheck／隔离构建及Context validate通过，原三个警告保留。v46／s6关闭已确认，v47／s8是当前唯一新开候选；父窗口在编译触发／一次refresh后仍welcome，SDK／当前页／带等待截图300s超时，无待轮询句柄，原生Sky与Context未知。60065 owned服务PID33832／exec69033／内部54455同epoch，后台GET见tmp/v47-context-readback.json，revision1／09月30日21:50:33／fingerprint保持；这不是原生读回。局部软件原图、身份／真实点选及资源归零保v47绑定，宽端共存保冻结v46；完整解码／GPU/native／GC峰值、普通合成／呼吸、完整面状／灰底／环境质量、首屏／官方包体／费用／手机及最终必要独立审查未完成。恢复实际编译／SDK先取状态，不盲目刷／开；服务重建须新Context。`);
    const table=value=>value.split(/\r?\n/).filter(line=>line.startsWith('|'));
    assert.deepEqual(table(text),table(old).map(line=>line.replace('参考局部连线差异与广角资源仍开放；','局部连线差异已由v47生产软件GPU修证，原生与广角资源仍开放；')));
  }
  if(file==='INDEX.md')text=text.replace(/^\[当前v46共享缓存[^\r\n]*$/m,
    '[当前v47局部识别／源采样／原生补证](evidence/experience-scene-v47-lines-2026-09-30.md)是当前开发入口；[冻结v46共享缓存／八组共存](evidence/experience-scene-v46-cache-2026-09-30.md)、[冻结v45真实参考与识别组合](evidence/experience-scene-v45-native-2026-09-30.md)、[v44中文身份链](evidence/experience-alias-v44-native-2026-09-30.md)、[v43暗星／同帧点选／来源返回](evidence/experience-sao-v43-native-2026-09-30.md)及旧轮保各自条件。v47只确认编译触发与欢迎页，SDK／Sky／普通合成未验。唯一下一依赖见PLAN；完整旅程、源／解码／共存、面状／背景／环境质量、资源／费用／审查和手机交付保持。');
  if(file==='STATE.md')text=text.replace(/^\[当前v38连续时间[^\r\n]*$/m,
    '[当前v47局部识别／源采样／原生补证](evidence/experience-scene-v47-lines-2026-09-30.md)是当前开发入口；v46共存与v45参考／原生、v44中文身份／v43暗星／v42恢复／v41时间及旧轮只保各自条件。当前v47／s8仍welcome，SDK／Sky／普通合成未验；唯一下一依赖见PLAN当前阶段第3项，完整交付和手机依赖保持。');
  await fs.writeFile(absolute,text);
}
const owners=['PLAN.md','STATE.md','INDEX.md','REQUIREMENTS.md','USER-UPDATES.md','request-original.txt','GOAL-OBJECTIVE-HANDOFF-2026-09-28.md','SCOPE-CHANGE-2026-09-23.md'];
const hashes=await Promise.all(owners.map(async file=>({path:file,sha256:createHash('sha256').update(await fs.readFile(path.join(task,file))).digest('hex')})));
const contexts=await Promise.all(['project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md']
  .map(async file=>({path:file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
const maintenance={recordedAtUtc:new Date().toISOString(),goal:'active/unbudgeted/incomplete',uniquePlan:'PLAN.md',
  requirements:'all existing obligation rows preserved; one local development-evidence gap refreshed without narrowing native/final scope',hashes,contexts,
  validation:'owning Context validate and scoped diff check passed; neither certifies product/native quality',
  continuationClassification:'progress: source/rendered identification repair, candidate, real before/after pixel/picking/resource evidence and actual native welcome observations; not a verified-live wait',
  native:'s8/welcome and trigger acknowledgements; Sky/SDK/native Context unverified, no pending tool cells'};
await fs.writeFile(path.join(task,'evidence/experience-scene-v47-maintenance-checks-2026-09-30.json'),JSON.stringify(maintenance,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({documents:['PLAN.md','STATE.md','INDEX.md'],goal:maintenance.goal,classification:maintenance.continuationClassification,requirements:maintenance.requirements,native:maintenance.native}));
