# R20 原生 Map 同 id 事实刷新修复

2026-10-24，接续 `main@1a8147e3de9b6cd3368f8e10f7abc72edf9180a8` 的确认 P2。仅修原生 Map 的当前选择事实接纳；不重做 F07，不修改既有采用视觉或 API 供给。生产、回归与本记录为本轮本地未提交成果。原始反例及其边界保留在 [接力原生审查](R20-REMOTE-NATIVE-REVIEW-20261024.md)，未改写为通过。

## 实现

- `map-selection-state` 接纳现有选择的合格同 id 列表事实，核派发前捕获的选中对象与独立 `selectionGeneration`、查询中心、WGS84 坐标与实际来源时间。缺页不选首项，旧来源不因较晚 HTTP 完成覆盖新事实，不从详情受限/近似坐标生成精确观察点。没有新造服务端版本或更改来源权限。
- `shell-location.resolveShellOrigin` 复用原 `useDecisionSnapshot` 的唯一坐标/默认范围派生，Map 派发和 shell 准入共用；同坐标 label/source metadata 换对象仍是相同查询范围，默认范围不再被 undefined/raw-coordinate 比较拒绝。原始 location、权限、标签与用户输入不被改写。
- queryFn 在请求发起前绑定选中对象/选择代次/语义范围；返回后由 shell 原子更新 selected、route revision、DecisionContext revision 和推荐待重算状态。用户改选（含同 id/ABA）失效旧准入；交通方式和同地点主备角色编辑保意图，不取消独立地点事实。旧范围取消与迟到保护保留，已消费页不重放选择转换。
- marker、摘要、observer、路线和 native navigation 共用被接纳的事实，`currentSpots` 只投影该已有选择，不能由被拒绝的旧页替换它。路线 identity 仍含其自身 revision；未新增第二选择 store 或相机 writer。
- 没有改变布局、按钮语义、App/小程序职责、原生权限处理或真实地图供应商能力。读取了最新 interaction skill、native DESIGN、Source Plan 的 Map 和跨 Outcome 条款以及现行 mobile Context。

## 最终收口与独审

root 在首批后沿原责任修复四条独审反例：请求完成时重采样选择代次、route intent 误拒事实、默认范围误拒、同坐标新 location 对象误拒。四份失败报告及原件全部保留；当前 [最终语义 origin 独审](R20-NATIVE-SELECTION-SEMANTIC-ORIGIN-REVIEW-20261024.md) 正式五文件31/31、原同坐标反例8/8、mobile类型和diff检查通过，无限定范围内未关闭P1/P2。前报告：[同id](R20-NATIVE-SELECTION-REFRESH-REVIEW-20261024.md)、[route intent](R20-NATIVE-SELECTION-FINAL-REVIEW-20261024.md)、[默认范围](R20-NATIVE-SELECTION-GENERATIONS-REVIEW-20261024.md)、[同坐标对象](R20-NATIVE-SELECTION-CLOSED-REVIEW-20261024.md)。

root 完整 mobile fast 当前38文件150/150及类型通过；最新日志 `tmp/r20-mobile-reviewed-final-20261024.log`。真实设备定位/导航、视觉、外部服务、性能与完整Goal保留未验，Node/React边界不提供这些结果。

## 首批实际检查（历史）

新增 `apps/mobile/src/features/map/MapScreen.test.tsx` 挂载真实 MapScreen、Zustand shell、React Query 和实际 HTTP client，仅 RN/Expo 显示/导航端口及网络供给使用合成边界。

1. 修改生产代码前，新正确性断言 **1 passed / 2 failed**：同 id 刷新不能更新选中对象；切新范围后同 id 新事实同样不进入选择。日志 `tmp/r20-native-selection-before-20261024.log`。
2. 修复后 MapScreen **4/4**：新名称、坐标和 closed 状态进入 marker/摘要/observer forecast 请求/route/native navigation；备选和 cycle 保留，决策 revision 原子增加一次；相同数据重读不重复提升；缺页保持选择；后来的同 id 选择不被旧已消费页重写；旧范围被取消的迟到响应不能覆盖当前同 id。
3. 纯准入 **2/2** 覆盖已捕获选择/route intent 失效，以及旧来源、错范围、非法坐标与详情近似坐标不被接受。
4. 最终受影响 Map/Shell/map-client 四文件 **19/19**，exit 0：

```text
# apps/mobile
node ../../tools/run-node.cjs --bin vitest vitest run src/features/map/MapScreen.test.tsx src/features/map/map-selection-state.test.ts src/state/shell-store.test.ts src/data/map-client.test.ts
npm run typecheck
```

最终日志 `tmp/r20-native-selection-final-20261024.log`；移动端 typecheck exit 0，日志 `tmp/r20-native-selection-typecheck-20261024.log`。限定生产 diff 的 `git diff --check` 通过。

整合检查另纳入 `decision-context-consumers.test.tsx` 时共 **24 passed / 2 failed**（26 tests）。两个 Tonight 用例在 `expo-crypto → expo-modules-core` 载入遇到 `ReferenceError: __DEV__ is not defined`，保存在 `tmp/r20-native-selection-affected-20261024.log`，已交主实施者对齐 NightReport 测试边界；本代理未更改该共享测试，不能把这次整合范围记为绿。该文件另五个用例通过，包括原 Map B 消费者与深链详情近似坐标不替换采用地点。

## 保留边界

本地组件证据不等于 Android/iOS 设备、实际定位/原生导航、视觉/触摸或真实地图供应商完成。新独立审查由主实施者安排，当前本记录是实施者自核。NightReport、管理缓存、目标 WEAPP UI、三叠层和完整 Play/OOM 都不由这组结果关闭。

未提交/推送、安装依赖、启动构建、操作设备/微信开发者工具/ADB、共享服务、VPN、冻结代或上传原件；原复现、资产 dirty、任务 Harness 与私有资料保留。测试均已退出，owned React roots/query caches 已关闭。
