# 云观星银河背景、浏览辨认与 v28 接续

用户范围只限云观星。当前只改两个 Sky owner：共享 sky-gpu-renderer 中的银河背景采样和 spot-sky-page 的来源说明。目录、日月行星球面/相位、资源/文件/相机 owner 及其它业务源码未改；v26 的 99 个绑定生产输入仅这两个变化。新包只改变 project.config.json 和 sky/detail/index.js。地图样式仍为撤回前 SHA81283f7b…，未采用含撤回探索的 v27。大字号继续暂停，Goal active、无预算、未完成，原33项义务和商业排除理由不变。

完整生产场景的[同帧因果对照](experience-galactic-causal-validation-2026-09-29.json)复用已取得的 2MASS JPEG（e3a70f83…）、当前原生 v26 revision2 对应的 BFF 报告、BSC/SAO 和真实地景/插画图片。首次用 resolve 得到另一个 revision1 会话，未进入比较；随后只读当前页面已提交 Context。没有重复外部下载。输入快照只保渲染所需字段，不保存 opaque Context ID。固定地点22.4826799N/114.5557147E、2026-09-30 05:00 Asia/Shanghai、UTC2026-09-29T21:00Z、逻辑390.4×844；广角朝向由现有全天浏览相机计算，不凭目标名称推断。

软件 WebGL 中六场景各比较真实出版图、现有示意回退和仅用于研究的禁用对照。18个修前与18个修后完整结果共用完全相同输入，实际目录坐标/身份/点选、地景及独立图层保持。禁用对照使粗颗粒消失，确认其来自被放大的全景红外点源。研究开关没有进入产品。修复在源像素被放大时连续平滑背景，保留原图、色彩、注册和目录星点，不添加缺测 mask、不撤掉银河、不引入新图片/上传/纹理；全天原图、红光和示意回退的适用输出完全相同。已查看整幅实际修前/修后画面，属于主 Agent 自查，非独立验收。

| 固定场景 | 背景高频显示对比变化 | 目录/点选 | 全天/红光边界 |
| --- | --- | --- | --- |
| 北极星局部45° | 降低49.54% | 相同 | 银河仍有非零实际作用 |
| 北极星识别25° | 降低38.09% | 相同 | 连线/插画同原图层 |
| 北极星总览85° | 降低59.43% | 相同 | 已绘相机按共享 owner 转向天顶 |
| 五车二附近45° | 降低39.29% | 相同 | 银河结构仍保留 |
| 全天267.8°与红光45° | 原图逐像素0差 | 相同 | 原呈现保持 |

这些百分比是修前/修后相对于研究禁用图的 RGB 码值高频贡献统计，限本次实际软件场景；不是辐射定标、天文精度、用户辨认率或验收门槛。平均背景贡献没有被清零；旧渲染器实际结果不能通过同一颗粒降低检查。没有据此认定银河全部质量已达参考。

![同帧修前完整生产场景](E:/dev/worktrees/Starward/remote-main-20260908/output/playwright/cloud-sky-galactic-causal-0929-before/polaris-local-published.png)

![同帧修后完整生产场景](E:/dev/worktrees/Starward/remote-main-20260908/output/playwright/cloud-sky-galactic-causal-0929-after/polaris-local-published.png)

[同页交替成本观察](experience-galactic-cost-2026-09-29.json)保两份生产 renderer、同数据/解码图，4暖机对和12交替测量对。45°提交中位7.70→7.05ms、p95 11.10→10.20ms；85°中位8.80→9.60ms、p95 9.70→12.20ms，广角开销增加如实保留。初次提交及显式drain合计45°106→111.1ms也保原记录。显式drain中位为0不代表GPU成本为0，提交可能包含同步等待。稳定绘制无新上传，两实际GPU owner退休4纹理→4释放；这是实验同时存在两个owner的计数，不是手机/GPU总峰值或目标帧率。新增滤波成本需目标验证，不设臆造预算。

21项相关行为检查和Mini类型检查通过；完整v28编译exit0，保原3项构建警告。干净[候选绑定](experience-combined-clean-v28-candidate-2026-09-29.json)：SHAf08e89f4d6689dab8e24594d6873bd1a5500280be53da962c9fbd56eace616eb，257文件/4,486,683rawB，较v26增1605B，仅sky包增量；无诊断/夹具/代次/vConsole/maps，AppID未变。原v26包保留且指纹不变。loopback8791只用于本地开发，不推手机。

原生[冻结绑定](experience-galactic-native-validation-2026-09-29.json)记录64事件/9原始427×919图，trace SHAd3e4d645467f5f7d8f2d67c27ee64e161aded6307cc0259f5e41830f5defa374。仍只有v28/PID25916。新项目通过公开搜索/正式点选择/云观星入口进入；方向不可用时不伪造手机姿态，手动入口绘制。公开时间轴从21:00提交次日05:00，revision1→2、当前epoch唯一PUT200。v28是新的 durable Context（SHAfb3474ce…/fingerprint55241519…），不同于v26；同地点/时刻可比，不称同会话。实际Canvas尺寸仍390.3999939×844，而主机截图缩放变了，不能跨候选直接作像素比较。

公开中文北极星搜索唯一Polaris/HR424→资料显示方位359.6°/高度23.0°→定位45°。按实际Canvas size/offset测量的自然中心tap再次得到同身份；独立来源页显示HEASARC/IAU/Wikidata对应来源，公开Back仍是Polaris，关闭资料保持Context和45°画面。随后45→81.8→45→25.2→45连续浏览，25.2°实际可见连线/插画。公开银河来源回读新显示说明与原处理/链接，但Canvas-only截图不认证其普通覆盖层可见合成。继续缩放253.2→274.9°后，完整圆盘位于原图内；此运行的实际最大视场不同于v26的270.2°，不凭旧值宣称同相机。公共Sky Back→原入口→再次进入→手动→中文搜索定位恢复Polaris45°，同v28已提交Context。

![当前v28原生局部](E:/dev/worktrees/Starward/remote-main-20260908/.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-v28-native-galactic-final-polaris-45-2026-09-29.png)

同v28原图的x4–423/y100–890星图区，来源Back和退出/重进后各为0像素变化；裁切排除系统栏/胶囊/边缘，未缩放，未设置通过容差。最终DAY/标准字号、Polaris方向45°手动、星座/地景/地平ON、W3/赤道OFF、无跟踪/modal/list/time panel。8791保原8789 Context，epoch06:26:06.812Z/PUT1、source/context/resource pass、held/active0，controller59162不变，共享8787/8788未动。旧冻结trace未追加。

三个原生工具错误保trace：开窗后尚未ready的evaluate、不存在的page/地图sheet selector；随后按实际状态和源码公开入口继续。另一个设备切换工具help返回unknown，未执行设备切换、未重试该猜测工具；实际systemInfo与Canvas尺寸用于可比条件。未把这些工具错误当成产品缺陷或隐去。

普通Sky控件/名称/资料在Canvas-only捕获中的合成仍开放；来源独立页面可见不能替代Sky覆盖层。整场背景/插画及其它影像仍需参考质量审查，SDSS影像HTTP、解码/GPU/弱网机制未借用W3或资料故障证据。新月面手机、真实姿态/完整旋转校准/OS后台、Android/iOS、冷启动/资源峰值/目标性能/官方包体/实际费用及最终必要独立审查未完成。用户手机暂不可用指令继续生效；不操作手机、发布、云部署或Git提交/推送。下一依赖只由唯一PLAN阶段4维护。
