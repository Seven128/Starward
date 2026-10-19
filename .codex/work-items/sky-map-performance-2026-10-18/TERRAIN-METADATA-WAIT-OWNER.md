# r6 地形 metadata 等待：现有责任与最小下一观察

2026-10-19，文件分析；沿现有 PLAN，不另立方案或宣称优化完成。本代理只读取源码、任务与已冻结私有文件，没有操作设备/IDE、发 HTTP、启动服务、构建或改生产源码。所读仓库 HEAD 为 `404d84df3c6003dbfa535864d5764e0f3c46c430`；它不代替运行 API 的版本证明。

## 新增已证事实

root 已从恢复的同一官方目标精确读取 `starward.task.terrain-wait.v1`。原 reply 在既有外部 `a1-r6-terrain-wait-20261019/official-exact-key-read-file.private.json`，2698 B，SHA `653ab774ff9303ba3faee07796f6b577b6924b03c28351baa5f70fb133e2d242`。本代理实际解析该文件：r6 buildSource `95d1e91d…`、gesture、deadline 封存，7 条事件、无 overflow、无 invalid/backward clock reads。

| 同一手机 Date.now 窗口 | 已证内容 |
| --- | --- |
| action 0 ms | 已有 metadata 和旧 imageReady |
| metadata_start 1735 → returned 3983 ms | attempt 1、request 4；**2248 ms**，返回新 asset 5 |
| file_acquire 3998 → ready 4096 ms | 同 asset 5，文件 cache **miss**；98 ms，download_returned 在 4083 ms |
| ready 4096 → native_ack 4130 ms | 同 asset 5 / file 6；34 ms，current=true、cleanup=false |

这些是有条件有效的手机 wall-elapsed 软件边界，不是 CPU 时间或物理呈现。1735 ms 包含 1400 ms 拖动，不叫纯排队。2248 ms 覆盖 queryFn 内 `getTerrainOverlay` 的请求与返回处理；不全部归给服务端。桥同动作 metadata 为 200/2195 ms/314570 B，asset 200/37 ms；原桥文件 SHA `7e3fcc39bd9c927af6c7b98d57f79ccccbb3900cb3047894e0af8ce487b7b825`。两个时钟不跨减。[既有逐帧结果](TERRAIN-R6-WAIT-RESULT.md) 的最后缺口 PTS 7.636556 / 首新覆盖 7.652700 仍有效；receipt 没有校准 PTS，所以 file-ready 与物理首覆盖的先后仍 unknown。**软件请求前侧已有独立的 >2 s 等待，值得先细分；不能据此排除其他呈现等待。**

当前 `r17-normal-profile/runtime.private.json` 指向既有 `terrain-hotspots-20261018`。读取其真实 inventory（SHA `f8903922eb14702d5de6325c903fac296bbc69d94019c9d7844ee03ac71ea774`）和 13 项 proof：13 项 proof hash 均匹配 inventory、PNG 文件长度均匹配 proof；9 cells、4 windows，z11/12，**0 项 image.byteSize 等于本次 314570 B**。四个 window 为 447385 / 157168 / 79361 / 157464 B。若当前 8799 确按该配置运行，这次返回不能是该 inventory 的精确 final-window hit。这只是排除该成品命中；未证明它是冷源、未完成 cell、临时磁盘 miss 或 CPU 热函数。运行配置文件本身不是进程环境读回。

## 等待可能在哪个现有 owner

| 责任 / 源码入口 | 能形成的等待，以及当前证据界限 |
| --- | --- |
| [`terrain-overlay-request.ts`](../../../apps/wechat-miniapp/src/services/terrain-overlay-request.ts)、[`use-terrain-overlay.ts`](../../../apps/wechat-miniapp/src/hooks/use-terrain-overlay.ts)、[`terrain-overlay-coverage.ts`](../../../apps/wechat-miniapp/src/hooks/terrain-overlay-coverage.ts) | 同生产器 grid/window/LOD 的 pending 与 24 h 成功查询复用；原图覆盖足够则保原 issued request。跨覆盖或要更细层级仍合法地产生新请求。receipt 只保匿名 request 4，不含实际窗口；不能把合法出界当 cache 失效。`metadata_start` 已在 queryFn 内，不测此前 React/query 等待。 |
| [`api-client.ts:989`](../../../apps/wechat-miniapp/src/services/api-client.ts#L989)、[`controller.ts:295`](../../../workers/miniapp-api/src/controller.ts#L295)、[`miniapp-service.ts:1023`](../../../workers/miniapp-api/src/miniapp-service.ts#L1023) | 实际请求保 7 位外扩 bounds，HTTP 层 cache=false；query owner 保成功值。BFF 等 `TerrainService.getPublication`。**矩形 MAP 的 radiusKm 未定义，跳过年度夜光扫描/合成；这条 metadata 不等待天气或 astronomy。** 不能拿云量通知出现推定云接口阻塞地形。 |
| [`terrain-service.ts:64`](../../../workers/miniapp-api/src/terrain-service.ts#L64)、`:99–175` | 先读 bundled publication，再同 window identity 共享读取 / 16 项完成 cache；未命中再依次试精确 published inventory、24 h 临时 manifest/PNG。published 不要求过期刷新；不能因已有较大粗图或部分子格便当新细窗已发布。没有返回 cache outcome。 |
| [`terrain-window-renderer.ts`](../../../workers/miniapp-api/src/terrain-window-renderer.ts)、[`terrain-service.ts:107`](../../../workers/miniapp-api/src/terrain-service.ts#L107) | 缺 final window 时，两读者复用/取得 fixed cells，再按地理顺序复制已着色 PNG、encode、验证；完成前还等序列化 cacheWrite / prune。已有 cells 可以免取源，仍有组合成本；缺 cells 则走既有源名额。源最多两项，已准入窗的子读可等待现有名额。尚无本次 cell 命中/排队/写入证据。 |
| [`terrain-viewport-renderer.ts:21`](../../../workers/miniapp-api/src/terrain-viewport-renderer.ts#L21) | 真正缺 cell 才走共享 Terrarium 源；最多 64 个已完成解码源、在途共享、期限/字节预算不变。已有 `TerrainRenderMeasurement`：sourceReads/hits/joins/bytes、projection、sourceReadWall、I/O sum、decode sum、sample、shade、encode、total。它测 **cell 派生**，不含整个 window/cache write/HTTP；并行 sum 不等于墙钟总时长。当前没有本次对应测量。 |
| [`terrain-fixed-publication.ts`](../../../workers/miniapp-api/src/terrain-fixed-publication.ts)、[`publish_fixed_terrain.mts`](../../../data-pipelines/terrain/publish_fixed_terrain.mts) | 原有限热点 publisher 可复用 previous/current cell 和 exact window、保旧 URL、inventory-last。无需新 producer 或改 r6；先辨认实际窗口再决定是否补有限声明。把一个窗口列入 target 是准备，不是手机改善验收。 |
| [`map-publication-inputs.mjs`](../../../tools/deployment/map-publication-inputs.mjs)、[`night-light-prepared-window.ts`](../../../workers/miniapp-api/src/night-light-prepared-window.ts) | sealed Map adapter 从原 terrain inventory 导出静态 PNG/proof；没有替未知 terrain window 生成 metadata。`mapStaticPublication` 的 prepared consumer 属年度夜光；地形 final hit 仍由 `terrainPublicationRoot → TerrainService` 所有。两者不能合算成一个“prepared 已命中”。 |

上表相对链接均指本仓库实际 owner；完整实现仍以源码为准。`TerrainOverlayData` 现有 `publicationId / datasetVersion / derivedAt / imageSha256 / imageBytes / imageBoundsGcj02` 足以绑定实际产品；derivedAt 是**派生时间**，不是上游获取时间、cache hit 或每次请求开始时间。publication v4 proof 的 fixedWindow/cells/sourceSetSha256 可继续把组合窗追到实际 cells，无需新增 data feed 或全链路框架。

## root 的最小下一步：取回这一次的身份，不重发动作

先在刚成功读 task key 的**同一 project/目标**做一次官方缓存 Network 只读。现有入口为 `get_simulator_network`，参数如下；project 字符串必须保持当前成功调用的原始拼写，不能另开同 AppID 路径：

```json
{
  "project": "C:\\Users\\777\\AppData\\Local\\Temp\\starward-device-feedback-Fd7HTZ\\generation-000001-TBA9R6\\project",
  "command": "grep -n -F /v2/terrain/overlay"
}
```

可由已有 `tmp/wechat.mjs` 的 `call('get_simulator_network', args)` 执行；原 stdout/result 先存同一外部私有 archive，再输出摘要。该工具是只读缓存 grep，不保证真机请求已进入该缓存：先确认返回所属目标。空结果不证明没有请求；不要改成 `grep -n .`、Storage 扫描或反复调用。若只返回摘要而无 body，沿当前官方 Network 面板选择这**一条** terrain 请求，保存其 request/response 到同一私有目录即可，不转私有 CDP。

选定实际 200 / 314570 B / 相应约 2 s metadata 记录，私下保留完整 request bounds、URL、response 的 publicationId/imageSha256/derivedAt；将 API image 与其后同一资产请求对上。只把 hash、level、columns/rows、命中枚举及计时摘要写 Git。用既有 `normalizeTerrainOverlayRequest → terrainWindowViewport → terrainRequestKey` 从这条实请求推窗口，在**当前选定 inventory 和该资产自己的 proof**对 exact window / cells 做 readback。无需发一个“同 URL 暖请求”来冒充原冷请求，也不重新跑历史四目标测试。若旧记录已不在缓存，身份保持 unknown；在下次本就必要的代表动作前只准备这一路 Network 过滤。

已有服务计时不需重写：`miniapp-service.ts:697` 的 `terrain_raster_derived`、`:1110` 的 `terrain_metadata_read`（assetSha256/fixedWindow/sourceObjects）、`:1131` 的 `terrain_asset_read` 已进入 [`MemoryTelemetry`](../../../workers/miniapp-api/src/runtime.ts#L85)，上限 256、按顺序保留。metadata 用最终 image SHA；derived 事件对应 cell 的 SHA，需通过同一 window proof 的 cells 匹配，不能直接要求它等于组合窗 SHA。相同 hash 重用或同时活动仍须保关联范围，不假造 request id。

当前 HTTP **没有 Server-Timing**，metadata schema 也没有 prepared/cache HIT 字段。现有 `GET /v2/operations` 会返回 telemetry，但要求**当前服务 principal**；8798 public-only 桥不转该路由。没有现成的当前 8799 授权时，不拿 8791 session 代用、不新建账号、不放宽桥，只为取 telemetry 不重启当前服务。先完成 Network + 现有 proof 的身份匹配；它即可区分“发布窗缺项但 cells 已备”和“缺少实际 cells/版本”。若下一决定仍需 CPU/I/O 细分，在下次必要的服务准备中复用同一 `TelemetryPort.snapshot` 或已有 measured callback，窄导出这一资产/这些 cell 的现成字段；不要加每帧/全 payload 或通用 profiler。

分支条件：精确窗未发布但 cells 全命中，先量现有组合/写入而不是选 worker；实际缺格且对应派生事件显示 sourceReadWall 为主，先按原有限 publisher/声明准备所需产品而不是选 blocks；窗口已备且无派生却 metadata 仍慢，再查同一服务/HTTP读回与竞争。任一分支都不把本地暖读取替代手机缺口改善，不关闭真配准、完整细节、年度光害/动态云、iOS、资源回落或其他 Goal 义务。
