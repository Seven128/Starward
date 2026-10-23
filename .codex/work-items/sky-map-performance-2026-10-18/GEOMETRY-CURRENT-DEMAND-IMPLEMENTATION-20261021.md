# Geometry 当前需求：阻止旧 render 的延迟启动

2026-10-21。该修复只处理 R21-HOLD-RESULT 已指出的过期 logical request 启动，**尚未证明手机端完整响应改善，不关闭 A 或 B**。没有手机、IDE、服务、构建候选、推送、提交或上传操作；无新依赖、定时器、调度器或缓存。

## 已复现的边界

安装中的 TanStack Query 5.90.21 `useBaseQuery` 在 passive effect 内调用 `observer.setOptions`。原 geometry 把 render 时的 `Boolean(binding)` 与 `at` 闭包交给 Query：A render 完成后，原 observation-time 已同步接受 B，但 A 的 effect 才执行，仍会调用 A 的 transport。用真实 `useResourceQuery` 投影、安装中的 QueryClient/QueryObserver 和当前 geometry hook 执行这个顺序，修复前测试确实得到 `[A]` 而非 `[]`。

这能解释一种与实机三个过期启动相符的机制；不是对每个设备事件的独立堆栈归因，也不把 logical call→validated 拆成网络/服务端耗时。未消费 presentation 已知仅 1 ms 的现边界未移动。

## 修改责任

- `use-resource-query.ts` 只把 `enabled` 类型扩为 TanStack 已支持的无参数资格函数；原始配置仍直接交给同一 Query。
- `use-sky-time-geometry.ts` 在 observer 启动、实际 queryFn、异步结果返回与 retained 准入前读取现 live demand。比较现 Context/data revision/window mode/window start 身份，同窗连续秒/分钟仍复用请求；取消、迟到与失效使用原 Query signal 和 `MiniappRequestCancelled`。手动 retry 也不能绕过 live demand。
- 每次 render 的 queued options 仅记住其 enabled 已变 false 这一事实，供 Query 的 previous-enabled 比较。否则 A→B→A 且 B 未 render 时，旧/新两个活函数会同时读到 A=true，Query 不再启动该 key。第二个真实 Query 反例先证明了这个朴素方案的失败，再验证当前修复；该事实不写时间或数据，不是另一调度 owner。请求有效性本身仍由当前 live demand 和原 signal 决定。
- `spot-sky-page.tsx` 将原 `skyPageVisibleCurrent` / `skyInteractionCurrent` / `skyTimeIntentCurrent` 三个现有 guard 提前到 geometry 调用前，供 Query 在 render 期间安全读取；新增参数读取同一个 `observationTime.snapshot()`，不以 React 的旧 `timeIntent` 替代最新输入。

原服务/client source/auth/model 校验、两小时/NIGHT 网格、Query 缓存和取消、最后已接受画面、显式 Apply/Cancel 责任保持。

## 校验与交接

- 80 项唯一相关测试通过：geometry 与 resource Query 19；observation-time、现 page action ownership、report recovery、time commit continuity、time disclosure 与 preview status 61。新增 7 个机制检查覆盖过期启动、coalesced A→B→A、同窗复用、真实 Query 取消后 A→B→A、Play 升级/重试、返回时准入及真实页面 live guard。
- Mini Program TypeScript 检查完成，exit 0；受影响文件 `git diff --check` 通过。没有扩大到全产品或重复已充分的设备验证。
- 必须独立评审后再决定与其他改动合批。目标端性能、完整 Play、heap/retainer 与 native exit 原因仍未验；该修复不声称无内存泄漏。
- **任务 instrumentation 尚需适配**：`scripts/r17-normal-input-instrumentation.mjs` 的 `addR17GeometryStages` 仍硬匹配旧单行 queryFn 和 retained assignment。生产正确边界已改变，未为旧 fixture 还原错误代码，也未编辑 probe。root 应按实际 dispatch/validated/current-admission 责任更新现注入并跑原协议检查，不能把 probe 不再匹配当生产回归。

四份修改文件的实际 SHA-256、字节数与检查命令见 [记录](GEOMETRY-CURRENT-DEMAND-IMPLEMENTATION-20261021.json)。这不是新完整候选的 source/bundle identity；现 phone r21 不含本修复。

## 独审后修复与当前绑定

独审发现新增superseded rejection会进入现默认`retry:1`，使A在flight→B未render→A结果退休→返回A时仍等旧retryer约1秒。root先加真实生产Query默认与optimistic observer反例，实际得到fetching而非idle、取消请求被执行两次的失败，然后在已有`query-client.ts`取消分类owner修复：明确`MiniappRequestCancelled`不重试，其他错误仍只重试一次。不新增geometry专用重试政策，不改网络backoff。

真实harness现在加载完整生产QueryClient模块及其默认配置，不再用`retry:false`掩盖行为。两项新反例和原geometry/resource检查21项全部通过，全量TS0；原61项未变消费者证据复用，共82项适用检查。独立审查又从实际policy运行5项反例及3项共享Query检查，P2关闭、当前无P1/P2；见[最终独审](GEOMETRY-CURRENT-DEMAND-INDEPENDENT-REVIEW-20261021.md)。当前5份文件身份已写JSON，初始4份绑定保在before字段。新增窗口资格求值的实际设备成本仍未知，不把减少请求当性能净收益。任务probe适配及下一候选仍在后续执行中，未验手机与B。
