# 地形下一次必要动作：匿名同请求身份回执已准备，运行未启用

2026-10-19，按既有 PLAN 和 performance-investigation 方法，复用 [r6 等待](TERRAIN-R6-WAIT-RESULT.md)、[metadata owner](TERRAIN-METADATA-WAIT-OWNER.md)、[唯一缓存候选](TERRAIN-R6-ASSET-PATH-BINDING.md) 及原 7 行手机回执、24 文件缓存归档。本轮只有文件工作和本地纯函数/stream 检查，没有发 HTTP、操作手机/ADB/IDE、启动/重启服务、构建/预览、读取账号或修改生产源码/数据库。读取 HEAD `3818b44009d53d4b27cb16a95904c42ed3723af7`。状态为 **`TASK_RECEIPT_PREPARED__RUNTIME_UNVERIFIED`**；旧 r6 的实际 response → 候选关联仍 UNKNOWN。

## 文件范围与准确变化

新增 `scripts/r17-terrain-identity-receipt.mjs`、它的 focused test；只在 `tmp/r17-normal-phone-bridge.mjs` 加 helper import/instance、既有 terrain 分支收据和既有 health 的版本字段。完整 [接入前后差异](TERRAIN-HTTP-IDENTITY-BRIDGE.patch) 与机器摘要 [JSON](TERRAIN-HTTP-IDENTITY-RECEIPT.json) 保留供 root 审阅。没有改 HANDOFF、INDEX、PLAN 或 Context。

接入前原件是已冻结的 `a1-r6-terrain-wait-20261019/transport-source/r17-normal-phone-bridge.mjs`，实际重算 SHA 为 `ecbe111113ede6df21e2f1e41b1cd98ebfc534df5eb21dd8df760e8d72e6732d`；当前磁盘桥 SHA 为 `0e13eb90a30628fd8756aea8a7462d86923bbe645d6f899052276bdfc6b2d073`。它不是正在运行进程已经加载此修改的证明。

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `scripts/r17-terrain-identity-receipt.mjs` | 5731 | `57c48c85d65ecacda36dc620b87c866ff56bd4c709d235f9034467899628ae1d` |
| `scripts/r17-terrain-identity-receipt.test.mjs` | 6908 | `785698bb4feb7f78ca08224887d528d100848e2b3480accbe8fad5316adf6a2b` |
| `tmp/r17-normal-phone-bridge.mjs` | 8404 | `0e13eb90a30628fd8756aea8a7462d86923bbe645d6f899052276bdfc6b2d073` |
| `TERRAIN-HTTP-IDENTITY-BRIDGE.patch` | 5544 | `69328dc9b0ee62fc9bd794a2672d9614af10cba80e14d6d98d8bfce865d074d1` |

## 收集语义与限制

只在既有允许的 terrain metadata / asset GET、HEAD 分支加字段，仍使用原 `publicRequestBoundaries` **32 行完成回执 ring**；没有新 route、认证、磁盘 collector 或手机包探针。`terrainReceiptVersion` 为 `starward.task.terrain-http-identity.v1`，`receiptRunId` 为每次桥实例随机 UUID，`requestOrdinal` 为本实例 terrain 请求开始顺序；完成顺序可以不同，不能据数组位置重排因果。

- metadata 同一行的 `requestKeySha256` 来自真实收到的 query，按当前 Controller 相同输入结构及校验，再直接调用生产 `terrainWindowViewport → normalizeTerrainRequest → terrainRequestKey`。hash 算法为 **SHA-256(UTF-8 原 request key)**，与 proof 的 requestKey hash 口径相同；不存 query、坐标、半径或原始 key。重复/非法关键参数返回 `requestKeyState=UNKNOWN`，不能用它绑定产品。生产 owner 文件 SHA 为 `70b6d071a086ba167fc3b10701abc4c6b3e8462cee2f150cad82c01fff7ca96a`；仍需 root 保有当前 API 运行版本绑定。
- `imageSha256` 与 `imageBytes` 取**该次实际 metadata 响应**的声明字段，严格校验 hash/非负整数；不是从缓存候选猜填。`assetPathSha256` 为 SHA-256(UTF-8 `/v2/terrain/assets/` + decodeURIComponent 后文件名)，metadata 与 asset 请求按同一规则；不存含坐标文件名、URL、headers、body 或 publicationId。非法 path/hash 留 null；状态只出固定枚举。
- metadata 只读 response clone，诊断字节上限 **64 KiB**；超限出 `metadataReadState=OVER_LIMIT`，解析/流错误出 UNKNOWN，不保留 payload，也不改变原响应。这个上限只限制诊断读取，不是产品性能预算。原无限 `clone().json()` 已移除。
- asset 的 `responseBodySha256` 是 **SHA-256(该实际响应流字节)**，由同一 pipeline 中的 Transform 计算，逐 chunk 原样转发，不从 URL 后缀制造 hash、不整图缓冲。原 `pipeline` 背压、错误归属和 client-close → AbortController 保持。只有完整读完这一响应流才填 `responseHashState=COMPLETE_RESPONSE`；这还不证明是完整资源，必须同时要求 HTTP 200、非 HEAD、预期长度与 metadata hash 匹配。HEAD/非成功/中断不能当文件完整。
- 原 ring 仍仅记 `ServerResponse.finish`；未完成/取消请求可能没有行，不能从缺行推无请求。`elapsedMs` 仍为 host `performance.now` 到 bridge finish，`returnedAt` 仍为 host Date；不是手机收到字节、native 安装或可见覆盖时钟。新 hash stream 有小的观察开销，不能混成与旧样本无条件相同的计时基线。

这些事实能闭合**下一次实际 metadata 请求 → 声明的产品 key/image → 同路径完整 bridge asset 响应**。相同资产被多个 metadata 共享/并发时，只能保这些匹配，不能选“最近时间”假造哪一调用触发下载。它不能追认旧 r6 的 response 身份，也不能证明手机实际采用/呈现、source I/O/CPU 占比或资源退休。

## root 下一次本来必要动作的执行路径

1. 当前运行旧桥不热加载此文件。只在 root 本来需要的桥准备/容量轮换时，沿已有启动命令和 H3 origin file 启用此磁盘版本；本代理不执行。仍用现有 `node --import tsx` 路径，因为 helper 直接导入生产 TypeScript owner；不需安装依赖或修改 API。
2. 通过既有 `GET /__development_bridge_health` 保存一份**外部私有** before 回执，先确认 `terrainIdentityReceiptVersion=starward.task.terrain-http-identity.v1`。如果缺字段则当前进程仍未启用，不作带身份的性能结论。实际 origin 只在 root 已有私有 origin file 中使用，不输出 LAN/URL。
3. 下一次本来必要的地形代表操作沿 root 原守卫/录屏入口进行，保持显式候选与已有缓存条件，不为探针清账号/cache，也不重放旧动作。之后及时保存同 health 的 after 回执，避免 32 行正常环回。若动作没有 HTTP（query/file hit）或 ring 已溢出，身份保持缺失，不靠重录/加配额补成“通过”。
4. 在 before/after 相同 `receiptRunId` 范围内，找到实际 `terrain-overlay` GET/200、`metadataReadState=COMPLETE`、`requestKeyState=RESOLVED` 且 image/path hash 非空的行。以这一行的 key/image SHA 查对应 proof；用 proof 自己的生产 key 重新计算同算法 hash，二者均相等才绑定该次返回产品。
5. asset 必须为 GET/200、`responseHashState=COMPLETE_RESPONSE`，其 `assetPathSha256` 与该 metadata 一致，`responseBodySha256 === imageSha256` 且 `responseBodyBytes === imageBytes`。只保存必要匹配与例外；歧义留 UNKNOWN。原 r6 候选 `4ba6d68a…` 只有在**实际新响应**返回这一 hash 时才是这次新请求的产品，不反推旧请求。
6. 身份后续仍沿现有 `terrain_raster_derived / terrain_metadata_read / terrain_asset_read` owner：cell 与 window SHA 分清，用匹配 proof 的 cells 关联。受保护 MemoryTelemetry 无当前服务授权就保留缺口，不借8791、不放宽 public-only 桥、不为 telemetry 单独重启。请求数/字节/derivedAt 不能代替 CPU/I/O 计时；不因本收据直接选 blocks/prefetch/worker。

## 本地检查与 collector 容量边界

`node tools/run-node.cjs --import tsx --test .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-terrain-identity-receipt.test.mjs`：**6/6 通过**。覆盖生产 key 一致、同请求声明、并发倒序、隐私 allowlist、metadata 上限且原 body 可读、asset 逐字节/背压、上游错误及客户端关闭时不造完整 hash。`node tools/run-node.cjs --check …/tmp/r17-normal-phone-bridge.mjs`：exit 0。均为本地纯函数/stream 检查，没有启动 server；目标运行、手机影响和实际导出仍未验。

另外只读核对 `scripts/r17-phone-probe-collector.mjs`（SHA `28d156d5c25c73bc561761ae6fbdffc2e6a015ef7744e2db6f8ec001276124d9`）：实际 directory owner 是 bridge 的 `createR17PhoneProbeCollector('E:/Dev/Starward-data/verification/sky-map-20261018/probe-metrics')`，本次目录枚举为 **31 个 JSON 文件**。与上面的 HTTP 内存 ring 是不同容量。

现有 constructor 接受绝对目录；没有 CLI/env 轮换参数，当前 argv 只接受 H3 origin-file 参数。collector 串行、同名先读，相同 body 200/冲突409；terminal 要同目录 metrics 严格 match；新文件才检查 32 cap 并用 wx 写入。安全准备沿这个 owner 选择新的明确 run 目录，不加 cap、不删旧文件；root 先完整归档旧目录、保文件名/内容 hash 并处理 producer 退休。**现有实现没有跨目录去重**；仅切空目录不能宣称仍能识别旧 run 的冲突/重试。若旧 producer 仍可能写，root 需在原 collector 有限保留只读旧 owner 的查重，或先明确退休。此处仅告知，没有轮换、改 collector 或触碰账号。

地形完整细节/原生连续操作、年度光害/动态云、iOS、资源回落和其他 Goal 义务全部保留。
