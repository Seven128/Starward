# R27 最小 Query 回调观测器

2026-10-23。此项只实现任务用观测器和对应检查；沿 [R27 调查边界](R27-CALLBACK-OWNER-REVIEW-20261023.md)，回答原 8 个 aggregate 的创建 render 与一个 fine-target queryFn site 的身份、弱寿命和实际 Query options 占位是否可关联。**没有找到或修复手机上的 aggregate 持有根，没有关闭 OOM、交互或完整 Goal。** UI → 叠层 → Sky 的顺序保持。

本代理仅新增 `scripts/r27-query-callback-observer.ts`、`scripts/r27-query-callback-observer.test.mjs` 和本证据。没有修改生产、PLAN、HANDOFF、Context、builder 或冻结候选，没有构建、预览、手机/API/IDE 操作、Git 操作、强迫 GC、数据传输或全图/闭包扫描。source transform、adapter、schema 和实际集成由根代理负责，本文件不声称其已完成。

## 实现与输出合同

工厂为 `createR27QueryCallbackObserver({aggregateId, readQueryOwner, WeakRef?})`。`aggregateId` 只向已有 owner 查原 ID；本观测器只接受整数 1–8，不给新对象另编号，也不保存 aggregate。两个端口都必须是固定诊断 owner，不得捕获某次 render、产品 frame 或 callback。

- `start()` 激活并重置本次标量诊断；已 active 则返回 false。返回 true 表示激活，不表示 WeakRef 可用。能力缺失仍可记录原 ID 的 unknown 关联，`capability` 明确为 unsupported。
- `beginRender()` 打开至多一个当前槽，仅含数字 renderId、登记标记和 page/wrapper/query 的 WeakRef。上一槽未 finish 时只记 unterminated 并丢弃该当前槽。`pageCallback`、`queryWrapper` 原样返回原函数；只有与当前 page 弱槽严格同一时才登记 wrapper/query。重复登记保留第一次，不创建额外引用。
- `observesPageCallback(fn)` 是纯身份 gate。只有 tracking、打开当前 render、仍需凑齐原样本且 fn 严格相同时为 true；供共享 hook 在查 QueryCache 前 gating。没有保存输入或创建新回调。
- `aggregate()` 首次命中某个原 ID 时冻结当时这三个 WeakRef。没有当前 render、page 未登记或引用不可用时明确 unknown；后来登记不会倒填。`finishRender(value)` 只标对应样本 completed 并清当前槽，严格原样返回 value，不保存、枚举或 freeze ReactNode。
- 凑齐 8 项后，后续 render 不再创建当前槽或任何新 WeakRef，page/query 注册均 no-op，identity gate 为 false；第 8 个当前 render 仍可正常 finish。实际 Query 的后续 options 替换和 Cache 退出通过已存 Query 弱引用继续读取，不跟踪后续所有 render。
- `stopTracking()` 停止新增关联；已有 open render 可 finish，snapshot 继续观测存量弱寿命和实际 Query 占位。`release()` 清空当前槽及样本，停止后续观察；再次 start 才重开新 run。

驻留上限为 8 个样本的 3 个弱引用及 1 个当前槽的 3 个弱引用；多个同 render 的样本可共享同一弱引用。若每个选中 render 恰好有一项 aggregate，整个选择期创建 24 个引用，另有一次能力测试；测试已验证凑齐后再跑 100 个 render 不再增加构造。凑齐前的空 render、未选中 aggregate 或失败登记可增加**累计**构造/错误计数，但只保留一个当前槽，不形成历史。累计构造次数不是存活引用数、分配字节或手机成本结论。所有计数饱和于既有 `1e12`，render ID 耗尽时停止开槽，不制造重复 ID。

snapshot 是递归冻结的新标量树，不含函数、WeakRef、Query、aggregate、key、URL、Context 或 payload：

```text
schemaVersion: starward-r27-query-callback-v1
capability: supported | unsupported
semantics: same-render-association-and-actual-query-option-not-closure-edge
active, tracking, released
policy: {samples: 8, sites: 1}
diagnostics: bounded numeric counters + overflow
samples: [{
  aggregateId, site: fine-target-queryFn,
  association: render | outside-render,
  renderId: number | null, renderCompleted,
  pageCallback, queryWrapper, queryOwner: alive | collected | unknown,
  queryInCache, currentOptionMatches: boolean | null
}]
```

缺失、WeakRef unsupported/constructor/deref 错误都不是 collected。Query 仍可读而 wrapper 不可读时，可以读取 Cache 占位，但 option 身份为 null；Query 已不可读则两个 owner 字段均为 null。已退出 Cache 但仍由外部保留的 Query 可以呈现 `queryInCache:false/currentOptionMatches:true`，两字段意义不同。snapshot 的 deref 会在当前 job 暂时保活目标；它不是强保留链图或总体抽样估计。

## 检查及实际机制

通过现有 Node/TypeScript 入口：

```powershell
node --test .codex/work-items/sky-map-performance-2026-10-18/scripts/r27-query-callback-observer.test.mjs
node apps/wechat-miniapp/node_modules/typescript/bin/tsc --strict --noEmit --skipLibCheck --target ES2022 --lib ES2022 .codex/work-items/sky-map-performance-2026-10-18/scripts/r27-query-callback-observer.ts
```

最终 **10/10 通过、0 失败、0 跳过**；独立严格类型检查 exit 0。覆盖严格同一函数/对象返回、没有执行输入动作、原 8 ID/重复/非法 ID/lookup 失败、空及未结束 render、登记晚于 aggregate 不倒填、仅匹配当前 fine-target、capability/构造/deref/read-port 失败、pause/release/restart，以及输出不含产品对象/函数、不读产品附加 getter。确定性 WeakRef fixture 用于合成 alive/collected/unknown，不是假装实际 GC，也未迫使 GC。

另在同一测试中直接加载当前 Mini Program 实际安装的 `@tanstack/query-core 5.90.20`（`react-query 5.90.21`，Node `v24.19.0`），用 QueryClient/QueryObserver、两个合成 key 和 disabled 查询，检验：

1. 构造/订阅后，真实 Query options 保存所观测 wrapper。
2. 同 key 替换 options 后，Query 对象不变，旧 wrapper 的匹配变为 false。
3. 换 key 后，旧 Query 仍在 Cache，保存其末次 options。
4. 删除旧 Query，再在同 key 创建另一 Query 时，必须用 `cache.get(queryHash) === query` 判旧对象已退出；只有同 hash 的存在不足以证明原对象占位。
5. 全部 fetch 调用为 0；finally unsubscribe/destroy/clear 后 Cache 为 0，观测器已 release。

这证明 owner 接口能够区分当前 option 与退出对象，不证明某 wrapper 捕获 aggregate、手机函数已回收、目标 GC cadence、内存收益或 OOM 原因。共享 source transform 保真、实际 runtime Query/WeakRef 资格、开销及有效手机样本仍需根代理集成后单独验证。

## 本次文件身份

| 文件 | SHA-256 |
| --- | --- |
| `scripts/r27-query-callback-observer.ts` | `1a85702583d2eea2ccaa40b17d7bba636f27e9e77e7a177258cb3d5965b1c7d0` |
| `scripts/r27-query-callback-observer.test.mjs` | `c41e96a3dc617f22e1a71473b16392afaab2ee4d5867cb92d1b192255ff911d3` |

后续结果解释沿 R27：若旧 aggregate 仍在而对应 page callback 已收集，可排除该具体回调链；若旧函数仍在真实 options，只定位了函数的一个强 owner，同 render 关联仍不能当作函数到 aggregate 的强边；若函数仍在但 options 已换/退出，此项停在“其他 holder 或尚未收集”的边界，不能通过扩大扫描/样本或改 Query GC 冒充定位。
