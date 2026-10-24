# R20 原生 Map 请求代次修复新独审

2026-10-24，独立审阅者 `review_native_selection_request_fence`。审查 root 在前次独审 P2 后对 `MapScreen.tsx` 的请求发起时资格绑定，以及现有 `map-selection-state.ts` / `shell-store.ts` 与相关消费者。只读生产和正式测试，不改 PLAN/HANDOFF 或其他实施者文件。

## 已关闭的前次反例

MapScreen 现在在实际 queryFn 派发前捕获选择对象、route revision 和 location；返回时交由现有 shell 原子准入，而非完成后的 effect 重新采样。正式同 id 在途重选回归以及随后新 refetch 的正向控制通过。已消费页不再重放选择变更；不同 id、取消旧范围和旧来源保护继续成立。

独立运行以下四文件，**20/20 passed，exit 0**，日志 `tmp/r20-native-request-fence-final-review-20261024.log`：

```text
# apps/mobile
node ../../tools/run-node.cjs --bin vitest vitest run src/features/map/MapScreen.test.tsx src/features/map/map-selection-state.test.ts src/state/shell-store.test.ts src/data/map-client.test.ts
```

正常同 id 新事实实际传播到 marker、摘要、observer forecast、route 和 navigation，原备选角色和 cycle 模式保留；root 的 selected-fact 投影使已接受事实在各呈现消费者一致。这些通过不覆盖下述机制。

## 仍须修复：P2，仅更改出行方式会吞掉独立地点事实

相关位置：`MapScreen.tsx` 请求资格捕获与 `currentSpots` 投影；`map-selection-state.ts` 的 `state.routeRevision !== refresh.routeRevision` 准入条件；`shell-store.ts` / `selectRouteMode` 的路线意图修订。

实际组件探针使用当前正式 MapScreen 测试的完整真实 React / Query / shell store / HTTP client，只有 import 路径转为绝对路径，并新增一个不同机制的 case：

1. 在当前范围选择 B（31/121、原名称、recommended）。
2. 发起当前范围 refetch 并保持 pending。
3. 点击真实“出行方式”控件从 drive 改为 cycle；选择 id、选择对象和查询范围均未改变。
4. 原请求成功返回同 id 的合格新事实（32/122、新名称、closed、新来源时间）。
5. 地点 query 不依赖出行方式，但准入以累积 route revision 为条件，将当前地点事实丢弃。store 和摘要/observer/路线/导航仍使用旧事实；`currentSpots` 还把列表中的新 marker 覆回旧选择对象。没有 stale/pending 提示，也没有因改 mode 而发起替代的地点请求。

正确性断言要求保 cycle 并接纳新地点事实，实际为 **5 passed / 1 failed，exit 1**：`expected '原地点 B' to be '刷新地点 B'`。原件：`tmp/r20-native-request-fence-route-intent-review.test.tsx` / `tmp/r20-native-request-fence-route-intent-review.log`。该失败未改写为通过；已向 root 发出具体触发/结果。

依据是 PLAN 要求合格当前同 id 事实更新所有实际消费者，或显式保留旧 snapshot 为 stale/pending；同时保用户角色及路线意图。仅切出行方式不使地理查询失效，不能以保存模式为由让已收到的新 closed/坐标事实永久消失。应把选择代次与不影响地点查询的路线意图区分，或采用等价准入机制；继续保护同 id 显式重选、ABA、范围与来源资格，不新增另一选择 owner。前次 same-id P2 已关闭，但本限定模块尚不能宣称无未闭合 P1/P2。

## 审查边界

被审生产 SHA-256：MapScreen `83fa95a9018133b3c6356b614913dc469f74a3dbdd560a14633ded42cd1d170d`；map-selection-state `6608a15c4adc93c0188f9a710b604c611b192ec20a3d93384ec2741451af11ee`；shell-store `c526bbd45839f93ebd8479a47c0cee6be756ea1ebad6eab9f36d2e04b4fb377a`。后续修复须有新的实际结果，本记录保留该时点失败。

读取了原 PLAN 条款、前审失败、实施记录、global 与 mobile core Screen Contract、Source Plan marker 成功/失败条款，按现有单一 shell/DecisionContext 责任核对。没有改变视觉、权限、来源、版本或路线产品含义；未扩大整仓/设备矩阵。未重复 root 正在进行的类型/消费者整合。

本机组件证据不认证 Android/iOS 实际定位、导航、视觉/触摸、WEAPP、共享服务、物理资源或性能/OOM。没有手机/IDE/ADB、共享服务、构建、VPN、依赖安装、原件上传或 Git 写入。React roots/query caches 随夹具关闭，所有测试已退出；仅新增本报告及任务内合成探针/日志。
