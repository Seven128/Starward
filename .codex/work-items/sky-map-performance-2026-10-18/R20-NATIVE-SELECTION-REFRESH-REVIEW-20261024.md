# R20 原生 Map 同 id 刷新独立审查

2026-10-24，独立审阅者 `review_native_selection_refresh`。只读检查本轮三份生产改动：`MapScreen.tsx`、`map-selection-state.ts`、`shell-store.ts` 及两份新增测试。读取当前 PLAN 的原生同 id 事实准入条款、实施证据、global、mobile core Screen Contract、Source Plan 的 Map 选择协调/marker 成功条款，并核原生 DESIGN 与 interaction skill 的状态同步边界。没有修改生产、正式测试、PLAN 或 HANDOFF。

## 必须修复：P2，结果准入没有绑定请求发起时的选择代次

位置：`apps/mobile/src/features/map/MapScreen.tsx:95–105`。

纯规则确实比较 `selectedSpot` 对象与 `routeRevision`，但 MapScreen 在请求完成后的 effect 中读取**那次渲染的最新** selected/revision 再同步调用 `refreshSelectedSpot`。因此它不能识别请求在更早选择代次发起；这些比较在正常 effect 调用中只是把当前值与当前值比较。`admittedPage` 只阻止已消费页被重新播放，不能阻止尚在途的页首次到达时覆盖后来的同 id 选择。

实际反例复用新增 MapScreen 测试的真实 React / Query / shell store / HTTP client，仅转换探针文件的 import 路径，并新增一条 case：

1. 加载列表并选择 B（31/121）。
2. 使当前范围 refetch 保持 pending。
3. 通过真实 shell `selectSpot` 显式选择同 id B 的另一事实对象（名称 `Later explicit B`、纬度 34），保存这次 DecisionContext revision。
4. 原 pending 请求返回 B 的另一组资料（32/122、新名称和 closed；来源时间晚于原列表）。
5. 当前实现把后来的选择对象替换为该迟到页的对象；保留后来对象的正确性断言失败。后续摘要/observer/route/navigation 会沿被替换对象更新。

本次探针 **4 passed / 1 failed**。原件保留：`tmp/r20-native-refresh-review-same-id.test.tsx` 和 `tmp/r20-native-refresh-review-same-id.log`。测试断言是应保留后来选择，不是把错误结果作为通过。日志最后输出完整 Vitest failure；外层 PowerShell 为读取该日志而返回成功，不能据外层 exit 0 宣称测试成功。

修复应在请求/结果身份处保留发起时的选择与地点/route generation，交给现有准入 owner 核对，或使用等价的真实 query/selection generation 绑定。不能在结果落地时重新采样并把它视为原请求资格。保持正常新请求仍可接纳同 id 当前事实；此次发现不要求新建 store、router、数据版本或扩大设备矩阵。Root 已收到具体反例，将修复并取得新独审；本报告不宣称该 P2 已关闭。

## 可复用的检查与剩余边界

独立运行实施者的四文件入口，**19/19 passed**：

```text
# apps/mobile
node ../../tools/run-node.cjs --bin vitest vitest run src/features/map/MapScreen.test.tsx src/features/map/map-selection-state.test.ts src/state/shell-store.test.ts src/data/map-client.test.ts
```

已验证普通 refetch 的同 id 新事实传播、缺页保选择、不同 id 迟到、已消费页保护、被取消旧范围、旧来源/非法坐标准入及角色/交通方式保留。它们不能覆盖上方在途同 id 选择机制。未扩大整仓测试；本次只读审查不重复 root 正在做的 mobile 类型整合。

实施证据中的 Tonight 两个 `__DEV__` 环境错误仍归 NightReport 测试边界，未当作本修复产品故障，也未以本次 19 项通过覆盖那次整合失败。

三份被审源码 SHA-256（本报告形成前）分别为：

- MapScreen：`a2a815700969f749884b356906064b68d9ee40a24724b81948ea4661425726d2`
- map-selection-state：`6608a15c4adc93c0188f9a710b604c611b192ec20a3d93384ec2741451af11ee`
- shell-store：`c526bbd45839f93ebd8479a47c0cee6be756ea1ebad6eab9f36d2e04b4fb377a`

没有手机/微信IDE/ADB、共享服务、构建、VPN、原件上传、依赖或 Git 写入操作。所有测试已结束，React roots/Query caches 按夹具清理；探针及失败日志保留。原生定位/导航设备结果、视觉/触摸、目标 WEAPP、性能和完整 Goal 仍未由本次审查认证。
