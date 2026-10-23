# Geometry 当前需求修复：独立审查

2026-10-21。当前结论：**发现的一项 P2 已由 root 修复并独立复核，最终未发现 P1/P2 阻断。** 本审查只针对 r21 之后新增的 geometry live-demand、原页面 guard 前移、共享 Query 资格类型及本次取消重试修复；未把 r21 已有的精确星点准备作为本次新增修改。未操作手机、IDE、服务，未构建、推送、提交或上传，也未修改生产或共享 Context/PLAN/HANDOFF。精确文件身份和结构化结果见 [JSON](GEOMETRY-CURRENT-DEMAND-INDEPENDENT-REVIEW-20261021.json)。

冻结比较基准为 source `502d9d644785e33af7ce1537bc1899a738725cc752d42daefaf95d66baee3448`、bundle `5a9f4b6bc8eb3e9c4dc8c3595467476d74e4664cd4db0c959a060ee0a83f99c1`。该冻结源码包含任务注入；比较时将 r17/r19 probe、计量和控制入口与实际生产 delta 分开。当前作者的三份生产文件哈希与交付记录一致。

## 已修复的 P2：过期结果进入默认网络重试

`use-sky-time-geometry.ts` 的异步结果 guard 将过期结果拒绝为 `MiniappRequestCancelled("superseded")`，审查初版 `query-client.ts` 的 `queries.retry: 1` 将其继续作为普通失败重试。A 正在请求时，同步时间意图已到 B、B 的 render 尚未执行；A 返回后被 guard 拒绝。此时若用户回到 A 且 B 的 render 被合并掉，新 A observer 仍绑定同一无数据 Query。TanStack 对 pending retryer 复用原 Promise，不会因新的 enabled options 立即发出 A。

以小程序真实安装的 `@tanstack/react-query 5.90.21` / `query-core 5.90.20`、生产 geometry/Resource hook 投影及 `useBaseQuery` 实际 `_optimisticResults: "optimistic"` 执行该顺序：拒绝后状态为 pending/fetching、failureCount 1；回 A 后 40 ms 仍只有最初一次 transport，第二次 A 约 **1,014.77 ms** 后才启动，之后能恢复正确模型。这是自动 backoff 引入的响应空窗，不是网络测得的延迟或手机性能数值。

root 在现有 `query-client.ts` 复用原取消分类，将 retry 改为 `!isMiniappRequestCancelled(error) && failureCount < 1`。未增加另一重试 policy、scheduler、产品时钟延迟或请求缓存。作者原真实 Query 测试配置 `retry: false`，没有覆盖这项生产策略；现已读取完整生产 Query client 并启用 optimistic results。

独立回验也直接读取实际生产 Query policy。相同序列的取消后状态现在为 error/idle；新 A 在同次 observer commit 发出第二次请求，40 ms 检查时已有两次 transport，最终精确模型正确。host 相对时间为 7.32 ms，**不是手机耗时或性能预算**。普通当前 transport 同步抛错仍恰好自动重试一次并恢复。初始失败原件 `tmp/review-geometry-live-demand-20261021-before.json` 与复核 `tmp/review-geometry-live-demand-20261021-after.json` 分别保留，不覆盖反例。

## 已核实的责任边界

- 真实安装 `useBaseQuery` 在 passive effect 调用 `observer.setOptions`，同时在 render 使用 optimistic result；`enabled` 会在 mount、可选 fetch、stale/timer 等位置多次求值。当前每份 queued options 的单向 disabled 事实只服务于 Query 的 previous-enabled 比较，不写时刻或模型。实际 optimistic 路径下，旧 A 抑制及 fresh A 重启的独立检查通过。
- `demandCurrent` 保持 live read，按 Context/data revision、窗口 start 与 NIGHT/TWO_HOURS 身份判断；同窗秒/分钟变化可以消费原请求和已缓存结果。独立 cached 同窗反例保留模型对象并呈现最新精确时刻，没有多发 transport。
- 旧 request 在 B 真正 commit 后由 Query 的已消费 AbortSignal 退休；初始策略下独立检查确认 pending retry 的 signal aborted，原 backoff 到期未另发旧 transport。修复后该 response 已完整拒绝、状态 idle，signal 无须再变成 aborted；再次检查没有迟到旧请求。不能把“已经结束而无需 abort”和“仍有活请求”混为一谈。新增结果 guard 没有创建另一个取消 registry。
- 实际页面的三份既有 guard 在调用 geometry 前已完成定义；其依赖的 time、session、viewport、orientation owner 也已经初始化。Apply 的 `contextSession.begin`、hide 的 visibility revision/viewport ref、当前 store Context 检查均同步生效，不等待 React `timeIntent`。Cancel 读取原 observation-time；short→NIGHT Play 不复用短窗口身份。没有发现闭包初始化错误或新的时钟写入者。
- `useResourceQuery` 的资格类型扩展直接交给原 Query，布尔消费者、cache/stale/data/readCurrent、失败保留旧 data、显式 refetch 返回语义未被另行重写。共享取消分类只排除已有明确取消类，普通错误的一次重试保持。当前异步结果 guard 的错误由 Query Promise 处理；最终五个独立观察没有 unhandled rejection，另有共享 `use-resource-query.test.ts` 三项通过。

独立观察复用既有 hook harness 的钩子槽/效果推进部分，但执行当前生产 geometry/Resource hook、安装中的真实 QueryClient/QueryObserver、真实 observation-time 和实际生产 retry policy。它不是完整 React/Taro 或手机运行；不重复作者的 80 项矩阵。审查新增的约束来自反例和当前 owner 语义，未为旧任务 probe 的硬匹配还原生产代码。下一候选仍需适配实际 dispatch/validated/admission 注入边界并通过相关协议检查。

新增 `demandCurrent` 会重复调用完整 `skyGeometryWindow`；实际 Query 多次求 enabled，因此总 CPU/分配成本及手机净收益仍需当前候选观察，不能由“少发请求”推定已经更快。这是尚未测得的代价，不据此提出额外微优化。

审查不认证手机流畅、正常 Play、无内存泄漏或 native crash 修复。r21 真机退出和 heap/retainer 缺口继续保留，目标端压力已停止；局部请求修复不能关闭 A/B 或完整 Goal。
