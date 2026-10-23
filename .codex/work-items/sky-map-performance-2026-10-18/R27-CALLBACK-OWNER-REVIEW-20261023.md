# R27 Sky callback owner review

2026-10-23。独立、有界只读调查；仅新增本证据。已完整读取当前 HANDOFF、PLAN、R25 外层调查、R26 真机结果、最新开发 skill/性能方法及相关实际 owner。UI gen8 待扫码、My 路由方向待答仍由根代理处理；本调查不改变 UI→叠层→Sky 的优先级。未操作手机、IDE、服务、构建、预览、网络配置、私有原件或 Git，未修改生产、测试、PLAN、HANDOFF、Context，也未创建 disable 变体。

## 结论

**没有找到已证实通向 r26 旧 aggregate 的回调强引用根。** 找到并用实际本地 QueryCore 验证的是一个明确、可观察的函数持有 owner：`QueryCache → Query.options.queryFn → useResourceQuery 包装函数 → 页面 queryFn`。`enabled:false` 不删除这条链，也不阻止 Query/options 创建。相同 key 更新会替换当前 options；换 key 后旧 Query 保留其最后 options，直至实际缓存退休。

但必须加一个时序限制：r25/r26 观察在实际 Play receipt 后才 start，所选 aggregate 是此后在 resolver 创建的对象（`scripts/r25-memory-lifetime-instrumentation.mjs:11–12`、`r25-memory-lifetime-adapter.ts:29–36,86–95`）。普通 Play 时 `fineTargetBinding=null`（页面 `2191–2204`），所以 **Play 前已经退出观察的 exact-at Query，其旧 render 的词法环境不能直接含有之后另一 render 才创建的这 8 个 aggregate**。经稳定 ref/其他 owner 的间接路径仍未排除。此项限制不等于排除整个 Query/React 边界。

R26 的两个 Canvas/Fiber 入口有限字段无匹配、数组限额及函数闭包不可见继续成立。本地函数存储机制、同一 render 创建和 V8 可能共享 context 都不是手机上的 `callback → aggregate` 强边，也不是 OOM 根因或修复通过。

## 最短 creation → storage → replacement / retirement 链

以下页面行号指 `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx`；hook/服务路径均在同一 `src` 下。

| 回调及创建点 | 实际持有者与替换/退休 | 与旧 aggregate 的关系及范围 |
| --- | --- | --- |
| fine-target：页面 `2200–2204` 的 `signal => getSkyTargetInstant(fineTargetBinding!, signal)` | `hooks/use-resource-query.ts:71–80` 包装；React Query `useBaseQuery.ts:122–124` 在 effect 安装 options；QueryObserver `150–165,699–714` 更换当前 Query/调用 `setOptions`；Query `205` 保存 options；QueryCache `97,135` 是强 Map。换 key 移除旧 observer，Query `354–369` 安排 GC；`optionalRemove:221–224` 要求无 observer 且 idle，再由 QueryCache `144–151` 删除。默认 `services/query-client.ts:18` 为 30 分钟。 | 页面函数显式自由变量是 `fineTargetBinding`，不直接读取 supplement。旧 exact-at key 可保留旧函数；Play 的空 binding key 也会保存函数，但同 key 的 options 持续替换，不是源码所示每帧追加 Query。必须观察实际安装/存活，不能把 disabled 当无持有。 |
| 其他页面 Query：context lookup `1395–1422`，overview `1453–1471`，report `1473–1491`，stellar catalog `2247–2253`，constellation `2262–2265` | 同一 wrapper/Query owner；分别按 Context、地点/版本或目录 key 更新，仍遵循 options 替换及 Query GC。report 另经 `hooks/use-forecast-query.ts`，其 refresh ref 每次覆盖，过期 timer 在 effect cleanup 清除。 | 显式捕获 Context/session、route、目录 reference 等，不直接读取 SAO aggregate。正常 Play 不因每一时刻改变这些 key。它们仍可能保存某次页面函数，不能仅据自由变量少就证明目标编译器没有共同 context；也没有测得其数量增长。 |
| geometry：页面 `2162–2167` 传入 `readDemand`，hook 内 queryFn / enabled 函数 | `use-sky-time-geometry.ts:46–47` 的 `current.current` 每 render 覆盖 binding/key/readDemand；其 queryFn/eligibility 捕获 hook 自身的 binding/current。Query 显式 `gcTime:0`（`76`），当前 admitted model 则由另一个 retained ref 持有。 | 页面 `readDemand` 读时间/资格，未直接读取 supplement。0ms GC 不是立即收集证明，且不能覆盖在途请求/observer。hook 是单独函数词法作用域；调用它不自动把调用方整份局部变量变成它的捕获。 |
| draw：页面 `2545–2576` 的 `useCallback` | React callback 当前/alternate；`browsingDrawRef.current=draw` 每 render 覆盖。`useReady/useResize` 的最新 fnRef 也可到 draw。draw 创建含 `stellarSupplement.frame` 的实际 lifecycle request；lifecycle `request:246–252` 覆盖 latest；hide/dispose 清 latest。 | **有显式 supplement 引用的候选。** 当前 request/accepted 是产品所需；旧 draw 被哪个外层 owner 持有仍未知。R26 末点 latest/accepted 已换成未选中的新值，不能用这两个当前槽解释所选旧对象；闭包未被 R26 读取。 |
| native lifecycle / AppHide：页面 `2616–2630`，最新 hide/show refs `2615–2616` | 已安装 Taro `createTaroHook`（`dist/runtime.js:45–89`）每 render 覆盖 `fnRef.current`，layout effect 只注册一个 wrapper，cleanup 删除该 wrapper；AppHide effect 只注册一个 `hide` 并以同一函数 off。hide/show refs 每 render 覆盖。 | 并非普通 render 每次都追加生命周期回调。稳定 wrapper 显式读取 refs；这些 refs 可能间接到当前 draw/frame，但未发现源码中的历史队列。不能由注册方式推导手机实际退休已完成。 |
| Play interval：页面 `2231–2245`，`advanceSkyTime:2741–2746` | 活跃 effect 把当次 `advanceSkyTime` 交给 `setInterval(...,16)`；effect 依赖不含每次时刻，故可跨多个 render 持有播放开始附近的函数；Pause、hide、依赖变化或卸载走 `clearInterval`。compass timer `2493–2497` 同样有 cleanup。 | advance 显式读取时间/controller/资格及 setter，没有显式 supplement 访问；它与 draw 同属页面调用的 context 是否共同保留是目标运行时未知。能成为一个有限旧 render holder，不能单独解释全部每帧历史。Pause 后是否仍有其他回调/引擎保留也未观察。 |
| UI 回调：`onRetrySky` 在 `3835,4110,4187`，来源入口 `4018`；触摸 `3793–3796` | 重试箭头显式访问 `stellarSupplement.retry`，同一返回 wrapper 也有 `.frame`；交给实际子组件/React props，最终恢复 Button/StatusPanel 的事件 owner。`SkyObjectPositionAction` 的本地 retry 调用此 prop；其位置 query 建在另一个 hook 的作用域，未把 `onRetrySky` 作为 query 参数。当前触摸 handler 也有 ref 覆盖。 | **另一个显式 wrapper 候选**，是否存在受条件挂载控制，不能假定 r26 每个时刻均挂载。R25 已证实 Taro children-only commit 可留旧 props；普通事件替换先移除旧 handler。固定节点的一份旧 props 不是无限历史，也未与这些 aggregate 匹配。 |

补充排除范围：页面创建的 canvas lifecycle port 在 `1696–2065` 的空依赖 memo 内，创建一次；paint 的局部 completion / `paintAttempt.publish` 显式持有本次 frame，pending slot 在 publication 前及 finally 清除，lifecycle 是 latest 加一个在途 completion。永久迟到原生回调仍是边界，但源码不是每次成功都追加 completion。该既有边界见 [R25 外层调查](R25-OUTER-RETENTION-BOUNDARY-20261022.md)，本次没有重跑。`useSkyOrientation` 的 sensor callbacks 在其自己的函数作用域创建，显式持有姿态 refs/publisher；没有把页面 supplement 传给它。页面检查到的 `notify` 调用只交标量文案/身份，没有交入新的页面 action callback。

## 实际本地机制检查

只运行一次约半秒的内存中 Node 检查，没有创建脚本、产品/测试文件或私有文件。通过 `createRequire(apps/wechat-miniapp/package.json)` 加载完整实际安装模块。选中 `@tanstack/react-query 5.90.21`、`@tanstack/query-core 5.90.20`，React `18.3.1`、Taro `4.2.1`；不能用根目录另一份包的版本替代。

用真实 QueryClient/QueryObserver、两个合成的同形 key、4 个合成回调、`enabled:false` 和 30 分钟 GC，验证：

1. 构造即有一个 Query，`options.queryFn` 与首函数严格同一；subscribe 后 observer 为 1。
2. 同 key setOptions 后 Query 不变，queryFn 严格替换为第二函数。
3. 换到空 binding 同形 key 后旧 Query observer 为 0，旧 options 仍为第二函数；新 Query observer 为 1。
4. 新 key 再更新只替换新 Query 函数；unsubscribe 后两个 Query 均无 observer，但 options 仍在 Cache。
5. 全程 fetch 调用为 **0**；finally destroy/clear 后 QueryCache 为 **0**，没有遗留本地 timer/observer。

结果：`disabledConstructionStoresCallback / sameKeyReplacesCallback / keyChangeKeepsOldIdleQueryAndLastCallback / disabledPlaceholderStoresAndReplacesCallback / unsubscribeRetainsBothQueryOptions` 均为 true，`configuredGcMs=1800000, queriesBeforeCleanup=2, fetchCalls=0`；Node `v24.19.0`。没有等待 30 分钟验证实际超时，没有运行 React/Taro/手机、迫使 GC、读取 closure context 或使用真实数据。它确认函数存储和替换语义，不确认某函数捕获了旧 aggregate、目标 GC cadence、内存收益或 OOM 原因。

## 一个最小、可区分的下一观察

如后续现有手机候选准备已到必要采集节点，**只关联既有 8 个 aggregate 的创建 render 与那次实际创建的 page queryFn / Query wrapper 的身份和弱寿命**，并在 Query 实际安装 options、替换或退出时记录对应标量 ID。保持 r26 aggregate 样本、图扫描次数和上限不变；不添加产品 frame/callback 强历史，不枚举任意对象、不调 getter/函数源码/闭包内部，不输出 key、Context、URL 或 payload。weak metadata 只存 run/render/callback/aggregate 数字；注册不能再造一个捕获 aggregate 的诊断回调。

- 旧 aggregate 仍存活，而对应创建 render 的具体 page queryFn 已被收集：可以排除经该函数及其 Query wrapper 的持有链，转向该 render 的其他实际长寿命回调/owner；无需改 Query GC。
- 旧函数仍在实际 Query.options 中：明确了一个旧回调的强 owner，区别于“只有 React 字段未匹配”。**它仍未证明函数内部到 aggregate 的边**；先保留这个精确边界，不能把同 render 相关性变成缓存修复。后续若必须分离共享 context，需另行论证保持同一请求/数据/accepted 工作的等价因果观察；本调查没有授权或创建该变体。
- 函数未收集但 options 已替换/退出：只证明另一个函数持有者或尚未收集，不能继续把责任归 QueryCache；记录未知并停止此项，不能靠增加数组限额补出闭包。

这项观察有一个明确的排除分支；阳性分支只缩小到旧回调 owner，不承诺取得任意闭包根图。若不能取得实际 callback 身份关联，则现有 source audit 已到上限，**停止在这里**，不再重复 r26 扫描、gen22/23、Node stellar resolver 或新相邻 disable 试验。

## 复用的反证与尚未关闭项

- [gen22](R17-CPU-TEXT-METRICS-RESULT.md) 有效非空名称路径中 native measurement 为 0 而增长仍在，排除仅由重复文字度量解释该样本；不排除整个绘制/React。
- [gen23](R17-ACCEPTED-ACTION-RESULT.md) 直接 object/null action 仍增长，排除最终 accepted action 捕获闭包是该增长的必要条件；它未取消页面 Query/Play/native lifecycle 回调，不能外推为所有闭包均已排除。
- [Page ack](R17-PAGE-BRIDGE-RESULT.md) 未复现 raw Page acknowledgment 堆积，不提供所有 host/React/native queue 的无泄漏证明。
- [R25 resolver](R25-STELLAR-RETENTION-INVESTIGATION-20261022.md) 在本地真实 owner 替换/释放后可回收旧 arrays，未替代手机外层持有观察；[R26](R26-OWNER-PHONE-RESULT-20261022.md) 的全部 8 个 aggregate 曾 accepted 且有生有灭，accepted 本身不解释存活差异。
- 已有真实逻辑层 V8 OOM、完整六字段/正常 Play/Pause/drain/退出和整个 Goal 仍未关闭。本次无生产修复、收益、设备或持续内存验收结论。

## 本次源码身份

只读前后复核同一实际文件，避免把本调查当成另一个候选。PLAN SHA 仍为 `d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`。

| 文件 | SHA-256 |
| --- | --- |
| `spot-sky-page.tsx` | `1287657f3aa9d5b5b2fa9d566dee59f577458c661b372202916b75651f6f1d9e` |
| `hooks/use-resource-query.ts` | `ac6abd7bfbbad287fc74240085f1dcac6042b205e58881a4531b13be04adc8ce` |
| `services/query-client.ts` | `a7c61193100506626c5e2d5638e253342cfd850a5192c147a7550746d934e430` |
| `use-sky-time-geometry.ts` | `14f7c106243d5cae58dc299a46345d7513e3affad6a76baac1bf4eac31bce0f5` |
| QueryCore `src/query.ts` | `4335cc4b280c200de44c60058c3e67b35fb771f71e7da7ec58c8d46193148d5d` |
| QueryCore `src/queryObserver.ts` | `9d62036391c1b51613b2f52eb06c62894337e88c53238b69daedc4e5f4da2847` |
| QueryCore `src/removable.ts` | `4927b3c84093762720585e245285dffa0b37c396a9d95cb1d3648557293f5ac2` |
| React Query `src/useBaseQuery.ts` | `d18a3bc943a275e0754c7b7a0eb5027c305734b315139005b5d0a657f61c863b` |
| Taro framework `dist/runtime.js` | `8298f5a8b9ad4ecf65a6dff6ae40fa020a3b8ed82ae9cde511238544d8ed4fc8` |
