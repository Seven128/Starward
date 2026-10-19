# 地形残余等待：最小观察接入

2026-10-19。沿最新 PLAN 的待决问题准备；初始实现不操作现场，后续已合入同一完整正常 A1 候选，构建身份由R17-NORMAL-A1-PREPARATION拥有，未送达手机。以下方法与初始软件结果保留；root 后续既有正常实例的窄 HTTP 观察见文末，不将它当新 observer 已在手机运行。

## 已确认的真实责任与缺口

`pages/map/index.tsx` 用实际 `mapTerrainBounds` → `useTerrainOverlay` 的稳定窗口查询（结果携带实际 issued request）→ `useRasterImage` → `mapRasterFiles`/`raster-image-resources` 的共享文件与完整性准入 → `useMapRasterInstallation` → `map-ground-overlay` 双 slot 协调器。当前 `mapTerrainLoading` 混合 metadata、PNG 和 native 确认等待；它不是独立网络或可见性计时。`useResourceQuery`/`api-client` 既有 acceptance diagnostics 没有时间戳或图片关联，并逐条同步写存储，不能直接回答本次问题。

复用 `OVERLAY-STABLE-WINDOW`、`TERRAIN-HOTSPOT-PRODUCTS`、`MAP-STATIC-ADAPTER`，不重取源/重做成品、不采用分块、预取或 worker。有限 terrain publication 仍为 `terrain-fixed:c84ef25094e6455c81003900636d08c515485258c3e5c884e19aa6b051908722`；Map seal 为 `89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0`。身份只是历史选定输入，root 应核将用服务的实际绑定。8798/8799 公共隔离服务恢复不自动证明它已选中这组 Map 产品；8796 历史成功也不是当前活性证据。不要重启/重建 8791 或清账号状态。

现有 native 录屏回执没有与逻辑 VM 共用的已验证起点时钟。下面的小标记只补一个**充分的正向判断**：同一有效新资产的 `file_ready`（或该资产随后 current 的 `native_ack`）已出现在真实画面，而其应有有效地形仍空，证明至少那段画面等待发生在对应文件验证就绪之后。未看到这个顺序不能反推“请求等待”；标记异步发布、合并、遮挡或原生层合成均可令顺序不明。

## 任务脚本

- `scripts/terrain-wait-observer.ts`：一次 `enable` 或真实 `gesture` 起点，80 个事件/64 个匿名身份、15 秒自动封存。15 秒只匹配现有有界录屏窗口，不是产品延迟指标。无轮询、无逐帧记录、无请求/渲染替换；不保存坐标、完整 URL、本地路径、Context、账号、响应或错误正文。
- `scripts/terrain-wait-marker.tsx`：每次边界事件最多一次小标记更新，禁止触摸命中；隐藏/卸载封存。仅用于 DAY 地图诊断，不能据它宣称 adopted UI 或普通候选验收。正式交付排除该标记。
- `scripts/inject-terrain-wait-observer.mjs`：只在已复制的完整 source staging 内加入观察。`inspect` 只读；`apply` 拒绝仓库本体、task `tmp` 之外的路径、逃逸链接、已插桩源和变化的精确接线边界。复用当前完整构建 owner，不复制已生成 JS。
- `scripts/terrain-wait-observer.test.mjs`：本轮 **6/6** 通过，含真实消费者接线语法、实际 cache 状态位置、匿名输出、时钟回拨、事件溢出封存和拒绝生产目录写入。未执行 WEAPP build、完整类型检查或目标运行；这些由下一合批候选负责。

由现有完整候选 builder 完成 source copy 后、开始编译前调用：

```js
import { injectTerrainWaitObserver } from './inject-terrain-wait-observer.mjs';
await injectTerrainWaitObserver(freshSourceStaging, {
  action: 'gesture',
  sourceSha256: normalCandidateSourceSha256,
  write: true,
});
```

这里的 `freshSourceStaging` 必须是当前 work item 的 `tmp` 内尚未构建的完整源码副本。`normalCandidateSourceSha256` 必须来自该构建 owner 的真实完整源指纹，不填占位 hash。返回/保存的 `terrain-wait-source.json` 记录 6 个真实消费者的 before/after hash 及 2 个新文件 hash；完整包身份仍由原构建/feedback owner 生成。不要在 active feedback generation、canonical 源码或旧 gen25/gen26 上原地插桩。

## root 的一轮观察

1. 先解决当前候选/在途预览边界；gen26 UNKNOWN 不能重发或绑定，旧 session 不可输入。待下一正常完整候选实际送达、可见身份和设备绑定成立，再使用本观察。正常 Sky A/B 与 Map 可共用这批源码，但各自结果分开。
2. 记录完整源/插桩/包身份、当前服务与实际 terrain publication。选已准备成品内的公开技术区域，正常入口的约 4 km 视野；记录实际 native 范围落在哪个已准备窗口。这一步由现有 owner 读取，不通过本探针输出站位。
3. 优先 `gesture`：先让地形在当前区域正确绘出，再用一个真实短拖动跨既有覆盖边界，落到同级已准备的邻接窗。现有有限窗为 `12-3345-1783-2-1`、`12-3346-1783-2-1`、中间 `12-3346-1783-1-1`；只有实际 getRegion/producer 结果一致时才按此命名。不要只按屏幕拖动距离猜窗口。不必重做所有四目标。
4. 起点前必须已有 `TW armed gesture` 可读标记，正确 Map 已稳态、无前序未完成请求/安装。按设备 owner fresh capture + view，再通过原 `record-swipe --seconds 15` 发送**一次**已审视输入；root 选当前真实坐标/方向，本文件不提供旧截图坐标。`enable` 是因现场条件更合适时的替代模式，不与 gesture 同轮混为一个延迟样本。
5. 观察期正常请求、下载、校验、pin、双 slot 安装均继续。15 秒后或隐藏/卸载，只有新诊断 key `starward.task.terrain-wait.v1` 写入一次有界摘要；不读/删其他 storage。用已认证**目标手机 runtime** 的现有只读 storage 操作提取该精确 key，保存到原私有证据 owner。模拟器同 key、旧 source hash 或旧起点不是这次手机回执。存储不可读/写入失败时保留导出 gap，不用无日志当零事件。
6. 在 refresh 前归档该回执、实际视频/截图及完整候选绑定。标记必须可读；按资产匿名号、事件序号、metadata attempt 与 native current/cleanup 位解释，旧图的 ack、null 资产、未知/溢出身份不能绑定新覆盖。实际画面须查看目标有效地形位置及所需细节；透明平坦像素不是缺测。记录首个可用覆盖与完整所需细节仍是两个视觉事实。

不为制造 cold 样本清存储。`file_acquire.cache` 来自资源 owner 当前命中的真实 `miss / queued / loading / ready` 状态，已执行完整性不匹配淘汰后才记。它认证的是本次 JS 文件 owner 条件，不是 OS 文件缓存/CDN、冷源或冷文件系统。起点保留 metadataAvailable/fetching/imageReady/imagePending；`metadata_start` 不出现可由已有新鲜 metadata 解释，不能说没有数据依赖。

## 事件含义与结果分支

| 事件 | 能证明 | 仍不能证明 |
| --- | --- | --- |
| `metadata_start / returned` | 同一 attempt 的当前请求 Promise 起止，含服务等待与客户端响应处理 | 细分 server / transfer / validation，或数据已装入 native |
| `download_returned` | Taro download success callback 已返回并有 status 分类 | stat/SHA 完整性、decode、visible |
| `file_ready` | 共享文件 owner 已成功完成 stat/完整性准入，当前 hook 未取消 | 原生 decode/安装/实际可见 |
| `native_ack` | coordinator 当前回执；可能是已展示目标复用 | 新 add 次数、GPU fence 或真实像素 |
| 真实画面中的标记与覆盖顺序 | 对同一有效资产可以建立 ready-before-blank 的下界 | 反方向因果或精确总延迟；标记本身不是同步时钟 |

- 同一新资产 `file_ready`/current `native_ack` 标记已经可见，随后仍有可辨空缺：下一步只调查 file-ready 后的相关安装/客户端发布/原生呈现责任；先不改 provider、分块或预取。
- `metadata_start→returned` 或 `download_returned` 前确有长壁钟等待，但与可见空缺还未可靠关联：记录为请求侧候选解释，未关闭本轮问题；只补决定性的目标 Network/共享时钟关联，不以 HTTP duration 替代手机结论。
- 数据返回、文件就绪与首覆盖在同一不可分辨画面附近，标记跳过关键阶段，或错目标/overflow/时钟回拨：结论 `unknown`；先修该观察边界，不选生产修复。
- 实际操作全部文件 `ready`、metadata 已有，但没有新覆盖请求/有效非空负载：只证明该暖条件，不外推首次或跨覆盖缺口。

所有时间采用同一 `Date.now` 壁钟毫秒；明确非已验证单调时钟。回拨/缺读后 `relativeMs=null`，不得补零或混 host clock。两个相同读数的差值不证明零成本，亚分辨率区间保持未知。该样本不产 p95/FPS/显存结论，也不关闭地形、云量、夜光的完整原生配准、连续双指、实际天气、iOS 和恢复义务。

## 既有正常实例的恢复边界观察

root在新G2RzCu会话中通过正常入口从Sky返回Map，旧gen25诊断标签已见，但手机整包/AppID未证明。返回时Context GET200、overview GET200、Sky GET200和两次Map scene GET200；地形、云量等错误提示仍出现。仅由任务桥保32项无身份HTTP类别/状态观察，不读手机存储，不清账号或缓存。

在实际图层入口看到地形开启与“部分或全部地形暂时无法显示”，随后仅一次明确“重试”。关联的`terrain-overlay GET200`于2026-10-19T00:23:44.777Z返回，桥内HTTP2ms，之后capture仍显示不可用。此次没有保存该手机实际viewport请求/body，也没有新observer的file-ready/native回执；不能凭200或2ms把故障分给文件后侧，或把它当已有有效覆盖的等待样本。

独立手工使用同一隔离公开站位、radius2km（**不是手机viewport**）取得`AVAILABLE`地形metadata，真实PNG起初返回414。已定位并修复任务诊断launcher的准备问题：它使用Fastify默认100字符路由参数上限，实际文件名110字符；正式HTTP owner `fastifyDeploymentOptions`原本是256。诊断入口现直接复用该owner，没有另设生产策略。**同一PNG**随后GET200、206,409B、SHA-256 `fb92810de6bc624b66113ab2fa0516da0e64b0957316d9d271e9284766f55304`，与metadata承诺一致。该手工成功不认证手机实际资产相同，也不等于手机地形恢复。

共享HTTP配置改变后，08:48在手机真实图层入口做一次重试，关联`terrain-overlay GET200`/8ms，随后capture仍不可用。之后只给任务桥补最小无身份metadata/asset响应事实，再做一次有界8秒观察（08:53）：实际metadata为`PARTIAL` envelope、terrain `AVAILABLE`、有imageUrl、imageBytes156,363，HTTP200/4ms；观察ring未出现PNG请求，手机最后仍不可用。同一ring还含Map scene GET404，源于隔离MemoryCache随API重启丢失旧Context。原公开Context私有文件保留，但不能继续当服务中有效；需经公开入口准备/选择恢复，不启动8791。无PNG请求不能证明文件未缓存、未就绪或native失败；本轮没有目标file-ready/native回执，阶段继续unknown，不凭metadata可用选择生产性能修复。

新增Map片段与captures已逐项hash保存至既有外部owner的`device-session-map-boundary-archive`（14文件/4,434,615B）与`device-session-terrain-http-archive`（11文件/3,233,397B），保原两批档案。两次新片段为`recording-1792370933284.mp4`、`recording-1792371216181.mp4`；原片待必要时审阅，本段只采用实际已view的前后capture，不宣称已审完整连续视频、冷缓存、延迟改善或原生地形恢复。最新匿名边界原件在既有私有owner的`resume-20261019/terrain-phone-boundary-after-facts.private.json`。手机最后在地形/云量图层面板，19日04:30，全部旧截图输入授权过期。服务与最终精确清理由HANDOFF拥有。

当前已进一步排除两项准备故障。桥exec19072实际因请求取消引起`Readable`未处理AbortError而退出；HTTP PNG可用不等于桥在随后的手机动作中仍存活。任务桥已用Node原生pipeline负责流错误和取消，重启为exec45300，8799未重启；一次实际PNG响应上的客户端取消后health仍200，不将其当手机性能对照。缺少Content-Length继续记unknown，未补0。原8791、账号、PG/Redis、配对和VPN均未改。

同一公开输入已通过原准备入口在`after-http-fix`保存Context201与48-frame Sky200；随后手机正常“刷新观星点”入口实际得到Context GET200、overview200、两次Map scene200和Sky200，站位停车文字重新显示。此处没有手机Context POST/PUT证据，不宣称该动作创建了新Context。接着图层只做一次健康服务条件下的terrain重试：2026-10-19T01:26:00.894Z，metadata200/6ms、PARTIAL envelope/terrain AVAILABLE/image156,363B，ring仍无asset请求，capture仍显示不可用。故file cache、file admission、native viewport/安装责任继续unknown；停止相同重试，待正确观察候选的有意义边界，不据此采用分块/预取/worker。

本次后续原片与captures另有`device-session-context-recovery-archive`，22文件/9,958,565B，全部SHA读回并保前四批；三段视频2664761/2966118/3170383只归档，未声明连续审片。匿名响应事实与取消测试原件在既有私有owner，分别为`terrain-phone-public-refresh-after-bridge-recovery.private.json`、`terrain-phone-retry-after-context-recovery.private.json`、`terrain-bridge-cancellation-recovery.private.json`。结果采用已实际view的captures；最新仍是Map地形/云量面板，不是有效覆盖或延迟改善验收。
