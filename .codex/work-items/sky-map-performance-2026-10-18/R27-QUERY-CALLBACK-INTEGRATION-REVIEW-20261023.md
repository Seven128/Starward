# R27 Query callback integration review

2026-10-23，独立集成审查。已完整读取当前 HANDOFF、PLAN、最新开发 skill/性能方法、[回调 owner 调查](R27-CALLBACK-OWNER-REVIEW-20261023.md)及[观测器合同](R27-QUERY-CALLBACK-OBSERVER-20261023.md)，实际核对生产页面、共享 Query hook、SAO hook/resolver 和 Mini Program 实际安装的 QueryCore/React Query。审查范围为 `scripts/r27-query-callback-{observer.ts,links.ts,instrumentation.mjs}`、R27 协议/检查点测试、既有 collector、共享检查点 fixture、R26 检查点测试及 `build-r17-normal-baseline-v3.mjs` 的相关集成边界。

本代理只新增本报告；未修改生产、测试、builder、PLAN、HANDOFF、Context 或冻结候选，未操作构建、预览、手机、IDE、服务、网络配置、Git 状态或私有原件。UI gen8 扫码与 My 路由取舍仍待人类答复；本审查不改变 UI→叠层→Sky 顺序，也不关闭 OOM 或完整 Goal。

## 结论与已修正发现

**初审确认一项 P2，主代理修正后已局部独立复核；当前审查范围没有剩余 confirmed P1/P2。** 这允许继续原有任务用候选准备，不能当作 WEAPP 观察资格、性能收益或产品验收。

初版 `r27-query-callback-links.ts:37–38` 用 `getQueryCache().find({ queryKey, exact:true })` 登记 Query。实际安装 QueryCore 的 `src/queryCache.ts:179–189` 先 `getAll()` 物化整个 Cache，再 `.find()`；`exact` 不使它变成单槽读取。此调用发生在样本凑齐前的每次 gated render，违反本轮“不遍历其他 query”的观察边界，并引入与全 Cache 规模相关的分配/工作。独立内存中机制检查用三个合成 Query，仅一次该 `find` 即得到 `getAllCalls=1, queryObjectsMaterialized=3`；无 fetch，finally 已 clear。

主代理现于 `links.ts:33–46` 保留身份 gate，使用**同一 provider** 的 `client.defaultQueryOptions({queryKey}).queryHash`，随后 `cache.get(queryHash)`。生产 `useResourceQuery` 未开放每次调用的 hash override；实际 `useQuery/useBaseQuery.ts:54–67` 也由同一默认 owner 取得该 hash。修正保留 provider 的 `queryKeyHashFn/queryHash` 规则，没有自行 JSON 序列化 key；查找异常或错误 client 只登记 missing/unknown，不使诊断异常逃到产品 render。

对应 owner 级回归加载实际 `createR27QueryCallbackLinks` 和实际 QueryClient，将 `find/getAll` 设为抛错；以同一默认 owner 建立自定义 hash 的目标 Query，同时保留三个无关 Query。它验证目标 owner/option 为真，并在同 hash 新实例替换后把旧实例判为已退出。主代理保留了修正前真实失败；本代理只独立运行此一条当前回归，**1/1 通过，exit 0**，未重复宽检查。

## 其余关键边界

| 责任 | 实际核对结果与结论范围 |
| --- | --- |
| 创建 render 的资格 | 页面 fine-target 回调在 `spot-sky-page.tsx:2200–2204` 创建；SAO hook 调用在 `2363–2366`。`use-sky-stellar-supplement.ts` 的 `useMemo` 同步调用 resolver，`r25MemoryAggregate` 在实际 `resolved` 返回前登记。R27 在原 `owners.observeAggregate` 完成后只查原弱 ID，因此正常完成的当前 render 关联有源码资格；它没有证明 React commit，也没有证明 callback→aggregate 强边。 |
| 源变换与产品语义 | 页面函数起点加 begin，loading/recovery/normal 三个真实返回表达式各经 end 原样返回；没有新函数、try 块或词法作用域包住页面。原 page queryFn 和原 Query wrapper 只经返回原函数的登记函数；未登记站点不查 Cache，不执行 queryFn，不改 Query enabled、key、请求、调度或 React state。原文件可逆剥离及 AST 检查覆盖变换内容；这不替代实际编译后执行。 |
| 持有与有界性 | observer 仅保存至多八个样本的 page/wrapper/Query WeakRef、一个当前槽和标量；aggregate/ReactNode/key/Context 不进入持久诊断值。两个端口是固定模块 owner，未新增捕获本次 aggregate 的诊断回调。八项凑齐后停止新 WeakRef；凑齐前空 render 可增加累计构造，驻留仍只有当前槽，不能把累计 refsCreated 当驻留数量或字节。 |
| 失败及中止 render | 未完成的 render 不倒填 completed；后续 begin 记录 unterminated 并替换当前槽。缺失、能力不支持、构造/deref/owner 读取错误保持 unknown，未把未登记写成 collected。返回节点不被保存、枚举或 freeze。 |
| 实际 Query 占位 | snapshot 用 own descriptors 读 `queryHash/options/queryFn`，不调这些产品属性的 getter、不输出原值。`cache.get(hash)===原 Query` 可区分同 hash 新对象；`queryInCache:false/currentOptionMatches:true` 仍允许旧 Query 被其他 owner 保留，两个字段没有混为一谈。 |
| 生命周期与观察窗口 | 沿原实际 Play receipt start；Pause 停止新增关联，保留弱见证供 active-5/首个 drain-10 两个原阶段读取，随后包只携带原观察时间。原 20 秒产品 Pause、90 秒 seal/释放、两次框架扫描均未增；没有每帧 snapshot、额外产品 timer 或强历史。结束后留存的是标量旧 snapshot，不能解释成结束时的新占位观察。 |
| 协议及输送 | R27 扩展严格标量结构、八个原 ID、时间边界和 32 KiB 总包限制，继承 R26 及更早验证；没有 raw callback/key/Context/源码字段。collector 在任何路径/磁盘操作前按版本验证，仍为单 flight、不可变序号文件、相同字节重送/冲突拒绝。原十包和每包两次自动尝试未增。 |
| 测试的真实边界 | observer 的确定性 WeakRef fixture 覆盖 alive/collected/unknown，不是假装真实 GC。共享 adapter fixture 加载完整实际 owner/transport，实际 QueryClient 覆盖替换、退出和精确实例；`enter` 仍是合成的调用顺序，不是实际页面 React effects/commit。原 R26 检查点测试复用同一 fixture，未换成成功桩。 |

## 仍未验证与下一准入边界

- 本次没有编译 WEAPP 或发手机，没有验证目标 WeakRef、此 callback site 的真实执行关联、实际 Query/options 安装时序、有效非空 BSC/加载 SAO 样本或新增观察成本。须在原必要采集节点核对源/整包/目标身份、原样本 accepted/有效负载及实际窗口；不能因为本地可读便写为手机已采集。
- `renderCompleted` 只说明函数走过 end。缺失、未完成或不支持的样本保留 unknown；同一次 render 的关联既不是闭包边，也不是存活原因。旧 aggregate 仍活而对应 page callback 已收集，才可在合格实际样本上排除这条具体 callback 链；options 阳性只缩小 callback owner，不能直接改 Query GC 或声称根因。
- 初始 gen31 未构建准备记录为 source `f8a1d7376b59981d346761f7f62fd679b0e90e65db706eae225d743d5078bd63`、1621 件；它早于本次 P2 修正。本报告复核当前脚本，不认证那份旧准备已含修正。主代理须沿原 owner 保全后 refresh 未构建准备并完成其相关检查；本报告没有代做或倒填这些结果。
- R26 manifest 仍声明 gen30、source `0ea8e7ed28acf55ba0ab6e7a1978e5cc6965f0dfa56eb2a8e43abe6691074bc8`、原 builder `9e5a5c132f8bbbeef0fb52cedd54614e532e8de92f0505e531314f0299f9be61`。本代理未运行它、未改其 source/project/maps，也未重做整个冻结树或主代理私有归档的逐件校验。

主代理报告 R27 core/检查点与 R26 检查点相关组 17/17 通过；本报告将它与独立执行的单条 owner 回归分开记录。完整历史 collector 组与 delta TypeScript 由主代理负责，未在此重复，也不据其未见最终结果作通过声明。

## 审查源码身份

修正后局部回读的 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `r27-query-callback-observer.ts` | `1a85702583d2eea2ccaa40b17d7bba636f27e9e77e7a177258cb3d5965b1c7d0` |
| `r27-query-callback-links.ts` | `cde86380ccc66852b74ba49ff3cbcaf29b36f959a822bac0fbd8efa584169aa3` |
| `r27-query-callback-instrumentation.mjs` | `d7526b6aec30a8031b7c54726d4dfeafd3049fa68d7816fce536ad6728a38905` |
| `r27-memory-checkpoint-protocol.mjs` | `1931b8fcb6f7a96a65b0fa8cac776f65074b1069499b9a226a5a3838f4096c52` |
| `r27-memory-checkpoint.test.mjs` | `cc102b592ca68810332aa4be472b80b72a080aa91f61d50e0711345f661bce08` |
| `build-r17-normal-baseline-v3.mjs` | `ef5e863bdf10583308741dcaba775983de2eff47902e823d0978c035bffd98a9` |

生产页面、`use-resource-query.ts`、`query-client.ts` 的 hash 仍与前述 R27 owner 调查一致；PLAN 仍为 `d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`。没有以诊断集成覆盖 UI、完整正常 Play/退出、真实 OOM 或原 Goal 的其余未完成项。
