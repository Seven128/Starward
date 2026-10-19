# R17 scene-owned memo 有限独立源码审查

审查时间：2026-10-19 03:22 +08:00。独立读取当前任务副本及直接 parent，不复用旧 agent 结论；未实施源码变更。

**结论：未发现阻断本次有限 memo 关联归属诊断的源码缺陷。** 可沿当前试验边界继续收集目标运行证据。这不是正常 renderer 或产品修复准入，不证明原 WeakMap 泄漏、GC 行为或内存改善。设备及 bridge 均由 root 独占；本审查没有连接或操作设备、DevTools、服务端口或账号。

## 绑定与实际审查范围

当前分支 `codex/remote-main-20260908`、HEAD `944a1d6c9ffed6ede39fa9e6c7b56ff2594d57d2` 保留。已读根 AGENTS.md、`project_context/global.md`、`context.toml`、architecture.md，以及 runtime-and-domain.md 的 cloud-sky performance / exact-time memo / memory owner（325–431，重点 352、402–408、427–431）。

候选根：`tmp/r17-scene-memo-trial/source`；直接 parent：`tmp/r17-accepted-action-trial/accepted-action-direct-origin-8797/source`（下述任务内相对路径均相对本目录）。候选 manifest SHA-256 为 `6739328fd43c3218643b2b6a0cbb42cfec10ac5cecf58537093975df1da4a041`，其指定 parent manifest 实际 SHA-256 为 `de10bc2376cbd526e84e706af2091a8b6e5b3e01ca798090b90027cacdc7d30c`。

本次逐项重新计算了 parent 全部 1567 项、候选全部 1568 项 sourceBindings 的文件哈希：两侧均无缺失或不符；无移除项，差异恰为以下四项。没有以“声明四项”代替实际绑定检查。

| 候选 `apps/wechat-miniapp/src/features/sky/` 下文件 | 实际 SHA-256 | 读取范围 |
| --- | --- | --- |
| sky-stellar-scene.ts | `57f3da8fb35d4636cd7d64522c1ccb23e8eca6ebdb9b17168e3100a631e9ac32` | 全部 1–168；与 parent 全差异 |
| r17-scene-owned-memo.ts | `a8bf4ef31ed359b3424d0afc52123b25298a4e1d44e8123f815ade6788a81446` | 全部 1–57，新文件 |
| r17-phone-probe-runtime.ts | `c889ac7d15c14b909a6c84d1ad7b2e19b26fc920827fd7b469c9a6af95525ac4` | 与 parent 全差异；1–85、153–226、312–354；与当前模板替换 candidate 后全文相等 |
| r17-phone-probe-controls.tsx | `016615ccae2ebbc8f96d80ac48c3e5d45573e827fab1cc87499666d1aa683f7b` | 全部 1–193；与 parent 全差异 |

真实消费者读取：spot-sky-page.tsx 1985–2030、3050–3100、3120–3150，并搜索 accepted state / picking 入口；sky-scene-render.ts 411–485；sky-scene-frame-facts.ts 全部 1–32；sky-time-presentation.ts 86–135；r17-accepted-action.ts 全部 1–16。这些文件与 parent 绑定相同，其候选哈希依次为：

```text
spot-sky-page.tsx       5039e1afc2adf44ff23ce29c07e6262cc2b17e6df2fd3d8fcaaf28a930606b70
sky-scene-render.ts     bb77fa2f01cd99e7f7bda80f204493c7339dbf1bb76c2a20f9d8f51cc9beb0f5
sky-scene-frame-facts.ts 96d58951ba3756d6ca85e6bdfb9d2168c473b39d412190be5e7312c83f7024f0
sky-time-presentation.ts ffe24eb0a7c232a42b5da846f68329b316a0128da1ced385dda54914b470b7fc
r17-accepted-action.ts  2ff933611d1592794435581f6d44e57c67f17e60bcf7cf46c3376608206d54a0
```

另在候选 miniapp/src、miniapp-contracts/src、astronomy-core/src 内检索真实 caller、scene clone、freeze、own-symbol/descriptor reflection 和 structuredClone；排除测试后，未找到反射复制私有 cell 或递归冻结该 cell 的生产消费者。时间投影在 attach 前构造 scene；未将附加 cell 的本地 scene 反写共享 report query/cache。

## 源码判断

1. **归属变化与保留边界明确。** helper 的闭包只长期持有私有 Symbol、legacy WeakMap 和数值计数，不持有场景/帧集合、最近强引用或历史数组。`own()` 唯一生产调用位于 attachSkyCatalog 对 fresh object 的构造处；每个 cell 只保存当前 frame，set 替换它。frame 原有 closure 可回到 scene，因此新增普通 scene→cell→frame→scene cycle；源码没有为它添加全局强根。此判断不假定目标引擎的回收结果，也不将 ephemeron 等同于泄漏。
2. **原计算与命中条件保留。** exact time / available / geometry 入口检查仍在 get 之前，真正 `cached.at === at` 返回才增加 sameAtReuses；已有值读取单列 ownedValueReads/fallbackValueReads。原几何校验、完整 points、lazy transform/direction/transmission 与 forEachProjected 算式未变。原 invalid-time 分支不会覆盖有效 memo；legacy 场景仍通过 WeakMap 保留同一 scene 当前帧语义。
3. **冻结、复制及可观察性没有发现具体冲突。** shallow Object.freeze(scene) 只冻结 Symbol 属性本身，不冻结其 cell，因而后续帧可替换；预先冻结的手工/legacy scene 走 WeakMap。Object.keys、JSON 与普通 spread 不携带不可枚举 Symbol，clone 会得到独立 fallback memo，不能借用另一 observer 的 owned cell。额外 own Symbol 可被显式反射发现，不能称为“完全不可观察”；当前已检查生产路径没有依赖 own-symbol 集或递归 symbol freeze。若未来加入此类消费者，应在同一 owner 重审。
4. **真实消费者和身份保持。** 页面 2011 的 useMemo 在时间 geometry 与 publication 变化时重新 attach；页面目录、availability/frame facts 和 painter 继续调用同一 resolveSkySceneFrame。renderer 仍用 point 的 catalogIndex 找原 entry.objectRef，保持原投影、appearance 与 accepted pick/name 身份。accepted-action setter、完整 React accepted record、CPU Scene、资源/RAF/time-intent 均未出现在实际 delta 中，没有新增第二 renderer 或调度入口。
5. **计数不会强保留 scene/frame。** stats 生成 11 个数值的 detached snapshot；resetObservation 仅重置观察计数，保留 lifetime 计数且不清理/重建 memo。运行时只逐字段复制白名单标量，保 first/last 两份 capture；无 source object、frame 或 scene 进入 observations。计数从 measurement reset 起累计，包括原 1 秒 arming 段；它们不能直接当成仅 recording 段的每帧成本或回收量。
6. **probe/collector 兼容边界成立。** 实际 runtime 与 `scripts/r17-phone-probe-v2-runtime.ts` 替换 candidate 后全文相等。协议允许原三 owner v2，新增 mode 要求 memo owner；memo capture 严格限定 11 个非负整数或 null 字段，拒绝额外字段/owner。null/零 capture 是结构兼容能力，不证明诊断实际执行；目标窗仍须检查 owned 创建/写入与真正 same-at 复用非零，并解释 fallback/rejected。controls 只新增 label/binding、标量读取和 reset；原 15 秒 metrics、20 秒同 run guarded Pause、有限原字节 terminal 补发及 hide/unmount 取消保留。collector 沿原验证、先 metrics 后 terminal、绑定一致、冲突不覆盖和容量/重试规则工作。

## 本次检查与既有本地证据

本次只执行一次聚焦命令：

```text
node --test .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-phone-probe-v2.test.mjs .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-phone-probe-collector.test.mjs
```

结果 **9/9 通过**，包括 memo detach/白名单、旧 v2/v1、真实与合成 publication 区分、metrics/terminal 分离、固定重试与 collector 并发/冲突/容量。collector fixture 使用独立生成的系统临时目录，按其已解析路径边界清理；输出 `liveServiceTouched:false`，未启服务或触碰原 collector。

已完整阅读现有 public-consumer checker（88 行，SHA-256 `5557a0902e20ef6299018583b00656c678f7db78ebe63b2f6d734c81efe651e5`）及输出（SHA-256 `ffa9cbe6b821fcd03042c114ddb103bc2b450d769d1aa08698494a4bdb818d5e`），未重跑或覆盖。它整模块导入 parent/candidate 及各自真实 client，以公开 fixture `9ce8706d36586ed4c0cb5e074c6b66efa396ec634320a2c4015bfb4d255011b0` 准入 8404 行；四组完整角数组一致、frame facts 非空、scene 交错身份、invalid time、浅冻结后同刻读取、JSON/Object.keys、clone legacy A→B→A 和 observer 冲突断言与输出吻合。它只提供这些本地缓存契约的既有证据，没有 GC、SAO 目标运行或内存结论。

相关实际 owner 哈希（runtime 读取范围同上，其余文件全文读取）：

```text
scripts/r17-phone-probe-v2-runtime.ts       f00c7f122ab40a8fef2c710cbd2fd69489bd50f5253c2c593380947e501638d5
scripts/r17-phone-probe-v2-protocol.mjs     9d596e05a51187dc5fb7e609b78e9dd6f4d09aa59120ecea364aadc714809127
scripts/r17-phone-probe-v2.test.mjs         af9fb3b9ec3f544696c1a6895fa1ad5d10ff8bd01b07560226ac87359e330240
scripts/r17-phone-probe-collector.mjs       83291e3ba6506d5104e23aec3aad5a4495805927595023801c28c442bf64ab6d
scripts/r17-phone-probe-collector.test.mjs  3c98f2e9dcccfc46340c41362ef4b3c9397bdcf43f4fb06ece29508465d176dc
```

## 记录问题及明确未验

**非阻断记录问题：准备状态已滞后。** 本次读取的 TRIAL.md（SHA-256 `50640163bc3029f7e197abc340fe95d2dd31b15e9b33df7f8f4fdbd8222acbde`）开头仍称“未完整构建”“gen23仍是实际手机候选”；PREPARATION.json（SHA-256 `51eee13a6a95c379586f295b5d41449fe6dde7f11f8b59fbaf0fb72f06be4be2`）顶层 `wholeBuild:false` / pending 与已填完整 build result、selection 状态不一致。root 应在当前证据 owner 对齐已完成动作与剩余项；本审查仅记录此差异，没有更改这些文件。不得用旧布尔值或本审查推定手机是否已测。

完整构建、双份 bundle/readback、11 static checks、TS 20→20 和主包余量 80380B 是当前 manifest/preparation 已有记录，本次没有重复执行，也未独立重算编译 bundle；记录的 bundle SHA-256 为 `c3298cd6904b308a49a44c1818131aa95106c4dfdfb349f94f2d94cd0952c763`。

本次未验证目标 VM 的 Symbol/GC/堆回收与内存斜率，未取得新 phone RESULT，未验证恢复正常 renderer/copy/caption/accepted 路径后的性能、可见性或产品验收。即使该归属试验改善，也须在原路径恢复后验证；若仍增长，仅否定本次关联归属假说。R17 A/B 与原任务义务不因本报告减少。
