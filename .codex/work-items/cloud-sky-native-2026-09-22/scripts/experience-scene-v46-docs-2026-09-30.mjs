import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const binding=JSON.parse(await fs.readFile(path.join(task,'evidence/experience-scene-v46-binding-2026-09-30.json'),'utf8'));
assert.equal(binding.runtime.sdk,null);assert.equal(binding.runtime.currentPage,null);
const current='**当前：Goal active、无预算、未完成；只改云观星，大字号暂停、手机暂不可用。** 本轮沿 v45 的广角资源发现修共享 GPU 缓存整循环重上传，保前一帧复用，到帧后按原16MiB回收。真实软件GPU单层、相机变化／退场／恢复和八组星座＋银河或W3＋地景均保持原像素与身份；共存仍会重复上传大图，资源与目标性能未闭合。[v46适用记录](evidence/experience-scene-v46-cache-2026-09-30.md)保真实修前失败及新版原生未验。v45／s5已确认关闭；v46／s6只确认曾打开，后续SDK／页面／像素及关闭均未确认，没有继续开新窗口。下一收敛实际源分辨率／解码需求与共存，再处理局部线／图差异及整场组合质量；全部有效范围、商业理由和最终交付义务不变。';
const recovery='**恢复与证据：** [当前v46绑定](evidence/experience-scene-v46-binding-2026-09-30.json)保源、候选、软件原图／实际纹理流量／退场归零、原生工具失败及证据限制。[冻结v45参考与原生记录](evidence/experience-scene-v45-binding-2026-09-30.json)保原53条记录、真实竖屏参考FOV定义和适用交互，不认证v46。60065任务服务（PID33832／exec69033／内部54455）未重建；tmp/v46-context-readback.json后台读回同一revision1／Context fingerprint／当地09月30日21:50:33，原报告仍在tmp/v45-current-public-report.json。当前原生状态未知，不用磁盘trial或旧SDK冒充实际版本。官方连接恢复先只读状态，服务重建必须新Context；旧v44／v43／v42／v41及v24审查仅保原适用范围。';
for(const file of ['PLAN.md','STATE.md','INDEX.md']){
  const absolute=path.join(task,file),old=await fs.readFile(absolute,'utf8');
  assert(old.includes('**当前：Goal active、无预算、未完成；只改云观星'));
  assert(old.includes('**恢复与证据：** [当前v45绑定]'));
  let text=old.replace(/^\*\*当前：[^^\r\n]*\*\*[^\r\n]*$/m,current)
    .replace(/^\*\*恢复与证据：\*\*[^\r\n]*$/m,recovery);
  assert(text.includes(current)&&text.includes(recovery));
  if(file==='PLAN.md'){
    text=text.replace(/^历史闲置候选窗口已退，当前只有v45[^\r\n]*$/m,
      '历史候选保各自退休回执；v45／s5关闭已由官方CLI确认。v46／s6是最后确认打开的唯一候选，官方transport随后失败，当前运行／关闭状态未知，不再盲目开窗或刷新。60065服务仍保当前epoch，不改其它业务／共享运行服务。CLI、磁盘、节点与软件GPU成功不代替普通控件合成、整场质量或目标验收。');
    const start=text.indexOf('3. **下一依赖：广角图片资源与整场组合。**');
    const end=text.indexOf('\n4. **整场质量、干净候选和目标验收。**',start);
    assert(start>=0&&end>start);
    const next='3. **下一依赖：实际图片需求、共存与整场组合。** v45真实竖屏参考核FOV定义并恢复84.6°星座识别，原图与原生条件保冻结证据。本轮v46沿同一共享图片／GPUowner修整循环重上传：星座压力样本暖帧25／34降至3／9，八组真实银河或W3＋星座＋地景保持原像素／已绘身份，帧后按原16MiB保留、退休归零。常用84.633°完整银河组合仍每暖帧上传8MiB，实际帧逻辑纹理22.81MB；139°组合样本34.93MB，不能由缓存额度达标宣布资源或目标性能完成。下一沿既有出版、配准、加载和分辨率选择owner结合实际投影像素收敛仍wanted源／解码需求，保有效内容、原图、几何、许可和目标质量，不随意缩窄显示门槛、删图或扩大额度。新版官方SDK／页面／像素未取得；工具连接恢复后先读当前状态，不能因工具失败推定产品黑屏。随后处理参考局部插画退出但连线保留的差异与完整进入→全天／局部→识别→搜索资料→时间／跟踪→返回组合。v44牛郎星有限纠漏已关闭，不无界补别名；原33项及面状纹理／灰白背景／环境／质量义务保持。倍率不启动或改变角速度，公共时间沿单一owner，不新增逐帧报告或PUT；v43／v42／v41失败恢复保各自条件。';
    text=text.slice(0,start)+next+text.slice(end);
    text=text.replace('4. **整场质量、干净候选和目标验收。** 从全天圆盘',
      '4. **整场质量、干净候选和目标验收。** v46有软件缓存／共存证据，官方新版运行仍未验；工具故障保独立依赖，不阻塞可做开发。从全天圆盘');
    text=text.replace(/^当前运行：分支codex\/remote-main-20260908[^\r\n]*$/m,
      `当前运行：分支codex/remote-main-20260908、HEAD7898962b80d20df371a758748bc62e8c48db33a7保持，无提交／推送／切换。当前候选v46，${binding.build.files}文件／${binding.build.rawBytes.toLocaleString('en-US')}rawB／SHA${binding.build.treeSha256}，比冻结v45只差sky/detail/index.js；相关18/18、Mini typecheck／隔离构建通过，原三个警告保留。v45／s5关闭已确认，v46／s6仅确认曾打开；currentPage超时、截图失败、编译无完成回执和targeted close transport失败，当前窗口／SDK／页面／像素未知，未再开窗。60065 owned服务PID33832／exec69033／内部54455保同一epoch，后台GET Context见tmp/v46-context-readback.json，revision1／09月30日21:50:33／fingerprint保持；这不是当前原生状态。软件渲染原图、完整组合上传、逻辑峰值和归零保v46绑定；完整解码／GPU/native／GC峰值、普通合成／呼吸、局部线／图差异、整体质量／官方包体／费用／手机及最终独立审查未完成。官方连接恢复先读状态；服务重建必须新Context。`);
    // Preserve every pre-existing requirements/result row, including its gap.
    const tables=value=>value.split(/\r?\n/).filter(line=>line.startsWith('|'));
    assert.deepEqual(tables(text),tables(old));
  }
  if(file==='INDEX.md'){
    text=text.replace(/^\[当前v45可比星座识别[^\r\n]*$/m,
      '[当前v46共享缓存／实际共存／原生工具失败](evidence/experience-scene-v46-cache-2026-09-30.md)是当前开发入口；[冻结v45真实参考与识别组合](evidence/experience-scene-v45-native-2026-09-30.md)、[v44中文身份链](evidence/experience-alias-v44-native-2026-09-30.md)、[v43暗星／同帧点选／来源返回](evidence/experience-sao-v43-native-2026-09-30.md)、v42／v41和v38–v30保各自条件，不认证v46原生运行。唯一下一依赖见PLAN；源分辨率／解码及共存、普通覆盖层、局部面状／整体质量、资源／最终审查与手机交付未完成。');
  }
  await fs.writeFile(absolute,text);
}
const ownerPath=path.resolve('project_context/architecture/runtime-and-domain.md');
const oldOwner=await fs.readFile(ownerPath,'utf8');
const old='The GPU renderer batches points and line triangles. `sky-gpu-textures.ts` owns decoded-image identity, failed-upload latching, reuse and bounded texture retention for survey imagery and artwork; unused images are released after a frame and all resources on lifecycle reset, hide, removal, failure and disposal. The retention budget is not a claim about upload peak memory.';
const updated='The GPU renderer batches points and line triangles. `sky-gpu-textures.ts` owns decoded-image identity, failed-upload latching, reuse and bounded texture retention for survey imagery and artwork. During submission it protects identities used by the previous frame, so a stable working set above retention does not cyclically evict every reusable texture before drawing it again. At finish it releases unused images and trims LRU retention to the existing budget; lifecycle reset, hide, removal, failure and disposal release all resources. Temporary frame ownership may exceed retention, and the budget is not a claim about upload, driver, native-bitmap or GC peak memory. Still-wanted source/decoded-image demand and repeated uploads in combined scenes remain separate resource-selection and target-measurement obligations.';
assert.equal(oldOwner.split(old).length,2);
await fs.writeFile(ownerPath,oldOwner.replace(old,updated));
console.log(JSON.stringify({taskDocuments:['PLAN.md','STATE.md','INDEX.md'],context:ownerPath,requirementsRows:'preserved',goal:'active/unbudgeted/incomplete',native:'unverified'}));
