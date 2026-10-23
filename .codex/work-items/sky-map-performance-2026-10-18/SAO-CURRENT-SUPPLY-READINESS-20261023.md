# 当前普通候选的 SAO 供给就绪核查

## 结论

2026-10-23 的本机只读核查未发现 SAO 数据指向、发布版本或已抽取瓦片的合同缺陷。当前任务 API 与公开桥接返回同一份 `FRESH` 索引；一块由该索引明确声明的真实瓦片也能完整取得，并通过现客户端、来源声明和科学数据合同。没有更换供给、重新准入旧 r26 工作负载或操作手机。

这不能解释 gen13/14 当时出现的“暗星未加载”，也不能证明当前手机已加载 SAO。该提示是明确失败状态，不是正常按需未选片、仍在加载或没有可见暗星的通用说明。原缺口继续保留。

## 本次范围

- 复用既有 SAO 采用与商业使用边界，不做供应商研究、远程取源或权利重新选择。
- 只读当前 API、桥接各一次索引，桥接一次实际瓦片，以及已有有界请求 ring；检查本机对应的固定发布文件、当前配置哈希和有限日志尾部。
- 无手机/IDE 操作、构建、刷新、重启、缓存清理、配置修改、生产代码修改或 PLAN/HANDOFF 修改。没有批量请求瓦片。

## 当前供给事实

两份索引 HTTP 均为 200，正文均为 282,405 B，正文 SHA-256 均为 `db63a5ced920c542fe6522a2df5ffcebac88891143cc96f336663971721d5f2f`，且现 `assertSaoIndexPublication` 通过：

- publication：`97d581f282df7c627304980d14ac4a7a0f53754f5945b1d6ef6658b4712f2b10`。
- `sao-visual-supplement.v2`，绑定 `bsc5p-bright-stars.v3`；826 个声明瓦片、246,280 行。这是发布范围，不是手机加载数或完整至某星等的保证。
- 本机 `sao-v2/publication.json`、原始 `index.json` 与该发布 hash/bytes 一致。当前 controller 固定从该目录提供 v2；没有 SAO 专用环境键，terrain root 的改动不改变这项目录责任。
- 本次唯一实际瓦片 `07-07-9-1`：200、1,463 B、9 行，SHA-256 `7a9a772319537b4416b7c2f027c2f440701cb281151c6b61c7e63ac77ed67ccd`，与索引声明及本机原文件字节完全一致。
- 将保存的响应送入真实 `createSaoCatalogClient`（不再发网络请求），index、tile 和 envelope 的来源/许可字段均通过，失效回调次数为 0。来源获取时刻为真实未知 `null`，现合同明确允许，不由文件时间补造。
- 索引声明的最大 tile 为 111,464 B，小于现 JSON 单文件 192 KiB 限；不能把索引正常直接解释为整个 35,314,828 B 声明工作集已读或已进入手机。

当前任务 API 进程和指定入口仍在，私有配置 SHA-256 仍为 `8f52f38a8185dffce11114c4d547590e72e3b3c4191abe6f0dac843ebd48f8f1`。有限 stdout 尾 100 行和空 stderr 未检出 SAO/stellar 错码；它们不覆盖手机文件系统或渲染失败。

## 提示的精确含义

`spot-sky-page.tsx` 只在 `stellarSupplement.failed` 为真时发出这条提示。`use-sky-stellar-supplement.ts` 的合成条件是 active 且以下至少一项成立：index 初次错误、已有 index 的刷新错误、index 为 `STALE_USABLE`、选片异常、loader 失败、几何解析异常。

缺少尚未到达的 publication、未量测视口、暂不可用的精确几何、无选片、正常在途与实际零颗可见星，均不单独把该标志置为真。BSC 独立可用也不表示 SAO 已完成。

## 仍可导致现象的边界

| 责任 | 可触发条件 | 当前能否归因 |
| --- | --- | --- |
| index Query / API 缓存 | 原请求失败；保存结果刷新失败；准入拒绝版本、字节或来源字段；可用旧值为 stale | 本次响应正常；没有当时手机的错误或缓存状态，不能排除历史失败 |
| 当前视图 loader | 当前选片总声明字节超过原 6 MiB 工作集；当前 wanted tile 的 HTTP、文件、读取、JSON、完整性或绑定失败；stale tile | 未获得当时 wanted IDs/字节和真实失败码；不能推断为容量原因，也不放宽原预算 |
| 精确几何 / 版本 | scene 的 base version/hash 与 SAO 不同，或当前精确几何校验、解析失败 | 当前发布与当前 Mini 的 v3 选择一致；本机 HTTP 无法代替当时 scene/frame 身份 |
| 取消 / 代次退休 | 正常由 owner 中止的过时请求不应恢复旧数据；具体取消分类与当前 wanted 状态共同决定 loader 终态 | 未观察到当时取消/退休事件，不据源码可能性制造已确认缺陷 |

桥接的现 32 条请求 ring 中，SAO 只有本次检查产生的两条 200；没有 gen13/14 提示发生时的请求。它不记录客户端文件读取或最终绘制，因此不能回填历史缺失。普通候选没有本任务诊断 overlay，不为这次核查激活 R27。

## 下一动作

保持现供给与路径。当前没有得到可证实、可直接修复的数据指向或生产源码缺陷，不新增镜像、缓存、并发或星库。

在原计划下一次必要 Sky 正常候选观察时，复用已有有界错误/指标 owner：关联同一瞬间的 index 状态、当前 wanted 字节、`sky_stellar_tile_failed` / `sky_stellar_selection_failed` / `sky_stellar_geometry_failed` 实际码与已接收 SAO 数。按第一个真实失败边界修现 owner；若数据层失败再补该缺失成品，若几何/文件层失败则只修该 owner。没有失败复现或运行态证据时，不再重跑本次索引/瓦片，也不把供给通过替代完整 SAO/六字段/内存验收。

## 证据与责任

私有原件位于既有 `r19-ui-20261022/current-sao-supply-20261023`：两份 index 原始响应及 receipt、唯一 tile 原始响应及 receipt、现客户端/本机文件读回、桥接 ring 与摘要、当前条件和完整哈希 manifest。网络目标身份、私有配置内容和进程绑定仅留私有证据。

当前实现入口：[SAO controller](../../../workers/miniapp-api/src/sao-publication.controller.ts)、[发布服务](../../../workers/miniapp-api/src/sao-publication.ts)、[客户端准入](../../../apps/wechat-miniapp/src/services/sao-catalog-client.ts)、[Hook](../../../apps/wechat-miniapp/src/features/sky/use-sky-stellar-supplement.ts)、[当前视图 loader](../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-loader.ts)。既有权利/版本责任沿 [runtime Context](../../../project_context/architecture/runtime-and-domain.md) 与 [external capabilities](../../../project_context/external-capabilities.md)，本报告没有修改这些采用决定。
