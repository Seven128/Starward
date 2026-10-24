# R20 原生 Map 选择代次修复独审

2026-10-24，独立审阅者 `review_native_selection_generations`。只读审查 `MapScreen.tsx`、`map-selection-state.ts`、`shell-store.ts` 及正式回归和实际 snapshot/Map client 消费者。读取唯一 PLAN 同 id 事实准入条款、前两份失败审阅、mobile core Screen Contract、Source Plan marker 成功/失败要求、native DESIGN 和 interaction skill。未改生产、正式测试、PLAN、HANDOFF 或 Context。

## 前两次反例已关闭

当前 `selectionGeneration` 与 `routeRevision` 分开：实际 queryFn 在派发前捕获选择对象、选择代次和 location；同 id 对象重选、不同 id 与 ABA 会撤销旧结果资格，路线模式和同对象角色改动保留独立地点事实请求。接纳事实通过同一 shell 原子更新选中对象、选择/路线修订和 Decision Context；marker、摘要、observer、路线和导航消费同一已接纳对象。

独立运行下列四文件，实际 **21/21 passed，exit 0**，日志 `tmp/r20-native-selection-generations-review-20261024.log`：

```text
# apps/mobile
node ../../tools/run-node.cjs --bin vitest vitest run src/features/map/MapScreen.test.tsx src/features/map/map-selection-state.test.ts src/state/shell-store.test.ts src/data/map-client.test.ts
```

其中正式回归包括：在途同 id 重选保后来选择，随后新请求仍能接纳当前事实；在途 drive→cycle 和同地点 role 改动后接纳新 closed/坐标事实并保 cycle/backup；不同 id、缺页、旧范围取消、非回退来源和受限 detail 坐标准入。没有把这次通过改写为旧失败已不存在；前审原件继续保留。

## 仍须修复：P2，无出发地坐标的合法默认范围拒绝所有同 id 新事实

位置：`apps/mobile/src/features/map/MapScreen.tsx:99`，与 `useDecisionSnapshot` 的既有默认范围消费边界。

`useDecisionSnapshot` 对 unset 或没有有效坐标的位置提供明确标记的默认 Map 范围（现实现为 22.529/113.9468）；它仍允许浏览候选和选择真实地点。queryFn 却要求 `owner.location.latitude === latitude && owner.location.longitude === longitude`。无坐标的原 location 在这两个比较中是 undefined，因此真实当前默认范围的 refetch 永远不能调用事实准入 owner。

实际组件探针复用完整正式 MapScreen 测试，只调整 import 路径并新增一个机制用例：

1. 挂载前将现有 shell location 置为 `{ source: "unset", label: "尚未选择位置" }`。
2. 当前默认范围加载候选 B，点击真实 marker 选择 B（原名称、31/121、recommended）。
3. invalidate 当前地点 query，HTTP 成功返回同 id B 的合格新事实（新名称、32/122、closed、新来源时间）。
4. 先断言当前默认范围 Query cache 确实持有新事实，该断言通过。
5. 要求 shell 选中事实更新的断言失败；实际仍是旧名称、旧坐标与 recommended。后续摘要、observer、路线和导航继续消费旧对象，`currentSpots` 还将新 marker 投影回旧选择，未提示 stale/pending。

正确性断言实际 **6 passed / 1 failed，exit 1**。探针和失败日志：`tmp/r20-native-selection-fallback-review.test.tsx` / `tmp/r20-native-selection-fallback-review.log`。失败为 `expected 原地点 B / 31,121 / recommended to equal 刷新地点 B / 32,122 / closed`，不是以错误结果为通过。已经把具体触发与证据交给 root。

修复应绑定当前 query origin 与它所对应的 location 身份，让现有受支持默认范围也能准入，继续保原 location reference、选择代次、取消、来源与真实 page center 检查。不要复制或猜造另一套 fallback 坐标，也不能仅移除所有范围/身份保护。该缺陷是同一事实刷新责任的正常无定位路径，不要求扩大设备或组合矩阵。当前模块仍不能宣称无未关闭 P1/P2。

## 范围与资源

本报告读取时三份生产 SHA-256：

- MapScreen：`17d532ffbee15686dcf3d47bff4aca3299a8af96daa8cba2a7aaab215326c980`。
- map-selection-state：`4434ec4cfcd8c6da12fbd256cf1afecd9d096f08ce760ef176b7bb589fa2ac02`。
- shell-store：`c526bbd45839f93ebd8479a47c0cee6be756ea1ebad6eab9f36d2e04b4fb377a`。

只运行自有 React/Query/HTTP 组件边界，RN/Expo 显示和外部响应按既有夹具替代。没有运行手机、IDE、ADB、共享服务、构建、VPN、依赖安装、原件上传或 Git 写入。所有命令结束，React roots/query caches 按夹具清理，合成探针与失败日志留任务 tmp。未重跑 root 正在进行的类型/整合入口；本机结果不认证实际原生定位/导航、触摸/视觉、WEAPP、物理资源或性能/OOM。
