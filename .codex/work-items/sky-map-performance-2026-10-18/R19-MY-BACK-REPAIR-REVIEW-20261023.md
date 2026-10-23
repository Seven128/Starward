# R19 My 返回误消费 Map Back：owner 独立审查

## 审查结论

当前修复在一个责任范围内成立：**原生 PageContainer 的程序化退场和重新入场，不再直接取得业务 Back 授权。** Map 根 `active` 取同一 `primaryNavigation.presentation` 快照的 `nativeVisible/foregroundRoute`；My closing 的 foreground 为 null，明确撤销旧代。NativeBackContainer 的 Map 分支只有在当前 shown generation 收到 `afterEnter` 后才接受一次 leave；active/isMap 变化、native hide、consume、unmount 同步撤销入场确认。原稳定 Map key、nativeMapContent、Map/My 的业务 Back 优先级以及既有 32ms arm 调度保留。

独审已阅读当前两处生产实现。未发现这项补丁硬设 panelExtent、引入任意时间忽略窗口、重建原生 Map 子树或关闭合法 Back。静态审查与回归足以支持进入当前手机候选反馈；**尚不构成真机问题已修好或 native 事件根因已完全证实。**

上游约束为当前 Mini Program Screen Contract 的单一物理 Map、Map/My 无底栏、返回保留 selection/camera/panel/scroll/Observation Context；复用了 `uiux_design` Skill 的共享原生 Back 与实际目标运行时验证要求。前置资料为 R19-MY-RETURN-PANEL-GEOMETRY-REVIEW-20261023.md 与 R19-GEN11-KNOWN-MEDIUM-PHONE-RESULT-20261023.md。

## 事实与解释边界

Root 提供的 gen12 有界真机观察：formal 点明确打开 medium；My 左上地图返回后，在没有系统 Back 或拖动输入的这一轮出现 NB→BE→extent small。NB 读取真实 Map NativeBackBoundary callback 的 live phase/extent，BE 来自 Map 系统 Back 的 previousExtent setter，动画 setter 未出现。此观察将实际错误生产者缩到 Back 路径；本独审没有操作该设备，不冒充独审采集。

原实现 generation 仅随 active/isMap、native hide 或 unmount 变化；逻辑 Map/My 往返在 active 持续 true 时不换代，而 `handleLeave` 只检查 alive/active/visible/generation/handled 并调用 live onBack。它既缺少逻辑退出期间的明确撤权，也允许当前 `show=false` successor 的 leave 执行业务。修复同时覆盖这两个边界。

先前真实 React/Taro 调度 trial 未出现 active=false 脉冲；本修复不将该脉冲当作已证根因。回归主动输入程序化 disarm/rearm，证明 owner 对此已知风险的反应；它没有复刻 gen12 原生层如何生成 leave。

## 可重复的前后反例

仅修改现有 `apps/wechat-miniapp/src/components/native-back-boundary-lifecycle.test.ts`：新增 `Map programmatic retirement rejects hidden successors and waits for native entry before Back`；原有 Map 合法 Back 测试补上真实协议所需 `afterEnter`，auxiliary 原义保持。

该边界使用现有 `pagePresentationForTest` 的已安装 React 18.3.1/Taro renderer 与完整生产 NativeBackBoundary；仅 PageContainer/原生生命周期为观察端口。流程为有效入场→程序化 active=false→active=true 的隐藏 successor→arm→afterEnter→Back→leave/rearm→新的 afterEnter→Back。

- **旧生产源码反例**：`node tools/run-node.cjs --import tsx --test --test-name-pattern='Map programmatic retirement' apps/wechat-miniapp/src/components/native-back-boundary-lifecycle.test.ts`，exit 1。失败于 test :139，`programmatic leave cannot become a new command before rearming`，actual commands=1，expected=0。Root 在收到此结果后才应用生产补丁。
- **当前补丁**：同一测试通过。隐藏 successor 不消费；show=true 但 afterEnter 前不消费；确认入场后重复 beforeleave 仅一次；消费后重新 arm 仍须新确认；两次合法 Back 均可达。PageContainer mounts=1，原 identity 保留。
- **相关已有检查**：同一命令运行 `native-back-boundary-lifecycle.test.ts`、`native-back-boundary.test.ts`、`navigation/page-presentation.test.ts`，16/16 pass、exit 0；覆盖 aux pending/hide/rearm、Map retained child、真实逻辑 My 注册与单任务 Back 等。该 test 文件 `git diff --check` 通过。

另已独审 Root 对既有 `map-native-compatibility.test.ts:26` 的补充：继续执行真实 JSX AST 提取的 active/onBack 与真实 controller/dispatcher，未新增 source 字串断言。`primaryNavigation.presentation` 由 fixture 的嵌套 getter 返回最新快照，closing/closed/hide 检查没有复制过期快照；关闭期间 retained spot-panel 必须 inactive，关闭完成后即使 pageVisible=false 仍 active，native hide 则必须 inactive。原 visibility 循环调用真实 controller.hide，并故意反置 pageVisible，能识别误改回第二个内容可见性 authority。未发现该测试边界掩盖产品失败。

Root 报告：第一次 retainedPanel fixture 未提供 eventModalOpen/eventModalPresent，产生 ReferenceError；补上两个 false 后，六个既有实际消费者文件共 33/33 pass，正式生产 typecheck exit 0。第一次属于 harness 输入缺失，不能写成产品失败或删除行为断言；33 项和 typecheck 为 Root 执行结果，本独审未重复运行。独审另运行当前 Map test 文件的 `git diff --check`，通过。

本次验证源码身份：Map `d2843b449f24242d1fee95215d0ee6abc2ccde3b9cdcfc8e015a5259ee4a9cc6`；NativeBackBoundary `22d25f389411e058822c16a1dfd8eacc1cadb69b5a35fa1fc4474515f6defbec`；lifecycle test `947a02537f5372474213a35ba3ef610bb3c3f35485e0666cda5ce5ec00aec826`。全为 SHA-256，后续不同字节须由其 owner 重新判断受影响证据。

## 保留的最小验证义务

Root 的当前 normal build/手机反馈仍须确认：同一个已知 medium→My→左上地图返回后保持 medium；随后一条合法 Map 系统 Back 只降一档；My 的合法系统 Back 只消费 My 当前任务/退出 My。真实 camera/深层正文阅读恢复与整体视觉符合度归原验收 owner，本项不能代为关闭。

纯内存端口不能证明原生事件顺序。若一个旧 leave 实际晚于新 afterEnter，并被桥接到当前 handler，公共事件没有本补丁可读的历史 generation 标识，JS fence 不能仅凭最新 callback 判断其来源。当前没有证据证明这一更晚乱序已发生；若补丁后复现，只在现有 boundary 观察 `{foregroundRoute, generation, shown, enteredGeneration, beforeleave/afterleave/afterenter}` 的单轮次顺序，不扩工具或重做无关几何采集。

本独审未操作设备、IDE、预览、构建、服务或网络设置；未改生产文件、未重置/清理/搬迁工作区、未提交或上传。生产补丁、typecheck、完整 normal build 和手机输入均由 Root 负责。此记录只关闭 owner 代码审查与上述回归义务。
