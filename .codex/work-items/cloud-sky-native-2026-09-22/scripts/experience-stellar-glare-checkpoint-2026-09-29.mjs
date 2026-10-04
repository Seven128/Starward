import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const directory='.codex/work-items/cloud-sky-native-2026-09-22';
const current='**当前：Goal active、无预算、未完成；只改云观星，大字号继续暂停。当前v33/s9/PID25916完整窗口，SHA8d89d70f…、257文件/4,494,597rawB/110生产输入已核；只有Sky分包和项目配置变化，地图及其他分包保持。正式示例点/2026-09-29 21:00 Asia/Shanghai/观测夜09-29/UTC13:00/revision1，Altair选择/2.67°手动/DAY标准字号，星座/地景/地平ON、W3/赤道OFF，无跟踪/modal/list/choices/timepanel/Canvas错误。Context SHA1746aa90…/fingerprinta4cf34ca…；旧v32/s8已退。共享点源有界光晕/星芒已接BSC/SAO/未分辨行星同一通道，真实颜色/核心尺度/透明度及拾取几何保留；软件修前失败/修后实际RGBA与原生亮星像素均有开发证据。公共Altair资料/定位、实际45→8.9→2.67→45→2.67、清除标记后的星点自然拾取保持身份；星场裁剪区回程0差。60事件/四原图已冻结，SDK3.17.3。普通覆盖层/呼吸仍缺图像证据，不能判纯截图或产品图层问题；当前固定所选时刻没有连续天文时间推进，不借回程静止证明运动完成。v32持久选择及v31局部星座淡化各保原证据。公共时间/倍率/跟踪、未解析光斑门槛、深空辅助层和整体组合继续依唯一PLAN；SAO迟到/失败、整场质量/配准、手机/新版月面、姿态/OS后台、目标性能/官方包体/费用与最终必要审查仍未完成。**';
const recovery='**恢复与证据：** [v33共享点源/原生检查](evidence/experience-stellar-glare-2026-09-29.md)、[本代原生冻结绑定](evidence/experience-stellar-glare-native-validation-2026-09-29.json)及[软件RGBA绑定](evidence/experience-stellar-glare-gpu-validation-2026-09-29.json)是最新入口。当前Altair/2.67°/21:00标准字号；原生完整窗三图427×919，lite192×413只保宿主诊断。公开选中/自然点选只认证行为与节点；覆盖层实际合成和呼吸保持未验。v32/v31/v30及原失败/光学证据按其候选/Context分别保留，不升级手机或本代完整验收。8791/PID4924/exec17379/controller64485保8789与原epoch09:14:20.175Z，pass/pass/pass、settled、active/held0、PUT4均200，总观察1020含探针；未知流量费用不作零。地图CSS SHA81283f7b…保持、v27未采用；本次授权审查已结束，最终变化必要审查保留。';
for(const name of ['PLAN.md','STATE.md','INDEX.md']){
 const file=directory+'/'+name;let text=await fs.readFile(file,'utf8');
 assert.match(text,/^\*\*当前：Goal active.*v32\/s8\/PID25916.*\*\*$/m);
 text=text.replace(/^\*\*当前：[^\r\n]+\*\*$/m,current);
 assert.match(text,/^\*\*恢复与证据：\*\*.*$/m);text=text.replace(/^\*\*恢复与证据：\*\*.*$/m,recovery);
 if(name!=='PLAN.md'){
  const stale=/^\[当前v31星座局部淡化\].*$/m;assert.match(text,stale);
  text=text.replace(stale,'[当前v33共享点源](evidence/experience-stellar-glare-2026-09-29.md)及[冻结绑定](evidence/experience-stellar-glare-native-validation-2026-09-29.json)为当前开发入口。v32持久选择、v31星座局部淡化及v30组合均保历史条件；当前恢复点见顶部，唯一下一依赖由PLAN阶段4维护。');
 }
 if(name==='PLAN.md'){
  assert.match(text,/^1\. \*\*固定本代基线：v32.*$/m);
  text=text.replace(/^1\. \*\*固定本代基线：v32.*$/m,'1. **固定本代基线：v33正式示例点revision1。** 共享点源光晕/星芒、110生产输入和本代候选/Frame/Context已绑定；实际Altair/2.67°手动/21:00/DAY标准字号，Context SHA1746aa90…/fingerprinta4cf34ca…。旧v32/s8已退；旧持久选择、星座淡化、正常分层/组合/光学及失败恢复各守原范围。地图和其他分包字节保持；本代SDK3.17.3，三完整窗图427×919与一小图各保条件，不借旧手机认证。');
  assert.match(text,/^4\. \*\*唯一下一依赖：实际覆盖层合成.*$/m);
  text=text.replace(/^4\. \*\*唯一下一依赖：实际覆盖层合成.*$/m,'4. **唯一下一依赖：公共时间连续推进、面状辅助与组合。** 用户两条原文及八原图见[记录](USER-UPDATES.md)和[参考](evidence/reference-user-stellarium-2026-09-29/README.md)。v33共享点源真实像素/原生拾取已核，不重复正常同往返；颜色/星等和拾取几何未另建owner，整体亮星质量及未解析光斑门槛仍按真实显示核。当前页面使用固定所选时刻/离散预览帧，1秒timer只核传感器时效；现有资料位置拒绝report外时刻，需先核实际服务帧供给和公共时间意愿，再在原owner接连续呈现/跟踪。服务端继续负责星历和有效时间覆盖，倍率只改变同速天文运动的屏幕位移；不硬写1.7°开关、不另造位置/时钟、不逐帧写BFF Context，不拿邻近行冒充精确时刻。正常/取消/暂停/隐藏/跨午夜/迟到/失败与资料、影像、天气、跟踪保持同一时间意义。v32持久身份/点十字/面状圆/名称透明度和受控Canvas错误恢复仍有适用行为与节点证据；普通标签/dock/modal及呼吸实际合成缺口未解，隐藏Canvas仍曾截旧星场，宿主freeze/禁动画只读结果不能决定归因。后续检查需新捕获机制或目标手段，不循环相同静态截图或把SDK成功当视觉完成。v31星座插画/线/名的共享局部淡化与反向恢复保实际画面，10–25°仅初始调校；名称合成、整场识别待目标验证。深空标识与注册科学纹理分别按实际角尺度和数据核，不能统一隐藏影像凑完成。BSC/SAO正常分层/离标记拾取有历史证据，晚到瓦片、真实失败恢复、原生解码/GPU按机制补验，不重新下载研究。整场配准、银河/W3/M42条带/饱和、M63原红条带保原质量义务；可比地点/时刻/视场/曝光与真实图层决定参考评价。只改Sky，标准字号有效/大字号暂停；手机不可用继续独立依赖，真实姿态/校准/OS后台/Android/iOS、目标资源性能/费用、最终旅程及必要审查均保。');
  const row=/^\| 2026-09-29补充：持续选择.*$/m;assert.match(text,row);
  text=text.replace(row,'| 2026-09-29补充：持续选择、星光/可点选门槛、局部面状淡化、放大后的时间位移 | 八图为显示/行为参考，Gaia/DSS排除不变；真实星等/缺测/颜色与当前Context仍有效 | v32持久选择/同帧点选/关闭资料及名称透明度、v31共享星座局部淡化各有开发证据；v33共享点源软件RGBA、原生亮星像素与自然点选/倍率回程已核 | 实际覆盖层/呼吸、未解析光斑门槛与整场质量仍待验；当前无连续天文时间推进，服务只给离散精确帧；深空辅助局部行为、延迟/失败、连续时间/跟踪组合及目标合成开放 | 同一已绘帧和真实身份下完成选中/切换/空白失焦/关闭资料与Back；连续可逆淡化，恒星可见与可拾取职责一致，运动随投影和单一公共时间责任，无硬编码1.7°启动 |');
  assert.match(text,/^当前运行：分支.*$/m);
  text=text.replace(/^当前运行：分支.*$/m,'当前运行：分支codex/remote-main-20260908/HEAD7898962b保持，无提交/推送/切换；v33/s9/PID25916完整窗、正式示例点revision1、Altair选择/2.67°/21:00，绑定见顶部。8789保内存；8791保原epoch/pass通道/active-held0/PUT4，总观察1020含探针。v33的60事件/四原图、v32的56/五图及v31/v30历史批次分别冻结，地图/其它分包字节保持。唯一下一依赖见阶段4；SDK/节点/截图/回程静止不代替普通合成、连续运动、真正GPU或手机验收。');
 }
 if(name==='INDEX.md')text=text.replace('按用户指令，闲置及历史替代窗口均已退，当前只维护已打开v26。','历史v26时曾按用户指令关闭闲置及替代窗口；该代现已退休。');
 await fs.writeFile(file,text);
}
console.log('Updated the existing PLAN/STATE/INDEX to frozen v33; commercial scope and all retained obligations preserved.');
