# 用户性能采集：失败状态与提示策略独立审阅

审阅范围：Root 所接收的四份 2026-10-26 用户采集，以及当前小程序相关源码。只读分析；未操作手机/IDE/网络/服务，未改产品或计划。原始数据位于 `D:/dev/Starward-data/verification/sky-map-20261018/performance-20261025/profiles/`，原件和校验清单由 Root 保全。本记录是独立审阅证据，不是第二份实施计划或产品验收。

## 结论

不能把用户看到的全部提示解释成“加载时误报”，也不能凭 `wx.request success callback` / `wx.downloadFile success callback` 认定 HTTP/资源/渲染成功。当前源码既有合理的 loading/取消守卫，也有已证实的取消→失败分支，以及故障状态重复入队会重新显示的通知语义。应先分清数据、文件准入、native 安装、几何准备和提示 episode，再修共享责任，不能只隐藏报错或加任意节流。

| 判定 | 证据与责任 |
| --- | --- |
| 已证实代码缺口：语义取消可被置为暗星失败 | `sky-stellar-tile-loader.ts:55–58` 的 `cancelled` 只控制日志。若 `MiniappRequestCancelled`、`sky_public_json_cancelled` 或 retired-index 错误发生时该 loader 的 signal 尚未 aborted，且 tile 仍 wanted，仍执行 `failed.add(id)`。实际导入函数的纯离线最小判别确认了此行为；未证明本次手机录制命中此分支。 |
| 已证实通知机制不等于故障 episode 去重 | `state/notification.ts:59–80` 对同 dedupeKey 更新 `createdAt`、增加 `occurrences`、移到队首；`components/notification.tsx:185` 把这些字段放在 React key 中，导致通知重挂和可见计时重启。去重只合并队列身份，并不阻止同一持续失败反复打扰。它本身未必是全局缺陷；需由业务失败 episode 控制重复发布，而非无依据改变所有正常通知。 |
| 采集支持一个短暂“准备中→错误→加载中”的 Sky 过渡 | `sky-play` 的 setData 中 2.730 s 写入“正在加载此地的星空…”，6.372 s 写入“星图与地点或时间不符，请重试”，6.544 s 又写入“正在加载星图…”。源码 `spot-sky-page.tsx:3334–3385` 在 `!reportData` 等条件下映射 ERROR，需核实几何/时间供给暂未匹配是否被提前当终态；setData 时点不是精确可见首帧或完整物理闪烁次数。 |
| 通常加载与错误已有部分分离，不能抹掉全部失败 | Sky report 通知 `spot-sky-page.tsx:2599` 明确在 `isFetching` 时返回；恒星主表通知也有 fetching guard。暗星 hook 的 `failed` 则包括 index error/refreshError/STALE_USABLE、selection/loader/resolution 失败；loading 与部分失败可以同时成立。 |
| Map 连续异常已在数据补丁中出现，但失败域未定 | layers 文件有地形异常两种文案各 12 次写入、光污染异常 21 次写入；这些是 setData 补丁，不是 24/21 个独立错误事件，也不能据此认定全部 native rendering failure。 |
| 光污染曾尝试下载，尚不能称已拿到有效且已绘数据 | layers 在 26.572 s 发起 night-light download，26.604 s 有 success callback；该回调没有 statusCode/结果参数。`raster-file-adapter.ts:23–35` 仍要检查状态、临时文件、stat，再由共享资源 owner 验字节/hash；之后还有原生安装。因此与用户“无任何表现”并不矛盾。 |

## 原始采集能支持什么

`layers-pan-20261026.json` 中可确认下载调用为 4 次 terrain、1 次 night-light，均有相邻成功回调事件，但导出缺少回调参数。地形调用时点约 6.441、17.659、17.999、38.697 s；不能从事件数量精确配对用户说的前两次拖动或断言 HTTP 成功。地形异常文案从“细节更新失败，保留当前覆盖”变为“暂时无法显示”；必须分别核已显示 source、pending source 和实际 native 对象是否仍有效。

`sky-play-20261026.json` 中“暗星未加载”文本写入 2 次（9.890、12.105 s），通用“暂时无法获取数据”文本写入 14 次。后一文案由 `StatusPanel` 的 ERROR 标题统一产生，不等于全部都是浮层通知；其末段还含回到 Map 后的内容。因此不应把 14 次写入宣称 14 次网络失败、14 个弹窗或完整可见次数。用户对高频干扰的实机观察仍是有效失败反馈，需要修复。

两份 `.heapprofile` 是分配采样，不提供逐次点击的可靠 CPU 延迟时间线。`extra` 的更大采样权重或更多节点不能直接证明“点年以后点时慢了几倍”、内存增长率或泄漏；它的操作范围/时长/全天视野与正常 Play 文件不同。用户描述应保留为复现步骤，交 Root 将命中的实际栈映射到源码责任；必要时再让用户做那一个明确对照，而不是重新跑整批。

## 源码路径与需要保持的语义

- 暗星：`features/sky/use-sky-stellar-supplement.ts:15–99` → `sky-stellar-tile-loader.ts` → `services/sao-catalog-client.ts` / `sky-public-image-runtime.ts`。`failed` 不只有请求失败；geometry mismatch、选择异常、6 MiB 工作集超限也可失败。先读当前有界诊断码或纯函数复现，不能以猜测缩减 SAO 内容。loader 对 signal-aborted、离开 wanted 和 dispose 有正确的迟到保护，应保留。
- Sky 通知：`spot-sky-page.tsx:2345–2349` 暗星通知只依赖 failed/notify，key 固定 `sky-stellar-supplement`；不是每个 tick 都新建 key。report unavailable 的 key 包含 spot/context/date/reason，但不含每秒时刻或 generation。真实高频可能来自失败状态波动、不同状态源和重挂，不能预设为 timestamp key 爆炸。
- 地形：`hooks/use-terrain-overlay.ts:24–43` 对带 failureCode 的结果 staleTime=0，每 identity 有一次短恢复；视窗 identity 更新会重新具备该恢复资格。Map 的失败提示 `pages/map/index.tsx:988–997` 没有 `isFetching` guard，依赖 native error、presented data 等；旧失败与新请求并存时可能继续发通知。
- 光污染：`pages/map/index.tsx:1000–1048` → `hooks/use-raster-image.ts` → `services/raster-file-adapter.ts` / raster resource owner → `use-map-raster-installation.ts` / `map-ground-overlay.ts`。UI 未显示必须定位到 metadata、download HTTP、字节/hash、getImageInfo、native ack 或 visible coverage 的某个首个失败边界。
- 原生替换：`map-ground-overlay.ts:161–192` 有同 ID update，失败/超时标 `mustRemove` 并进入 requiresMapRecovery；这是保资源身份的有意约束。无 actual remove ack 时不得清 pin、强复用 ID、不断 remount 或仅加 timeout 冒恢复。My 隐藏/返回仍失败不自动证明新地图实例恢复路径执行过。
- 资源加载取消：`hooks/use-raster-image.ts:26–28` 已排除 signal-aborted 和 `isMiniappRequestCancelled`，可作为同语义责任的反查；不要将暗星的取消误分类扩散到共享栅格路径。

## 纯离线判别：取消不得冒暗星真实失败

命令在仓库 cwd 通过已安装 `node --import tsx --input-type=module` 实际导入 `createSkyStellarTileLoader` 和 `MiniappRequestCancelled`，未改生产代码/测试文件：

1. 声明一个元数据合法、bytes=1 的独立 review tile，wanted 包含它。
2. load 抛 `new MiniappRequestCancelled('superseded')`，未调用该 loader signal.abort。
3. 等一个 `setImmediate`，读取状态后 dispose。

实读结果：`requestSignalAborted:false`；末状态 `{loading:false, failed:true, tiles:0}`；0 网络、0 native 输入。这证实特定边界的错误分类，而非本次 raw profile 的根因证据。修复时需确定 cancelled-but-still-wanted 的重排/重新绑定策略，避免简单不记失败造成无限立即重试。再覆盖真失败、已取消旧 wanted、publication 退休和正常重试；不取消现有生命周期守卫。

## 给下一轮的决定性验证

1. 优先按用户这次失败负载，沿现成诊断入口取最小错误码/HTTP status/文件准入/native result；不要让用户再录同一 CPU 来弥补缺失的错误参数。若历史诊断已丢失，则先做可离线的责任层判别和窄修，再一次性给必要补采清单。
2. 将正常 loading、superseded/cancel、保留旧有效内容的 refresh failure、无覆盖、真正不可恢复失败分开；通知按一次失败 episode 出现一次，恢复解除，同资源重试失败可明确再报告。来源/重试入口仍要保留，不能让“少报错”变成静默缺星/缺地形。
3. 将新 Sky 用户要求“分钟/时/天/月/年跳变与过渡、全天后更卡”写到唯一 PLAN，先确认已采用的连续过渡合同及真实 accepted 帧；不能为了动画牺牲精确时间、完整星数、真实最终目标或取消规则。

本轮未对错误码、HTTP body 或 native ack 作捕获中不存在的推断；未给出“地形、夜光、Sky 已修复”“无泄漏/OOM 已解”结论。Root 应在最终交接中保留这些缺口。
