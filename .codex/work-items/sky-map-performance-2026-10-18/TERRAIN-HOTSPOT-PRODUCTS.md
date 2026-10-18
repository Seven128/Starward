# 有限热点地形成品准备

2026-10-18。沿现有 `publish_fixed_terrain.mts`、`TerrainService`、固定地形 inventory/proof 责任完成本地候选；没有启动/重启服务、修改数据库、改变 r6 锁、操作手机或远端上传。

## 可接入的候选

- 只读成品目录：`E:/Dev/Starward-data/publications/terrain-hotspots-20261018`。27 个成品/证明/inventory 文件均已设置 Windows 文件只读属性；这是本地防误写措施，不冒称 ACL 或远端备份。
- 发布版本：`terrain-fixed:c84ef25094e6455c81003900636d08c515485258c3e5c884e19aa6b051908722`。
- `inventory.json` SHA-256：`f8903922eb14702d5de6325c903fac296bbc69d94019c9d7844ee03ac71ea774`。
- 13 个 current assets：9 格、4 个组合窗；全部原 7 项仍为 current，不需要把它们降为 retained。新增加 3 个 z12 格及 3 个组合窗。13 PNG 共 **1,524,944 B**，证明 **75,271 B**，inventory **5,547 B**，目录合计 **1,605,762 B**。
- 前一发布仅作为 `--previous` 输入：`E:/Dev/Starward-data/restores/r6-20261018/runtime/terrain`，版本 `terrain-fixed:8f4e8cbf344805fe65ec247f1b1d410f2ddedca97e18eccdeef9564bafa9dcd6`。其 15 个文件逐 SHA-256/文件数核对未变，原 7 个图片 URL 均从新候选逐字节读回原 PNG。

唯一完整资产清单仍是现有格式的 `inventory.json` 及其 hash-bound proofs；本文不是第二个发布清单。完整目标声明也在该 inventory 中。任务原始结构化观察在 `tmp/terrain-hotspot-products.json`，批量执行入口在 `tmp/terrain-hotspot-products.mts`；不作为运行时或测试依赖。

## 范围与细节

按不同机制选 4 个目标，没有展开方向/尺度矩阵。坐标均为已有深圳公开技术区域的 GCJ-02 测试声明。

| 目标 | 请求 west/south/east/north | 固定窗 key | 图像 | 派生间隔 |
| --- | --- | --- | --- | --- |
| 原粗档保留 | 113.95 / 22.52 / 114.2 / 22.8 | `11-1672-890-2-3` | 512×768；447,385 B | 70.6 m |
| 原约 4 km 细档 | 114.06 / 22.62 / 114.10 / 22.66 | `12-3345-1783-2-1` | 512×256；157,168 B | 35.3 m |
| 同级向东跨边界 | 114.14 / 22.62 / 114.18 / 22.66 | `12-3346-1783-2-1` | 512×256；157,464 B | 35.3 m |
| 约 2 km 窄视图及中间格 | 114.105 / 22.63 / 114.125 / 22.65 | `12-3346-1783-1-1` | 256×256；79,361 B | 35.3 m |

“更近视图”不是更细源档：现有 producer 最高 z12，原约 4 km 请求已达到该上限；约 2 km 请求复用 z12，不伪造 z13 或新增原始细节。粗档直接保留恢复的 z11 成品。新增 z12 实际格仅 `3345/1783`、`3346/1783`、`3347/1783`，全部位于原粗档实际范围内。

在同一公开 0.04°×0.04°矩形沿 longitude 114.08→114.16、latitude 22.64 的受控网格检查中，801 个相机输入只选择 `2×1 → 1×1 → 2×1` 这 3 个已准备窗口。另通过真实 `TerrainService` 读取三个代表位置的完整 4 km 宽请求，均命中已完成成品，源派生 0。此处是公开矩形/producer 机制检查；实际手机 `getRegion` 范围和持续手势仍须由 root 核对。

## 真实取源、完整性与质量

一次新目录准备耗时 **6,098 ms**，实际取得 **8** 个不同 Terrarium z12 源 PNG，总传输 **355,325 B**，无重复源请求；旧 z11 源请求 **0**。每个新源由正常 producer 验证 256×256、PNG CRC、完整 SHA-256、ETag 及实际 contributor header。新源 contributor 为既有许可 owner 接受的 SRTM/GMTED，未引入新的数据家族。合并旧资产后，成品证明共绑定 26 个不同源记录；旧记录复用原证明，不冒称本次重新获取。

每项最终 PNG/证明均通过 `readTerrainFixedAsset` 的真实完整性准入：图片尺寸/字节/hash、证明 hash、出版合同和来源均有效；全部 **100% valid pixels**、`sourceIssues=[]`、`unavailableSourceTiles=[]`。阴影 alpha 0 仍表示可透明的平坦/弱坡面，不据此当缺测。来源/修改/USGS 责任通知继续在证明内，Map Terrarium 没有冒用 Spot Copernicus DOI。

全部 4 个组合窗的 **720,896 个像素**逐 RGBA 核对其实际引用的小格，一字节不差；共享中间格保原样，不重新取样颜色。原约 4 km PNG 的 SHA `5941cec8fbe7eae568c08045351e4d9c362da579befb3a161c7ec1a3ccc6f406`、157,168 B 及来源集合 hash 与 [恢复后样本](RESTORED-TERRAIN-SAMPLE.json) 一致，没有用粗档或新样式换取更快响应。

已实际查看 4 个最终窗的 1:1 诊断接触图 `output/terrain-hotspot-20261018/actual-relief-contact-sheet.png`：左为旧粗档，右上/中/下为原细窗、东移窗及中间窄窗；仅把真实透明像素合成到 RGB245 背景以观察阴影，未改变成品。山脊/坡向可读，共享格连续，未见整格缺测条纹或直线拼缝。此图没有道路底图、原生安装或主题叠加，不能认证手机可读性、内部地理配准、测量精度或 native alpha/order。

## 从交互关键路径移出的工作

既有样本首次约 4 km HTTP 读取 **3,926 ms**、重复 **6 ms**；该历史样本仍保留，不重跑制造冷值。当前从新服务实例读取本地已完成产品的观察为：

| 目标 | metadata | PNG 本地读取 | 新源请求/派生 |
| --- | --- | --- | --- |
| 原粗档 | 2.10 ms | 1.50 ms | 0 |
| 原约 4 km | 1.42 ms | 1.12 ms | 0 |
| 跨边界窗 | 1.65 ms | 0.89 ms | 0 |
| 中间窄窗 | 1.21 ms | 0.68 ms | 0 |

每项 renderer 设为一旦调用即失败，实际全数未调用；最终文件仍走正常 proof/PNG 验证。以上是本地 final-product 文件读取，不是完整 HTTP、CDN、冷文件系统、手机网络、解码/原生安装、首幅可用/完整细节耗时，不能直接换算成相对 3,926 ms 的产品加速倍数。仍需传输同一个 157,168 B 的原细窗；成品准备没有扩大端侧缓存或降低细节。准备缓存实际 **1,675,486 B**，维持原 128 MiB owner 上限；本次没有云端采购或付费激活。

## Publisher 修复与验证

原 publisher 的 `--previous` 仅在最后复制时保留旧图，准备阶段不会复用上一发布；空 cache 会重新取得旧 z11 源。现已在同一 owner 内把需要的旧 current PNG/证明验证后种入缺失的 cache pointer，再沿原 `TerrainService` 准备/组合。已存在的 current cache pointer 保持优先，让明确准备的新源版本仍能成为 current；旧 URL 的保留、不可覆盖、证明稳定和 inventory-last 不变。previous 不可兼作 cache，避免向旧发布写 cache pointer。没有修改 workers 生产源码、客户端或共享包。

- 现有 publisher、fixed raster、viewport renderer 组合 **13/13**，零 skip，覆盖新版 current/旧 URL、共享读取取消、全局源名额、缓存中间格、halo 像素、部分失败及不可变重建。
- 新增空 cache + previous 的实际 publisher 回归把全局 fetch 设为失败：current/retained 及版本原样带入，fetch **0**；保护 previous/cache 不重合。隔离 HEAD 原 publisher 执行同一测试，在新情形因尝试源读取而报 `terrain_sources_failed`；未替换工作源。
- 最终 publisher 保留原 ASCII key 排序；同一实际候选用现有 cache/previous 重新准入，fetch **0**、inventory hash/版本不变，连同 3 个 4 km 拖动代表读取约 **157 ms**。首次生成和最后代码重放的 publisher SHA 分别留在原始观察中，没有把重放当第一次生成。
- 当前 API TypeScript 检查 exit 0；受影响 diff 空白检查通过。`data-pipelines/terrain/README.md` 补上该现有发布器的复用及激活边界。

本模块的代码仍需纳入 root 的独立审查/合批交付；这些测试不认证当前已运行的旧 API 或手机。

## Root 下一接入点

现有 local owner 已足够读取此候选：`runtime-config.ts` 的 `MINIAPP_TERRAIN_PUBLICATION_ROOT` → `MiniappService` → `TerrainService.publishedDirectory` → 同一 `terrain-fixed-publication.ts`；metadata 仍返回 `/v2/terrain/assets/<immutable-file>`，`controller.ts` 保留 PNG、`public, max-age=604800, immutable`、nosniff、`x-starward-terrain-publication`。root 可在其新建/自有服务的选定环境绑定本目录，沿原 metadata/PNG/原生确认链做同条件观察；本次没有修改任何正在运行的服务配置。

Map static adapter 尚未因此完成。`tools/deployment/sky-oss-client.mjs` 已有成熟 OSS 传输/禁止覆盖能力，`sky-object-store-*`、`sky-static-*` 现有封存/字节与 header 读回/恢复责任及 `project_context/deployment/decisions-and-verification.md` 是后续复用入口；它们当前采用 Sky 专用出版身份，不能直接冒当 Map 完成。应在现有发布/部署边界准入地图 inventory/proof 与对应公开 routes/headers，先核实际选定账号/域名/配额，再验证对象与回读、封存版本并发现/激活，保旧 URL/回滚；不另设第二份手工发布清单或部署体系。远端/CDN与实际 native 空缺时长、资源回落、iOS仍是原 PLAN 的独立未验义务。
