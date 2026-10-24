# R20 原生 Map 语义 origin 与选择事实最终独审

2026-10-24，独立审阅者 `review_native_selection_semantic_origin`。本限定修复范围内未发现未关闭的 P1/P2。只读生产与正式测试，仅新增本文及本次测试日志；未改 PLAN、HANDOFF、生产代码或其他实施者文件。

## 审查范围与结论

按唯一 PLAN 的同 id 当前事实责任，读取 native App Screen Contract、Source Plan 的 `map-selection-coordination`、marker 成功/失败条款与 `shared-decision-context`，核对原生 DESIGN/交互规则及当前实际 consumers。范围为 `MapScreen.tsx`、`map-selection-state.ts`、`shell-store.ts`、`shell-location.ts`、`use-decision-snapshot.ts` 和 Map client/合同、相关正式回归。不是 Mini Program UI、全 App、设备或性能审查。

- `resolveShellOrigin` 将原 `useDecisionSnapshot` 的有限坐标判断、既有默认范围、标签、source 和 locationId 原样迁到现有纯 location owner。UI、查询派发和 shell 准入共用此语义；未复制或发明 fallback 数值，也未把默认范围称为实际定位。
- queryFn 在派发前绑定选中对象与 `selectionGeneration`，返回时仍核同一选择及当前查询坐标。结果完成时不会重采样后来的选择冒充原资格。同 id 显式换对象、不同 id、ABA、已取消旧范围以及已消费缓存页不能覆盖后来的选择。
- 选择代次与路线修订分开。独立 mode/同地点 role 编辑继续保留意图，同时允许合格地点事实更新；同坐标 origin 标签/对象替换不再吞掉同一查询的新事实。默认范围与实际坐标范围沿同一派发/准入规则。
- 合格事实通过一个 shell 更新传播到 current marker、摘要、observer/后续天气请求、路线请求与导航参数；保选择 id、cycle/backup 等意图。缺页不选择首项，旧来源时间与不合格/详情式受限坐标不被采用为新的精确观察事实。没有新增 store、路由或服务器版本事实。

前四份审查中的实际失败继续保留：[首次同 id 迟到](R20-NATIVE-SELECTION-REFRESH-REVIEW-20261024.md)、[路线意图](R20-NATIVE-SELECTION-FINAL-REVIEW-20261024.md)、[默认范围](R20-NATIVE-SELECTION-GENERATIONS-REVIEW-20261024.md)、[同坐标新 origin 对象](R20-NATIVE-SELECTION-CLOSED-REVIEW-20261024.md)。本次按当前代码与实际输出确认闭合，不用前批绿数替代新变化的验证。

## 独立执行与实际结果

正式五文件 **31/31 passed，exit 0**，日志 `tmp/r20-native-semantic-origin-review-20261024.log`：

```text
# apps/mobile
node ../../tools/run-node.cjs --bin vitest vitest run
  src/features/map/MapScreen.test.tsx
  src/features/map/map-selection-state.test.ts
  src/state/shell-store.test.ts
  src/data/map-client.test.ts
  src/state/decision-context-consumers.test.tsx
```

其中真实 MapScreen/Query/store/client 回归核非空同 id 新名称、坐标与 closed 状态，以及摘要、observer 请求、路线请求和 native adapter 参数；实际消费者组覆盖 Tonight/Forecast/Sky/Shooting 与共享选择边界。RN/Expo 显示、存储和外部 HTTP 响应使用既有隔离端口。

最近一条原失败脚本 `tmp/r20-native-selection-location-identity-review.test.tsx` **不改脚本重新执行，8/8 passed，exit 0**；日志 `tmp/r20-native-semantic-origin-original-counterexample-20261024.log`。其原正确性断言现在确认同坐标新 location 对象后接纳新事实，原失败日志没有覆盖。

独立 mobile workspace `npm run typecheck` exit 0，日志 `tmp/r20-native-semantic-origin-typecheck-20261024.log`；五份生产文件定向 `git diff --check` exit 0。必要证据已充分，未再扩全仓或设备矩阵。

## 核查源码身份与限制

| 文件 | SHA-256 |
| --- | --- |
| MapScreen.tsx | `38fb5ca1effcb052d225a281126ad793153238315742b3b5ee8414c4e33585fa` |
| map-selection-state.ts | `4434ec4cfcd8c6da12fbd256cf1afecd9d096f08ce760ef176b7bb589fa2ac02` |
| shell-store.ts | `f231b3dc928dae4bc2ae9ab103b4be9891c2c5720b9bb7dd9a5de42d7e442109` |
| shell-location.ts | `dbad24a8f756513af66514c306b54ef2bac42ae4c927d1a33d226ff698c3c0e4` |
| use-decision-snapshot.ts | `c749e76240d5480ae3550e34c056c56f7378e8737e7007e7a500e0f7c0c81227` |

没有操作手机、IDE、ADB、共享 PG/API/队列、VPN、冻结构建、部署、依赖或 Git 写入。所有本次命令退出，React roots 与 Query caches 随原夹具清理，无新后台进程。实际 Expo/Android/iOS 定位、外部导航结果、视觉/触摸、物理资源及性能/OOM仍未由本次受控组件检查认证；完整 Goal 与其他 family 的未完成义务继续保留。
