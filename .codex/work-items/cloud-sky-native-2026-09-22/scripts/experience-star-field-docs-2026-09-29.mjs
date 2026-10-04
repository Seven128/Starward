import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const root=process.cwd(),item=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22");
const candidate=JSON.parse(await fs.readFile(path.join(item,"evidence/experience-combined-clean-v22-candidate-2026-09-29.json"),"utf8"));
const close=JSON.parse(await fs.readFile(path.join(item,"evidence/experience-star-field-close-2026-09-29.json"),"utf8"));
const reportPath=path.join(item,"evidence/experience-star-field-2026-09-29.md");
await assert.rejects(fs.access(reportPath),{code:"ENOENT"});
const report=`# B1/B3 整场恒星辨识与共享点显示

原生不能安全恢复时，依唯一PLAN继续整场浏览与辨认：BSC、SAO及尚未分辨的行星复用现有点program/buffer，使用有界柔和轮廓，减少均匀硬圆的观感。目标圆环/实心符号保持原样；真实日月行星盘面、相位和环仍走原球面责任。没有新渲染器、纹理、program、缓存或科学光度/PSF要求，没有重选技术或改商业范围。

## 参考与判断边界

通过项目Browser runtime复用原Stellarium tab，读回实际Canvas CSS390.4×844；公开示例点22.4826799N/114.5557147E、Asia/Shanghai、Vega、参考短边FOV40.78913364849271°对应本产品垂直85°。本次参考UI读到00:00:14/2026-09-29，较报告16:00:00Z晚14秒；引擎修订未知，时间popup动作没有观察到展开。只取外观判断，不作严格像素配准或当前native验收。参考使用不同、更深星表；Gaia等排除仍有效。

原参考与当前输出都能看出亮星层次差异。自有有界径向衰减重新分布当前星等owner给出的显示亮度，不复制AGPL代码；颜色、星等、缩放/暮光/空气质量、身份与点选规则保持。有限显示半径和打包参数只由GPU owner持有，不能解读为真实角直径、眼睛/仪器PSF或现场测量。

参考：[实际捕获](experience-star-field-reference-2026-09-29.png)、[条件与限制](experience-star-field-reference-2026-09-29.json)。生产代码：sky-render-surface.ts、sky-gpu-renderer.ts、sky-scene-render.ts。

## 实际结果

- 修前保留当前生产bundle，实际WebGL在DPR1/2/3下未出现柔和尾部，结果断言失败；修后相同半径/颜色/透明度出现有界尾部。亮星样本积分相对原圆点为101.8%、99.3%、98.9%；这是显示样本值，不是全部星等的光度校准。普通实心标记和圆环的像素样本完全一致，GL错误0。
- 使用实际本地BFF、BSC与经真实Mini合同client验证的SAO出版和瓦片、相同精确观察帧、注册星座/银河/地景/W3及M42源绑定影像。15场景覆盖昼/暮/夜25°/85°/267.8°、同尺度红光、M42多层/细看与回程。两版本同一页/GL/输入，独立生产renderer沿各场景复用。
- 相同已绘对象身份/位置/星等和点选候选列表保持；实际SAO有非空绘制和成功选中自身的正例，不能以空fixture通过。夜间25°可点BSC70/SAO187，85°为419/2，全天1627/4，M42细看2/5；数量只证明该场景，不是覆盖上限或完成率。
- 非空点显示确有像素变化；夜间85°经过其它视场/时刻/模式返回，与同版初始完整RGBA完全一致。稳定重绘没有额外影像上传；两个renderer共60纹理创建/60退休。成功图片/来源与地景选择保持。
- 当前Mini类型、受影响星等/星座/同帧校准/日月行星几何与点选行为检查、生产shader/整场诊断及隔离构建通过。保原3项webpack警告（CSS顺序、两项推荐体积/性能），不将其作为本轮解决。

原始软件输出保在output/playwright/cloud-sky-star-profile-0929-before、-after和cloud-sky-star-field-0929。夜间对照：[修前](../../../../output/playwright/cloud-sky-star-field-0929/night-85-before.png)、[修后](../../../../output/playwright/cloud-sky-star-field-0929/night-85-after.png)、[全天](../../../../output/playwright/cloud-sky-star-field-0929/night-267.8-after.png)。原result.json不覆盖；通用生成器中fixedLocalView与参考/测量描述对本场景的适用范围已在[关闭记录](experience-star-field-close-2026-09-29.json)明确，实际每行basis/时刻/样本未改。

## 成本与候选

点上传每点增加一个profile值；该全天场景实际上传63,840→71,820B（+12.5%，+7,980B）。点精灵面积推导上界32,628→98,316 backing px约3倍，这是实际半径推导的方形覆盖上界，不是已测片元/显存或目标GPU工作。没有增加GPU程序或纹理owner。

同页12轮交替暖场/30对交替计时：夜间85°提交中位8.90→10.75ms、全天11.00→12.95ms；同一85°回程批次9.60→8.85ms，部分其它场景下降、部分尾延迟增加。计时包含同步JS/GL等待，不能把独立drain的0ms当作GPU无成本，不认证稳定提速/性能通过或目标FPS。点上传/面积取证在计时结束后才包装GL调用，本轮没有重复原网格/投影独立profile。

clean-v22 prepared、未打开：SHA256 ${candidate.fingerprint.sha256}，257文件/4,484,284 rawB；main2,089,538/content1,012,055/sky959,074/spot423,617B。较v21仅raw/Sky+537B，主包不变；v21完整指纹保持。无诊断/mock/代次/vConsole/maps，app debug false；loopback8791仅开发包，不推手机，raw不是官方包体。

本轮未替换服务。8791实际来源模块hash与上轮绑定相同，Context仍8789，pass/pass/held0/active0/PUT0；只读安全汇总，不读取或持久化旧native活动Context/夹具。没有新DevTools窗、原生RPC、取消提权重试、手机/部署/采购/提交动作。

## 当前仍开放

这是B1/B3共享显示的本地开发边界，不是完整对齐验收。实际Taro/WEAPP控件/标签与进入→连续缩放/识别→搜索/点选/资料→时间/跟踪→返回恢复的本代组合，真实姿态/完整校准/后台、Android/iOS、新月面本代手机、环境/源条带饱和/配准/合法覆盖、目标资源/首屏/帧时/官方包体/成本及独立审查继续保留。软轮廓不消除目录/环境/源差异，不能继续无依据微调此轮廓占据主线。

唯一下一依赖见PLAN：能安全恢复native时先核旧会话/4B归属并退休，只用一个v22集中核完整组合；不能安全恢复时继续整页识别与昼暮夜/模式/图层显示语义的实际差距，不重复闭合的来源故障、星点probe/投影profile、单体WCS或已取月图。
`;
const checkpoint=`B1/B3整场辨识已沿原共享点GPU接柔和恒星/未分辨行星轮廓，标记与真实盘面保持；BSC/SAO真实出版和15场景的已绘身份/点选/影像来源保持，夜间回程RGBA相同，稳定无重上传/60纹理退休。详[整场点显示](evidence/experience-star-field-2026-09-29.md)。软件测量有升有降，点上传+12.5%/面积上界约3倍，目标性能不通过认证。clean-v22 prepared未打开，SHA ${candidate.fingerprint.sha256}、257文件/4484284 rawB、main2089538B；较v21仅Sky/raw+537B，v21指纹保持。8791来源模块仍上轮hash/Context8789，pass/pass/held0/active0/PUT0，无服务替换、新窗、native RPC/取消提权重试、手机/云/Git动作。旧v12 Frame/Context/4B未知；完整旅程、B3/C质量/合法覆盖、姿态/校准/后台、Android/iOS、新月面手机、目标资源/官方包体/费用/独立审查继续开放。唯一依赖见PLAN，Goal active、无预算、未完成。`;
const names=["PLAN.md","STATE.md","INDEX.md"],staged=[];
for(const name of names){
  let text=await fs.readFile(path.join(item,name),"utf8");
  const heading=name==="PLAN.md"?"**当前：Goal active、无预算；完整体验继续，真机不可用。** ":"**当前检查点：Goal active、无预算；完整体验继续，真机不可用。** ";
  const pattern=/^\*\*当前(?:检查点)?：[^\r\n]+/m;assert(pattern.test(text));text=text.replace(pattern,heading+checkpoint);
  text=text.replaceAll("当前v21","当前v22").replaceAll("当前准备候选为尚未打开的clean-v21","当前准备候选为尚未打开的clean-v22").replaceAll("最新准备候选为尚未打开的clean-v21","最新准备候选为尚未打开的clean-v22");
  text=text.replaceAll("历史准备（当前v20，原v19未改）","历史准备（该轮v20、现v22，原v19未改）");
  if(name==="PLAN.md"){
    const next="   **接续顺序：**";assert.equal(text.split(next).length,2);
    text=text.replace(next,"   **B1/B3整场恒星辨识已闭合本轮本地边界。** [当前显示与成本](evidence/experience-star-field-2026-09-29.md)保真实BSC/SAO合同输入、DPR1/2/3及15整场条件；同一GPU点program/buffer服务恒星和未分辨行星，符号/真实盘面分工不变。点选/来源/往返保持，软件耗时有升有降、点缓冲与面积增加，目标质量/性能不提升验收。v22 prepared未打开、主包不增、v21指纹保持；不再无依据重复这项软轮廓检查或精修。\r\n\r\n"+next);
    text=text.replace("再只开一个v21","再只开一个v22");
    text=text.replace("从既有B3/C整场质量与其它有效独立差距继续","从既有B1/B3/C整页识别、昼暮夜/模式/图层语义与其它有效独立差距继续");
  }
  staged.push([path.join(item,name),text]);
}
let progress=await fs.readFile(path.join(item,"PROGRESS.md"),"utf8");
progress+="\r\n\r\n## 2026-09-29 B1/B3整场恒星辨识\r\n\r\n"+checkpoint+"\r\n\r\n原参考实际CSS/时钟与已绘输出保范围；修前实际GPU无柔和尾部，修后共享profile有效且符号/圆环保持。整个源输入、候选及软件检查未冒充手机/整体验收；成本增加和计时波动保原样。两Context owner随当前共享语义更新，唯一下一依赖仍在PLAN。\r\n";
await fs.writeFile(reportPath,report,{flag:"wx"});
for(const [file,text]of staged)await fs.writeFile(file,text);
await fs.writeFile(path.join(item,"PROGRESS.md"),progress);
console.log(JSON.stringify({report:path.relative(root,reportPath),candidate:candidate.fingerprint.sha256,updated:names.concat("PROGRESS.md"),service:close.service}));
