# R20 原生 Map 当前边界独审（仍有一项 P2）

2026-10-24，独立审阅者 `review_native_selection_final_boundaries`。按唯一 PLAN 的同 id 当前事实、选择身份、角色/路线意图、来源资格及迟到保护要求，核 `MapScreen.tsx`、`map-selection-state.ts`、`shell-store.ts` 与实际 `useDecisionSnapshot` / Map client 消费者；读取三份前审报告、mobile core Screen Contract、Source Plan 的 marker 成功/失败条款、global 和 AGENTS 的比例验证/独审边界。只读生产及正式测试，不改 PLAN、HANDOFF 或其他实施者文件。

## 前三项反例已关闭

- queryFn 在派发前捕获实际选择对象与 `selectionGeneration`；同 id 显式换对象、不同 id 和 ABA 撤销旧结果资格，结果到达时不重新采样当前选择冒充原资格。
- `selectionGeneration` 与 `routeRevision` 分开；同选择的路线模式/角色变更不吞掉独立地点事实，新事实原子传播到 marker、摘要、observer、路线与导航，保留 cycle/backup。
- 当前 origin 与其 render location reference 在派发前绑定，合法 unset/default 范围不再以 `undefined === fallback` 拒绝全部事实；正式默认范围回归通过，未新增或猜造 fallback 数值。

独立四文件实际 **22/22 passed，exit 0**，日志 `tmp/r20-native-selection-closed-review-20261024.log`：

```text
# apps/mobile
node ../../tools/run-node.cjs --bin vitest vitest run src/features/map/MapScreen.test.tsx src/features/map/map-selection-state.test.ts src/state/shell-store.test.ts src/data/map-client.test.ts
```

另独立 mobile workspace typecheck exit 0，日志 `tmp/r20-native-selection-closed-typecheck-20261024.log`；相关源码/测试定向 `git diff --check` exit 0。没有重跑整仓或手机矩阵。这些通过不覆盖下述不同机制。

## 仍须修复：P2，同查询坐标的 origin 对象替换后，新地点事实被吞掉且没有恢复需求

相关位置：`MapScreen.tsx` 的请求 location 绑定、`shell-store.ts:208` 起 `refreshSelectedSpot` 的 `state.location !== expectedLocation` 早退，以及 `currentSpots` 对旧选中事实的投影。

现在默认范围已可更新，但 location object reference 同时被用作结果准入的硬条件。一次设备位置重新确认或恢复 projection 可以产生新的 location 对象，而 `/v1/map/spots` 的完整有效查询仍是相同 lat/lon/radius/limit。地点 query key 只有坐标，因而该对象替换不会发起替代地点请求；在途的当前同 key 响应虽然成功进入 Query cache，也不能更新选中事实。

实际组件探针复用完整正式 MapScreen 测试，只将 import 路径改为绝对路径，新增一条不同机制：

1. 当前出发地 30/120，选择 B（原名称、31/121、recommended）。
2. invalidate 当前地点 query 并保持 refetch pending。
3. 将 origin 重新确认成同坐标的新 location 对象，只更新其标签；选中对象/id、模式及地点查询坐标均不变。断言仍只有一条 pending 地点请求成立。
4. 原请求返回合格 updated B（新名称、32/122、closed、新来源时间）。
5. 先断言 `["map-spots", 30, 120]` Query cache 确有新名称，该断言通过。
6. 要求 shell 接纳新名称的正确性断言失败，实际仍为 `原地点 B`。随后 marker 投影、摘要、observer、route 和 navigation 保持旧对象，没有 stale/pending 提示或替代地点请求。

探针实际 **7 passed / 1 failed，exit 1**，失败为 `expected '原地点 B' to be '刷新地点 B'`。原件 `tmp/r20-native-selection-location-identity-review.test.tsx` / `tmp/r20-native-selection-location-identity-review.log` 保留。未将失败写为通过，已向 root 发送具体触发、责任和结果。

修复需在原 query/selection owner 判别完整的查询语义身份，或确保 location 代次变化后产生可恢复的当前需求/明确 stale 状态；不能以保存 origin 意图为由永久吞掉同一有效查询已收到的新 closed/坐标事实。继续保不同范围、取消、同 id 后来选择/ABA、来源和权限资格；不要求新 store/router、私有数据或设备组合矩阵。

## 源码与证据边界

本次独立检查前读取的生产 SHA-256：MapScreen `aaf6033ee46981996d6bc01044196aa5c8a73802ed75d40f71ceeb1de134d206`；map-selection-state `4434ec4cfcd8c6da12fbd256cf1afecd9d096f08ce760ef176b7bb589fa2ac02`；shell-store `c526bbd45839f93ebd8479a47c0cee6be756ea1ebad6eab9f36d2e04b4fb377a`。后续修复不能由本报告的既有 22 项通过自动认证。

只运行自有 React/Query/store/HTTP 组件边界，RN/Expo 显示与外部响应按已有端口替代。未操作设备、IDE、ADB、共享服务、VPN、冻结构建、部署、依赖或 Git 写入。React roots/query caches 随夹具清理，命令均已退出，仅新增本报告及合成探针/日志。实际原生定位/导航、触摸/视觉、目标 WEAPP、物理资源和性能/OOM仍未由这些结果认证。
