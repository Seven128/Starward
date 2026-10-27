# Native 跨视图未知保存确认限定独审

2026-10-25，新审阅者独立核对。**本轮限定源码与实际本地消费者效果通过，未发现新增已证 P1/P2。** 原 Quick→完整视图同输入确认失败已在真实组件／生产 SQLite adapter 路径恢复；新增反向视图和真正新输入／回退控制亦通过。该结论不替代新 APK、目标 Native SQLite、手机冷启或完整 Goal 验收。

## 输入与责任

完整阅读[原失败终审](R20-NATIVE-PROFILE-EDITOR-REPAIRS-FINAL-REVIEW-20261025.md)、[本次修复报告](R20-NATIVE-CROSS-VIEW-PROFILE-CONFIRMATION-REPAIR-20261025.md)、此前恢复／语义独审；按适用 AGENTS、global/default 路由、唯一 PLAN 的当前顺序与 Native quick/full 消费者责任、Source `mobile-shell-and-preferences`、core-journeys、Native DESIGN、当前 interaction Skill／Native mapping／wording核对。两类性能仍后置，OOM与其余 Goal 义务未关闭。

冻结 `tmp/native-cross-view-profile-confirmation-repair-20261025/source-freeze.json` SHA256：

`b7fbf6c562163418e1f0ac86cef7bdd88e291295ac4ab63a222e053c0b0417ca`

开始和结束逐件核 **28/28** 当前长度／SHA一致；本轮仅共享 editor 和 Quick 回归两改，另26项不变，累计交付写集仍是原8文件。Root的3d23独立交付／CI、未安装的旧7fcc候选和另一个Activity端口均不作为本修复通过证据。审阅者未改产品或这些控制输入。

## 已核实现边界

- `useProfileEditor` 的动作呈现、resolver准入和 `saveAttempt.save` 使用同一原始提交输入 identity。只有**原 attempt仍 unresolved且完整原始输入相等**，才跳过另一视图的重新解析；正常新写、已知拒绝后的新保存和真正改变的输入仍经当前 resolver。
- 原确认仍交给未改的 `profile-save-attempt`。同 identity重用原 candidate，不重建对象或时间戳；`preferences-runtime` 的既有 WeakMap／fingerprint／prepared command和原 CAS／receipt仍执行。没有跳过 runtime／storage资格或改持久格式。
- 原提交前 owner/session锁、异步校验快照、视图关闭代次、保存期间后续输入保留等机制未被另建流程替代。此次没有把标签正确或零新写单独当作确认成功。

## 独立执行与实际结果

证据在 `tmp/review-cross-view-profile-confirmation-effects-20261025/`。从原失败独审复制严格 lifecycle／semantics probes，原字节另存 `original-*.test.tsx`；只把合成数据库／输出目录改为本轮所有，原行为、完整 SQL、版本和 owner断言未弱化。在同一实际消费者边界增加两条独立旅程，没有复制生产函数体。

`independent-run.log`：**2文件12/12，0失败／0跳过，退出0**。这是本审阅者的集合，不与作者26项、前轮九条或其它独审相加。

1. **原严格失败恢复。** 合法带首尾空白的 A由 Quick保存后丢确认，B成为当前，再进入同一草稿的完整视图确认。实际 SQL A r6原字节不变、写数5→5、B仍当前，同时错误清除且完整视图关闭。原来的“此预设已有新版本”确认退化不再出现。
2. **反向跨视图的原候选。** 在完整视图对带空白字段的 A保存，原 resolver实际规范化文本后提交并丢确认；关闭完整视图、B当前，再由 Quick确认。读回保留该次**已规范化的原 candidate**，没有回写 Quick原始空白；完整字节不变、写数5→5、B仍当前、错误为空并跟随当前B。由此核对共享职责不只适用于原反例方向。
3. **更严校验／真正新输入／撤回。** 合法一字名称“家”的 A经 Quick保存后丢确认，B当前；进入完整视图并真正修改城市后，“保存新的修改”仍被原完整名称校验拒绝，SQL及当前B不变。逐字撤回城市到原输入后，动作恢复“确认上次保存”，原 A r6精确零新增写确认成功、错误清除、视图关闭。验证失败没有抹掉原 attempt，也没有让所有 unresolved状态绕过校验。
4. **保留控制。** 原实际 Quick→完整草稿共同保存、A已知冲突后只写A并保后来非dirty字段、同视图未知确认不切B、保存期间后改、旧保存完成不关闭新视图，以及校验pending关闭／重开后的零派发保护继续通过。合法完整字段、0/null／多目标及冷重建的原代表机制亦通过。

真实 Screen、RuntimeRoot、RHF/schema、editor、原 attempt、store／domain runtime与生产SQL adapter均未替换。RN primitives渲染为jsdom，Expo crypto替换Node原语，仅Native SQLite primitive替换为真实Node文件SQLite。`current()`每次新建独立SQLite连接读取 canonical projection，并与原facade逐值对照；完整持久字节及真实SQL effect计数独立断言。所有资料均为合成数据，没有读取用户数据库或调用真实provider。

`independent-actual-effects.json`保留六个机制的实际读回，`actual-effects.json`保留完整字段／重建记录。复用 probes的原失败日志与原件未覆盖；首次本轮执行即12项通过，没有将失败改为预期失败或移除断言。

固定命令：

```text
node tools/run-node.cjs --bin vitest vitest run .codex/work-items/sky-map-performance-2026-10-18/tmp/review-cross-view-profile-confirmation-effects-20261025/lifecycle.test.tsx .codex/work-items/sky-map-performance-2026-10-18/tmp/review-cross-view-profile-confirmation-effects-20261025/semantics.test.tsx --root . --reporter verbose
```

## 收尾与未验

`start-pins.json`／`end-pins.json`／`completion.json`记录28项一致与限定结论。测试进程已终态退出；afterEach卸载所有React roots并关闭测试SQL句柄，新增读回连接在finally关闭，末查本轮Node进程0；未创建listener或外部在途操作。

唯一写集为本报告与本轮tmp；未操作产品源码、Root PLAN／HANDOFF／Context、Git、Activity模块、设备／ADB、APK构建、服务、网络、VPN、Secret或真实用户数据。新APK与实际Android Expo SQLite／UI／键盘／Back／冷启／生命周期仍归Root验证，首次许可／normal-Home／fresh GPS、iOS、生产／多版本和完整family仍未完成。原手机539/r2和阴性APK保留，本源码独审不自行授权更广验收或宣称完整Goal通过。
