# 菜单覆盖与稳定天空：UX10 有范围实施

用户明确答复“现在开始按新版方案实施”后沿同一无预算 Goal 实施。唯一 PLAN 的前期停点措辞已依该授权解除，没有新任务/目录/分支/Goal。原33项、图像冻结、红光暂缓与未闭性能保留。

## 实现与受影响边界

`sky-viewport` 把完整 Canvas 投影与原生 UI 遮挡分开；`sky-zoom` 的全天上限/进度/真实窗口重映射、Canvas view、页面 writer、pan/pinch/跟踪共用完整 Canvas。菜单高度只影响遮挡和输入，不写 FOV/center。真正 Canvas resize 保原倍率/全天进度；校准冻结/手动优先等原边界保持。

普通 dock、time/layers/calibration/settings 和探索外层使用局部暗色 RGBA 材质；探索内层透明，避免两层叠加。day/night 都沿当前暗天空 shell 的字色/边框，分组小字使用 secondary；减少透明度仍回退原 surface。当前没有模糊、第二 Canvas/readback 或像素加工。此为代码材质和有范围原生观察，不认证整个目标菜单质量。

探索列表不再全局禁止露出的 Canvas 拖动；原对象/日期/编辑锁保留。目标 guide 和星座文字接入真实 UI 遮挡及边缘透明度，普通星座摘要仍只消费成功同 copy 名字。菜单/列表切换改为结算已绘手势，保 Context/time/object/date 原取消语义。完整字框、换侧稳定性、名称相对图面运动及新的时间包络仍归 UX05–09 后续实施。

## 软件与审查

输出根 `output/cloud-sky-native-updated-ide-2026-10-12-r1/` 保存 r51 9源前像及 hash、r52 标签前像、r53 page 前像与实际日志，不与旧 uncommitted 成果混作 HEAD 差异。

- r51 修前真实 overlay center 从 y390 被菜单推到 y233.2504434478552；修后 Canvas-view/viewport/accepted-caption 14项通过。实际 writer/resize/zoom/pinch 9项中两旧 camera fixture 缺 starTransitions 失败，迁现共享 `skyPageCanvasTestBindings` 后只重跑这两项通过；原7项通过保留。日志 `r51-overlay-before-behavior.log`、`r51-overlay-behavior.log`、`r51-overlay-integration.log`、`r51-overlay-integration-repair.log`。
- 第一独审核完整调用链，无投影几何遗漏；发现日间浅面浅字 P1 和分组小字、探索手势全锁、另两名称未避 UI 的 P2，已修，不采用原亮灰材质。r51 旧色 build/官方预览在途已完成，但没有进行产品验收，旧候选保留。
- r52 新 overlay-caption/summary、exposed-Canvas 修前两项真实失败；相关7项修后通过（含普通摘要失效/copy失败、resolved guide 规则及新 target 遮挡）。Mini TS5.9.3 通过。日志 `r52-overlay-before-behavior.log`、`r52-overlay-behavior.log`、`r52-overlay-typecheck.log`。最亮纯白底数学合成只支持 primary 9.4671、secondary 4.7768 的源码对比，不能代替原生可读性。
- 第二独审发现 menu-change cancel effect 会使尚在操作的可见倍率回退；r53 实际 effect 修前将28.346657485189965°恢复45°，修后 menu settle/露出/viewport/hide/Context 五项通过，原失败保 `r53-overlay-settle-before.log`，修后 `r53-overlay-settle.log`。resize fixture 按 actual viewport dependency区分新 menu effect，针对性读回通过 `r53-overlay-effect-binding.log`。Mini TS5.9.3 通过；前期方案读回不冒本轮代码验证。

两次独审均只读，当前已结束关闭；源码、软件和下述实际输出分别核，不冒完整原生/Goal通过。

## 实际目标输出与新失败

r52 普通 `overlay-readable-clean`，SHA `2d4bf55ea272cb6a01adc978c75195e2966764885c78217ab9c0368bf526f7a1`；284文件/4,871,775B，main2,097,108B（余44B）/Sky1,407,913B，普通build/预算通过。16:40官方预览后 fresh 实看入口、手动天空，operator bind；手机 bundle bytes/AppID 不作独立验证。每次输入前 fresh capture并实际查看，未放宽60秒守卫。

1080×2376 原 PNG 保私有 API runtime owner，未放入 feedback 根：`r52-overlay-closed.png`、`r52-overlay-time-open.png`、`r52-overlay-time-header-swipe.png`、`r52-overlay-explore-open.png`、`r52-overlay-exposed-drag.png`、`r52-overlay-back-closed.png`。普通手动45°、同一21:30，仅菜单开关/头部横划/露出横拖/Android Back。

独审实际看图且用 pngjs 核 closed/time-open 的 UI外ROI x20/y410/w1040/h830：863,200像素、4通道 changed0/maxDiff0。时间面板主体透出星点/星座图，标题/日期/时刻/播放可见；头部非控件横划未移动天空。探索露出条横拖使天空移动，列表保留；Back只收列表仍留Sky。这些是有限实际结果，不是全天/双指/朗读/动态精确同步或物理性能。

**新的实际失败保持：** `r52-overlay-exposed-drag.png` 的土星/天王星/M31资料行出现部分缺字。根因未定，不能认证“拖动中菜单正文完整”，不能因其余像素/软件通过而关闭 UX10。后续以一个新 settled capture 区分是否恢复，再沿实际原生合成/提交责任定位；不重跑其余已通过菜单场景。vConsole占尺局部亦不认证完整尺可用性。

r53 普通 `overlay-settled-clean`，SHA `52e5125bbc4223cc80974a4cbf185342557a1703db84abcfc6a2adc29af774a6`；284文件/4,871,819B，main2,097,108B/Sky1,407,957B，build/预算及官方预览完成。它只追加活动手势结算，不把 r52 静态原生结果冒为 r53 双指验证；当前输入状态只见 CONTINUE。全天视场、活动双指开菜单、屏幕阅读器、iOS、物理成本、全部菜单字体/透明合成及整体 UX10仍未闭。

17:08–17:11 r53 普通入口/手动天空实际读回后，只针对上述缺字进行一次跟进：打开同探索列表、同顶端露出条横拖后及一个后续 settled capture，土星/M31/天王星资料行均完整。原 PNG `r53-explore-before-drag.png`、`r53-explore-after-drag.png`、`r53-explore-settled.png` 保同私有owner。**这一有界样本未复现，不证明 r53结算修复是缺字根因或该异常已根除；r52实际失败保持。** 未扩大重复其他菜单验证。此前一次bootstrap输入因截图超过60秒被守卫拒绝、没有发送；重新fresh capture实看后才输入，不放宽守卫。r53 operator bind后两bootstrap按owner stop，目标最后仍在探索列表；当前feedback只见CONTINUE。
