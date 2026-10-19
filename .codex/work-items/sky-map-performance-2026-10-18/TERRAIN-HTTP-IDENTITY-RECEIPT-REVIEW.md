# 地形 HTTP 身份回执独立审查

2026-10-19，独立文件审查结论：**本次版本未发现 P1/P2；`TASK_RECEIPT_PREPARED__RUNTIME_UNVERIFIED` 保持**。没有修改 helper、test、bridge、生产代码或 coordinator 文档；没有 HTTP、设备、ADB、IDE、服务、feedback、构建、预览或 Git 操作。本文只审查下列文件版本，不证明运行进程已加载它们，也不覆盖 root 随后的 collector/bridge 轮换修改。

## 审查版本与范围

完整读取 [准备说明](TERRAIN-HTTP-IDENTITY-RECEIPT.md)、[机器摘要](TERRAIN-HTTP-IDENTITY-RECEIPT.json)、完整 [bridge patch](TERRAIN-HTTP-IDENTITY-BRIDGE.patch)、helper/test 和实际 bridge。对照当前 `workers/miniapp-api/src/terrain-request.ts` 全文及 Controller 的 terrain query/asset/cancellation 分支、TerrainService 的 publication/resolve/asset 路径、MiniappService 的实际 metadata envelope 与 asset 响应字段。读取并遵循 development skill 的 performance-investigation 方法与 performance measurement boundaries。

| 审查对象 | bytes | SHA-256 |
| --- | ---: | --- |
| `TERRAIN-HTTP-IDENTITY-RECEIPT.md` | 9142 | `e14f34cf462835ee905088e0f6d9bb19b5a1c583f28c9aa0596cd066c8ddc49c` |
| `TERRAIN-HTTP-IDENTITY-RECEIPT.json` | 3971 | `2b707350331b4f5536576563d2a1e7c2f2319180c81f4793b98a4251e244e2b0` |
| `TERRAIN-HTTP-IDENTITY-BRIDGE.patch` | 5544 | `69328dc9b0ee62fc9bd794a2672d9614af10cba80e14d6d98d8bfce865d074d1` |
| `scripts/r17-terrain-identity-receipt.mjs` | 5731 | `57c48c85d65ecacda36dc620b87c866ff56bd4c709d235f9034467899628ae1d` |
| `scripts/r17-terrain-identity-receipt.test.mjs` | 6908 | `785698bb4feb7f78ca08224887d528d100848e2b3480accbe8fad5316adf6a2b` |
| `tmp/r17-normal-phone-bridge.mjs` | 8404 | `0e13eb90a30628fd8756aea8a7462d86923bbe645d6f899052276bdfc6b2d073` |

冻结的 r6 bridge 原件重新计算为 8382 bytes / `ecbe111113ede6df21e2f1e41b1cd98ebfc534df5eb21dd8df760e8d72e6732d`。生产 key owner SHA 为 `70b6d071a086ba167fc3b10701abc4c6b3e8462cee2f150cad82c01fff7ca96a`；Controller `c6e6a7bfdd7d8a8f9f7375a89adfb376612ccc57b2556775ca898705e00c05fe`，TerrainService `f6751be073ac068407067185a7903e62121ff51d7e43bc05ce3d33ab05889370`，MiniappService `c1907caf5ad0e0e6a781b2fd2309f99c0742d3fac584833b50a77a75c8e023e7`。这些磁盘事实不代替当前 API 运行版本绑定。

## 关键结论

- **归一化身份正确且保守。** 当前 Controller 的 purpose/center/radius/viewport 解析与校验顺序得到保留；helper 直接复用生产 `validateTerrainRequest → terrainWindowViewport（viewport 情形）→ normalizeTerrainRequest → terrainRequestKey`。重复关键 query 明确 UNKNOWN，比接受歧义更保守。实际 MAP window key 可按同算法与对应 proof 核对；不会从旧缓存候选或 URL 后缀猜填 image SHA。SPOT 的生产 bundled-publication 快捷路径可能没有相同的请求 key；其 proof 不匹配时继续 UNKNOWN，不能据请求 hash 单独宣称绑定。
- **同请求与并发归属明确。** `responseFacts` 是每个 HTTP handler 的局部值；metadata 扩展自己的 facts，asset Transform 只修改自己的 facts。实例 UUID 加开始顺序 ordinal 不依赖完成顺序，ring 按 finish 记录也不会把后完成的数据嫁接到另一请求。共享同一 asset 的多个 metadata 仍然只有 key/image/path 的匹配关系，没有“最近一条 metadata 触发下载”的证据。
- **metadata 读取有诊断上限。** 仅消费 clone；累计超过 64 KiB 即放弃解析，状态为 OVER_LIMIT，流/JSON 错误为 UNKNOWN。cancel promise 不被 await，避免 tee 的未消费原分支阻塞诊断结束。上限是诊断 payload 读取边界，不是整个进程内存上限：原响应的 tee 缓冲、单个原始 chunk 和 JSON/Buffer 的临时内存不能算作最多 64 KiB。bridge 仍会等待诊断读取后才转发 metadata，计时包含该观察成本；这与手机性能改进是不同事实。
- **asset hash 与实际转发流一致。** Transform 逐 chunk 更新 SHA 并原样交给同一 pipeline，保留 Node stream 背压与错误销毁语义，没有整图积存。上游错误或未读到尾部的取消不会产生完整 hash。flush 标记的是完整读到该响应流；若下游 pipeline 在 finish 前失败，不会因此得到一条 finish 行；finish 后的网络/手机失败仍不在此观察范围。即使出现 COMPLETE_RESPONSE，也必须同时用 GET/200、同 path hash、metadata image SHA 和字节数匹配核对，不能把 206、HEAD 或完整错误页当完整地形资源。
- **边界未放宽。** 完整 patch 没有改变 publicPath、允许方法、contextWrite、敏感 header 过滤、H3/media 或 probe collector 的政策，也没有新增 route/认证能力。新增 health 字段只给出固定版本。新增 facts 只包含固定状态、数值、UUID/ordinal 与 SHA；不保留 URL、query、原始 key、坐标、publicationId、headers、body 或异常文本。
- **证据范围没有越级。** ring 仍只记录 `ServerResponse.finish`，取消请求可能没有行；32 行仍可能覆盖旧事实。bridge 完成与 hash 完成不证明手机收到、文件安装、native 覆盖、首个有用画面或资源退休。当前实现不能追认旧 r6，也不能凭这些 hash 决定 blocks/prefetch/worker 或划分 source I/O/CPU。

## 实际检查

运行现有命令：

```text
node tools/run-node.cjs --import tsx --test .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-terrain-identity-receipt.test.mjs
```

**6 tests / 6 passed / 0 failed**，覆盖生产 key、同响应声明、倒序并发、隐私 allowlist、metadata 超限原 body、asset 字节/背压、源错误、客户端关闭与 HEAD/非成功状态。`node tools/run-node.cjs --check .../tmp/r17-normal-phone-bridge.mjs` exit 0。

另外仅执行一个本地内存 fixture（未新建长期测试文件、未起 server）：对 65537 bytes 的 Response 先 await 超限 metadata 诊断，原 body 此时尚未开始消费；诊断正常返回 OVER_LIMIT，随后原 body 仍读取到全部 65537 bytes。它补足现有测试同时消费原 body 的范围，确认 cancel promise 不会等待原消费者。1500 ms 只是该 fixture 的失败退出保护，不是产品时延预算。

未增加测试矩阵或框架。下一步仍由 root 在本来必要的 bridge 准备/轮换时启用，保存版本确认及真实动作的 before/after 私有回执；运行与手机效果继续未验。完整 Goal 的其他义务保持。
