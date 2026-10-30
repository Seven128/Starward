# EOG prepared 分片与坐标 reader

本轮执行唯一 PLAN P2 的“既有能力接通”。Root 批准共享 sharded 准入与按 key/坐标读取责任，未授权本模块挂接新 DB/schema-3 激活、修改原 publisher 事务或提供新正式 URL。当前实现只是原准备与后续发布/Service 可共用的 prepared descriptor；`PREPARED_ONLY` 不表示 `PUBLISHED`、全国覆盖、OSS ready 或现用 API 已切换。

## 当前实现

- 新 `workers/miniapp-api/src/night-light-sharded-publication.ts` 读取既有 `starward-sharded-nightlight-index-v1`/`starward-sharded-nightlight-assets-v1`，不新造索引格式。显式 pin 为 root 文件大小与 SHA；验证 root 内容版本、源/政策、part/LOD/shard 描述和总数。根内只有原 part/shard 索引，不创建全国 proof 或 asset 数组。
- `window(key)` 以原 `zoom/floor(x/16)/floor(y/16)` 直接读取需要的一个 shard 与该 asset 的原 proof、预制 contrast proof；不读取各 part 的 inventory、其它 shard/proof、数值或图片。所需文件的路径、类型、大小、完整 hash、source/part/window/六 band 与 display 身份均准入。缺索引/缺 key 是未发布；已声明文件缺失、损坏或跨身份引用是失败，不能回零、替换文件或扫描旧库存。
- `pixel(point)` 每个声明 LOD 只计算一个 fixed-cell key，从细到粗发现已准备的 cell；选中后复用 `readFixedNightLightPixel`，完整读取/哈希一个有界压缩 cell TIFF并复制ArrayBuffer，再向GeoTIFF reader请求单像元六band window；这不是byte-range I/O，也没有证明物理解码仅为一个像元。不存在全源 TIFF 或全国数值读取，不扫描全部 assets。保持真实零、NaN/缺测、质量和面积比例；不以粗图值替换有资格细图，不在 fine 质量不足时改取另一个统计支持。
- `display(key)` 只读取实际预制 contrast PNG 并校验完整 hash/PNG header/尺寸，不在请求路径解码、改色、拼图或编码。完整 PNG CRC/像素资格仍属于准备/发布阶段，本次只读核验另见下方。没有构造图片 URL。
- 原 `night-light-publication.ts` 提取 `validateFixedNightLightProof`，原 reader 仍先校验完整文件身份再调用同一科学/投影校验。新分片 reader 复用该函数及同一六 band reader；不复制质量规则或放宽 v2/v3 proof。null proof 明确拒绝。
- 原 `night-light-display-image.ts` 提取 `nightLightContrastView`，原 producer 和 prepared reader 共用同一个纯 metadata/identity owner。图片生成、配色、原 proof 与 PNG 字节规则保持。
- 生命周期持有一个不可变 root pin；逐调用取消不取消其它消费者的 root 发现，close 取消本 owner 且禁止复活。相同 pin 的文件恢复后可重读失败 shard，没有 latest 或隐式旧版回退。未来 Service 接入仍须沿其现有二进制/元数据准入预算，不以这个 prepared helper 另起队列或放大并发。
- v1 root 内部版本由原 Python `canonical_json` 生成；新 reader 使用 Node 24 的 JSON primitive source/`JSON.rawJSON` 保留原字符串与数字 token，再按原成员排序核内容摘要，仅从顶层对象去掉唯一 `indexVersion`。JSON-aware 成员扫描拒绝重复字段，不用 regex 删字段/空白或另写浮点 formatter。实际原 formatter 生成的合成 `113.0` fixture 修前被 JS 重序列化错误拒绝、修后通过，同时包含引号/逗号/花括号/中文字符串与重复成员拒绝；未重产任何真实 root。fixture 为 `workers/miniapp-api/src/test-fixtures/eog-sharded-python-canonical-root.json`，SHA `58b4f2ac967b734ba1442f99699d8836a23fc5273589dcfaf7cb28d68ad406fc`。

## 与现用 Spot/地图的明确边界

`NightLightService.pixel` 是投影地图像元查询，当前没有实际 BFF caller。正式 Spot 的 `lightPollution` 继续由 `publish_eog_viirs.py` 在原 DB 事务内，以 WGS84 原始 3×3 像元的物理面积加权分位数生成并提交 spot revision。两者统计支持不同；本模块不拿 projected pixel 替代 Spot 分位数。

本轮未修改 `NightLightService.release/layer/asset`、数据库 repository、runtime 配置或 HTTP 路由；它们当前仍消费原 r6/schema-2。后续须由原 publisher 完成多 part/源原件资格、Spot 数值和 DB 权威绑定，再让 Service 由真实发布记录选择 root pin；源完整 hash 仍按原发布器核验，本轮不重哈 17.42GB 原件。旧 r6、原件及旧 URL 没有重写或删除。

## 检查与真实只读接线

受影响 Node 检查最终 **17/17** 通过：新增 6 项分片/成品/原 Python canonical 边界，原 window/display 10 项，以及 v3 proof 1 项。新 fixture 故意不提供其它 shard、part inventory、原 PNG 和数值文件，已选窗口仍能发现；覆盖未发布与损坏/已声明缺失、同 pin 恢复、重哈 metadata 不能跨 part/numeric/display、null proof、错误 pin/path/key、取消及 close、现成 PNG 读回。第一轮一项 fixture 预期写成后置 root 错误码，但 `../` 实际先触发 descriptor guard；仅纠正测试断言并补合法相对路径的错误 root 名称，未修改产品路径准入。

执行入口：

```text
node tools/run-node.cjs --import tsx --test workers/miniapp-api/src/night-light-sharded-publication.test.ts workers/miniapp-api/src/night-light-window.test.ts workers/miniapp-api/src/night-light-chunk-proof.test.ts
npm run typecheck -w @starward/miniapp-api -- --pretty false
```

API noEmit 已通过。首次误用 `run-node --bin tsc` 只是在加载前找不到包，后续改走 workspace 原有 typecheck；没有安装依赖、启动 API 或构建产品。

真实只读输入复用 [原 pilot](EOG-NATIONWIDE-BATCH-20261028.md) 与 [canonical v3 单 cell](EOG-REAL-PREPARER-20261028.md)。最终证据为 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/coordinate-reader-20261028/readback-qualified.json`，SHA `a9f540307766e1f2efa80a0c345d393d4569f7a17fcf5b8534f8705030667253`；同目录 `readback.mts` 是有限批次读回入口。root 原 SHA 分别仍为 `15fa42d4d49f32ca6bc310d05599f763e49c94a2968d75945a79d0e3e929c373` 与 `97e18cdfc08e73d9a888a4c35d0ee1693fd6fa970e00ee4068d5804f718953c0`。

- 原 25 个 pilot 和 1 个 canonical window 全部实际通过 prepared reader。所有现成 contrast proof 与共享 helper 得到的 publication/identity 相同；PNG 完整 hash、CRC、尺寸与有效 alpha-mask 计数匹配原 proof。没有重新生成任何真实产品。
- 两个真实空间分区的 12 个代表坐标点覆盖实际 fine/coarse LOD、quality 1/2/5、有效零/正值及未发布像元；另 canonical 2 点覆盖零/正值。新坐标发现选中的 publication 正确，六 band 数值与同一实际 TIFF 中的独立读回逐值完全相同。未把不同 LOD/支持的数值强行比较。
- 原数据中的相邻 cell 和跨 shard 边界分别从两侧点实际读回，各自命中对应 publication；索引外坐标返回未发布。pilot 未出现 quality 3/4/6，canonical 未出现 2/3/4/5/6，不能把这些真实数据冒充全部质量机制。
- 最终读回前后四份 affected owner 的源码 SHA 保持，记录在 receipt；原 root 内容 SHA 保持。早先较窄读回及其 harness snapshot 保留，最终 receipt 补齐 coarse/两个分区/纵向跨 shard 控制点，没有覆盖旧记录。

这些是本机有限数据/服务责任的读回证据，不是请求吞吐或目标手机速度/内存测量。没有读取全源原件、源生产、DB 写入、worker、Git 操作、API/config 切换、OSS 上传、部署或设备操作。

## 仍须接续

下方记录本模块的全新独审结果，由 Root 接续采用。原 publisher 的多 part 源/Spot/DB 原子发布、实际 schema-3 authority/Service 接线、全国 LOD/固定窗口与完整覆盖、原静态 owner 的新可定位 URL/OSS 成品读回，以及客户端/目标显示与资源回落均未完成。离线文件或本地 reader 通过不能解除这些义务，完整 Goal 保持 active。

## 全新独立只读审阅

`review_eog_coordinate_reader` 完整读回新reader/test、原Python `prepare_index/read_window/canonical_json`、共享proof/pixel/display owner及真实当前产物。独立复跑原受影响组 **17/17通过**；原Python113.0/字符串与重复字段、缺失/损坏/恢复、pin/路径/取消/close及原window/display/v3 proof边界均保持。未发现本轮代码的阻断差异。

独立有限读回使用新脚本与新owned目录 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/coordinate-reader-review-20261028/`，没有重跑producer。实际两根索引、26个PNG/proof/contrast身份与完整CRC/alpha计数通过；14个代表点分别经文件GeoTIFF单窗口直接读回核六band及publication，包含实际零/正值与quality1/2/5，未把未出现的quality3/4/6冒真实证据。另沿旧23 bundle保存的原PUBLISHED记录，以原 `readFixedNightLightInventory/Proof` 实际重开r6首/中/末三份代表proof，全部保原dataset/schema/六band。四份owner源码及两根索引hash前后不变。

独立结果为 `independent-readback.json`，SHA `9323e150e53360bbf769ac2c59e87289320ceb9bcd3da32db95fa5c56b38cfe1`。此独审只覆盖prepared reader及共享提取，未接DB/Service/HTTP/URL，没有读取17.42GB原件、重产、上传、设备或shared service操作。当前cell级完整encoded读取和临时ArrayBuffer仍需后续Service沿原二进制准入预算测量，独立读回不证明请求容量或整机内存；也不代原Spot WGS84 3×3统计、全国产品及正式发布。
