# Map 静态分发 adapter 与 publisher 独审

2026-10-18。沿唯一 PLAN 的静态分发责任实施；没有修改 Mini Program、共享 packages、API 当前源码或 runtime lock，没有写远端、改变 Drive 权限、采购、重启既有服务、操作手机/Browser/DevTools。根代理独占其现有服务和手机。本文是任务证据，完整源资产清单继续由既有 publication inventory/proof 持有；衍生静态 index/OSS plan 均由程序生成。

## Publisher 的独立复核

本代理没有编写 `publish_fixed_terrain.mts` 的 previous 复用改动。独审确认它先从 previous 的 current entry 验证 PNG/证明并仅种入缺失的 cache pointer，已有 current pointer 保持优先；最终按空间 key 选 current、按 immutable filename 保留旧版本，旧证明原字节复用，inventory 最后写入。未将旧 r6 当 cache 或重建已恢复资料。

发现并报告 P2：初版仅拒绝 output/cache/previous 完全相同路径，仍允许 cache/output 落在 previous 子目录，可能向声称不可变的上一发布写入。root 已修为先解析各路径的存在祖先 realpath，再拒绝任意双向祖先重叠；缺失尾段和 junction 也不能绕过。独立复核确认检查在 mkdir/TerrainService 前执行，解决此边界；root 的真实 previous 子目录、junction、反向父目录回归通过并核 previous 文件不变。正式候选目录彼此独立，未受此问题影响。

本代理通过原 `readTerrainFixedInventory/readTerrainFixedAsset` 实际读取 13 项候选，版本为 `terrain-fixed:c84ef25094e6455c81003900636d08c515485258c3e5c884e19aa6b051908722`，PNG 共 1,524,944 B。仍需把本文件的最终全旧 URL 读回状态与既有 [热点成品证据](TERRAIN-HOTSPOT-PRODUCTS.md) 分开解释。

## 已实现的边界

- `map-publication-inputs.mjs` 复用真实 terrain 和年度 night-light inventory/proof/PNG validator。night-light 另外要求既有 repository 合同的 PUBLISHED 公开记录，拒绝私有行/未知顶层字段；不从输入 manifest 猜 DB 出版状态。原 bounds、LOD、辐亮度/质量、来源/权利/署名合同保留。
- `map-static-bundle.mjs` 从这些 owner 派生 Map 独立身份的 sealed index、控制资料和 Caddy 片段；保原 `/v2/terrain/assets/`、`/v2/night-light/assets/` URL、PNG、7 天 immutable、nosniff、家族 publication header。previous 并集拒绝 URL 字节/头冲突，失败暂存保留，成功只晋升新目录。独立发现/恢复要求精确 publication hash；恢复仅恢复静态 artifact，不恢复科学 TIFF、数据库或 live current。
- 有限热点 light windows 直接复用选定 terrain inventory 的 `targets`，由原 `nightLightWindowForBounds/composeNightLightWindow` 离线准备。它保持原 viewport URL、数值/质量摘要及未发布范围，不创造新 numerical publication；同一声明按批处理，不逐点建手工清单。验证会从原 admitted cells 重组核对，图片拷贝不积累整个 publication 的像素/PNG 内存。
- `map-object-store-package.mjs` 由 sealed artifact 生成不可覆盖对象计划、Content-MD5、SHA/metadata、原路径 key 和 origin-to-ESA header 配置输入。所有对象都限于两类公开 PNG；控制 inventory/proof、科学 TIFF、原源、账号/投稿/密钥不作为对象上传。
- `object-store-immutable.mjs` 提取原 Sky uploader 的同一版本状态、HEAD+GET、单次 forbid-overwrite PUT、冲突/丢失响应精确读回责任；Sky 原 OCI lease、目标和 journal 不变。Map uploader 复用这段状态机及原 pinned `ali-oss` client，使用 Map 身份和独立 append-only journal，不借用 Sky 发布身份。只在明确单独调用时写入；本次只向 loopback SDK oracle 执行 fixture PUT。
- `map-object-store-verification.mjs` 复用既有 15 秒绝对 deadline 的 bounded HTTP transport，完整 GET 验 hash/头，按 terrain/light 机制验 HEAD、Range 及 ETag/空体 304；不携 credential/preview header、不转到 API。operator 使用和边界已写到 `infrastructure/deployment/README.md`。

准入/读回/上传命令需要完整且 locked-install 的 operator checkout，以现有 `tsx` 直接复用原 TS publication owners；当前远端 staging/production control tar 仅携带 deployment controls，不含 workers/packages 源和该依赖，尚不能当作新 Map operator checkout。本次没有扩大控制包或接入自动远端 release。静态 Caddy/OSS 服务只消费 sealed bytes，无 TS 依赖。

## 真实封存与来源绑定

仅从 root 指定的恢复配置在进程内读取 DB 连接；使用 localhost:55432 的 REPEATABLE READ READ ONLY 事务和既有 published-dataset 查询，只取选定公开 dataset 合同，验证其 inventory SHA 与 current lock 一致。未输出 DSN、配置全文或私有表，未改 DB。公开合同在任务 `tmp/map-static-published-record.json`，不进产品源码或第二个事实源。

原 r6 年度夜光 509 PNG 共 **1,004,710 B**；科学数值 TIFF 不在静态对象中。先准备原 522 URL 的基础导出，再以同一 4 个 terrain targets 准备热点窗口。4 个目标只有 2 个额外非精确 cell window，其余复用已有 fixed PNG。

当前热点 artifact：

| 项目 | 实际值 |
| --- | --- |
| 目录 | `E:/Dev/Starward-data/publications/map-static-hotspots-20261018/publication` |
| Map publication hash | `89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0` |
| 公开对象 | **524 PNG / 2,546,488 B**，13 terrain、509 原 light、2 composed light window |
| 全目录 logical size | **1,577 files / 9,865,817 B**，含控制资料及 publication/HTTP 两种布局拷贝；不是物理独占分配或目标主机容量 |
| OSS package | `E:/Dev/Starward-data/publications/map-static-hotspots-oss-20261018/package`；1 个 plan，602,284 B |
| package SHA | `cd62afb0dc898a9616df28e9ca4814cddfd35f63a8e852d1f71e3c2fd0c90c6e` |
| origin | `https://map-assets.example.invalid`，明确保留示例域，仅本地计划，非已选定 live domain |
| 原年度版本 | `nightlight-fixed:3f659ee77d499b3aecc8cb67bba2f94bdfee1cd1765282c7f153b49dafd39dfe` |

基础 artifact 仍保留在 `E:/Dev/Starward-data/publications/map-static-20261018/publication`，522 PNG / 2,529,654 B，hash `06a3c72f720d1abfca6702c493de5afb3e63f31cec78ab5faafe458029c85e48`。没有覆盖任一已有成品或 r6。准备/完整性验证不是发布、远端备份、live current 或手机可见性。

## 检查与当前运行态

相关部署检查 **55/55 pass，零 skip**：Map 原 validator/seal/旧 URL 并集/fresh isolated restore、自洽重哈希篡改拒绝、有限 window 与真实 NightLightService 的 metadata/PNG 完全相同、Map 真实 pinned SDK 的冷写/暖恢复/丢失响应/冲突拒绝，以及原 Sky package/upload/HTTP/SDK 受影响集合。原 helper 提取前后的独立 32/35 项检查也通过；最终集合足够，不继续扩展历史矩阵。

本机缓存 Caddy 镜像 `sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648` 已实际 `caddy validate` 通过生成片段。root 明确授权独立短诊断容器 `starward-map-static-readback-20261018`，只读挂载新 artifact，随机 loopback 端口 **62514**，无新镜像拉取，不操作任何既有容器。首启 cap-drop ALL 与镜像二进制 NET_BIND_SERVICE file capability 冲突而 exec 拒绝，已退役；重建仅保留该 capability，并保持 read-only/no-new-privileges。

**最终本地 HTTP 合同通过，原失败保留。** 首轮在多套测试/build 同时运行时触发原 15 秒绝对 deadline；该轮没有完整通过回执，也没有记录到 exact request index，因此失败请求身份/数量未知，不能推断纯粹由并发导致。第二轮刚启动时收到 root 要求等 IO 结束的消息，已精确停止本代理读回 Node child，尚无 HTTP_PROGRESS 输出；它是中止，不能计通过或再次 timeout。

root 确认所有测试/build、EOG 17GB 解包/hash 和传输结束后，最后只按原 deadline 做一次顺序读回，未延长超时、改变内容或降低完整性：

| 已观察项 | 实际结果 |
| --- | --- |
| 完整 GET | **524 / 2,546,488 B**，每项精确 PNG、SHA 和四个原响应头匹配 |
| 机制代表 | terrain/light 各 **1 HEAD、1 Range、1 ETag 空体304**；GET/HEAD/Range 验精确响应头，304 验同 ETag/空体 |
| 注册请求总计 | **530**；实际 body **2,546,520 B**，含两个16B范围；不是协议总量/账单流量 |
| 旧兼容 | 基础 artifact 的 **522** URL 字节/头不变；原 r6 **7** terrain PNG 完整 SHA/字节不变 |
| 真实消费者对照 | 原 NightLightService 的 **4** 目标 metadata 与实际 sealed URL/图片 hash/bytes/publicationId 匹配，含 **2** composed window |
| 控制资料/未知路由 | **4** 个请求全404，不暴露 sealed index/proofs 或其他路由 |
| 激活/远端写 | **0**，此 HTTPS 示例 origin 只在本地 fetch adapter 映射到真实 loopback HTTP Caddy |

原始实际读回在任务 `tmp/map-static-readback-result.json`；历史失败在本文及 `tmp/map-static-readback-failure.json`。这证明 Linux Caddy 的实际 route/byte/header 合同，不是域名 TLS、远端/ESA/CDN、cache hit、手机或性能通过。Windows/Docker bind 顺序全量读回较慢，本轮未拿它作吞吐或 native 空缺时长样本。

实际服务容器 ID `f223c4070d780540d1ea20899f728965b086b3fcb44a67543d0e62a7113dfb18` 已核对完整 ID/名称/镜像后停止并删除，`docker ps -a --filter id=<id>` 空，loopback **62514 listener=0**；首启失败容器此前已移除。所有本代理测试/读回进程已结束，没有改动原 8787/8791/8794/8795/8796 或既有容器。root 已收到 IO 结束回执，可以进行其手机严格采样。

## API 接入点与未完成项

`discoverMapStaticBundle` 现在直接给出每个源的 `metadataDirectory`，由 sealed source 声明派生，不维护第二手工索引。为了 root 接入，任务 `tmp/map-static-prepared-windows.json` 已自动从 sealed index 导出两项 window 的 `proofPath/proofSha256/route/proof` 和原 `inventoryPath/publishedRecordPath/displayWindowTargets`；它只是诊断导出，不是运行时依赖或出版 authority。

window proof 是原 `NightLightView`：`publicationId/methodVersion/styleVersion/statistic/grid.window/grid.width/grid.height/grid.boundsGcj02/image/quality`。API 在既有 NightLightService 责任内：先绑定 DB 当前 dataset、`payload.rasterInventory.sha256` 与原出版版本，按原 `displayRasterWindowKey` 命中已完成窗口，再返回同一 metadata；未知 window 保留原兼容路径。不能把此 image-only proof 当 numeric proof 或改变 spot 统计。本 adapter 接入前 metadata 路径仍会 compose window；静态 URL 准备本身没有移除这段成本。后续 consumer 源码及具体运行服务的应用证据由 root/该 API owner 持有，本代理未改 API。

实际 OSS/ESA target 尚未确认。只读检查发现本进程无 OSS/ESA 绑定配置，GitHub staging 无 OSS/ESA/static/resource/bucket/domain 相关变量名，且无 OSS/ESA Secret 名；这不能证明用户没有阿里云账号或资源。本代理按范围未操作 Browser/console，未声称账号权益/域名/配额已成立。后续须由现有授权访问查明具体账号、bucket/region、never-enabled versioning、可用额度、域名/ESA及 header 编译/不变字节配置，再决定远端写入。没有新付费、权限扩展或生产激活。

随后 root 将 `map-static-bundle.mjs` 的纯 manifest/index/source identity 准入 ownership 窄移交给 `nightlight_prepared_consumer`，抽到 runtime `map-static-manifest.ts` 并仍由既有 tsImport 复用，要求封存格式/已有产物不变。本代理不再改该文件或跑它的测试；上述55项是提取前的历史执行事实。root 已报告 consumer 的27项/tsc与两项真实 PNG 本地 reader 读回，详情由该 owner 持有，不重复记为本代理独测。fresh `map_publication_consumer_review` 正在独审共同边界。

后续 root 已合批 consumer 并配置当前8796 API，沿既有环境mapper接上原r6和实际恢复DB；四个目标的八项地形/夜光 metadata与PNG均匹配封存身份和不可变headers，见[NIGHTLIGHT-PREPARED-CONSUMER](NIGHTLIGHT-PREPARED-CONSUMER.md)与[当前运行态](MAP-CURRENT-RUNTIME-CHECK.json)。fresh独审实际读一个窗口、原6个proof并禁用encoder仍成功，见[R17-INDEPENDENT-REVIEW](R17-INDEPENDENT-REVIEW.md)。真实object/ESA/TLS/缓存/回滚及native/容量仍保持各自未验边界。本代理的publisher独审不能替代别人对本代理新增代码的独立审查。本文不宣布整个Goal完成。

## 2026-10-20 实际目标入口与剩余接线

一次新鲜独立只读审计复核现有 Map 封存、对象计划/不可覆盖上传、恢复与真实 prepared-window 消费者，未发现可在缺少实际目标时补齐的必需本地边界。现有完整读回继续复用，不重跑同一 HTTP/恢复批次。[Map 图片地址](../../../apps/wechat-miniapp/src/services/map-raster-files.ts)仍由 API origin 派生；独立 Sky resource origin 不覆盖 Map。Map adapter 也未接入远端 release activation/rollback，不能把准备成功记为云端已上线。

root 随后仅核现有授权入口：既有 Chrome 没有阿里云标签；新建一个任务自有标签打开官方 OSS 控制台，导航等待超时后只读同一 handle，实际显示登录表单而非 Bucket 控制台，没有提交登录、短信或创建资源。该临时标签已关闭，原 TCR 与终端标签均保留。对本机固定入口的存在性检查：aliyun/ossutil CLI、用户目录下两个默认配置文件，以及五个明确 OSS 环境键均未出现；没有读取凭据内容、列出其它账号或全盘搜索。这只证明这些入口当前不可直接使用，不能推成用户没有账号/资源。

下一实施仍先取得已授权账号的实际 bucket/region、never-enabled versioning、限定身份/额度和域名/ESA路由事实，再按既有 owner 决定同域路径分流或 Map origin 与未知窗口兼容 API，完成实际上传/读回及发布恢复绑定。不新增未选中的配置分支、虚构 target 或购买资源，也不要求用户现在登录。该资格变化后再重开；当前 source/API兼容路径和全部设备性能义务保持。
