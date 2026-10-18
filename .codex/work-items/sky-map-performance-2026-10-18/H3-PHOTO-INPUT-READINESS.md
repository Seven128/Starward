# H3 真实照片输入准备

2026-10-18；只读调查与任务输入准备。未改生产代码、数据库、服务、手机、PLAN、INDEX 或 HANDOFF，未扫描用户相册或私人目录。原有真北360方向、20km COG、许可手机证据继续复用；本次不重做。

## 结论

已经取得一份有**真实原始拍摄时间、原始时区及真北拍摄方位**的公开现场照片。它来自现有 Commons 来源，不需要用户提供照片或另找供应商。原文件已下载、按 Commons SHA-1 核对并实看；当前尚未采用、发布或进入手机产品，H3 正值的目标运行验证仍未完成。

选定对象是万宜水库东坝小巴总站的历史地面照片，不是当前深圳测试点的现场图。现有 `spot:hk-high-island` 是水库的 OSM relation/几何中心记录；照片位置在东坝小巴总站，不能把两者当成同一精确拍摄点，也不能由此推断当前班次、停车、进入许可或安全。现有 catalog 该点仍是 `DATA_INSUFFICIENT`，本输入不补足其正式发布资格。

## 可直接复用的输入

- [Commons 原始出处](https://commons.wikimedia.org/wiki/File:East_Dam_of_High_Island_Reservoir_minibus_terminus_02-05-2025.jpg)，作者 **LN9267**，**CC BY-SA 4.0**；[许可](https://creativecommons.org/licenses/by-sa/4.0/)。读取时页面 revision **1222445216**（2026-05-29T20:31:00Z）。来源说明明确照片在万宜水库东坝拍摄。
- 原 JPEG **4032×3024，3,050,409 bytes**。Commons SHA-1 `f330487184dc5170db52b22f0a6e491d6e45d67c`，本地读回一致；SHA-256 `84c3ac48ee8d54541e4e24fe0232890e970f21938de766d56541513e5191fc84`。
- 原始 EXIF `DateTimeOriginal=2025:05:02 16:57:53`、`OffsetTimeOriginal=+08:00`。因此产品候选 `capturedAt=2025-05-02T16:57:53+08:00`，没有用上传、核验、下载或观测时刻代填。
- 原始 EXIF `GPSImgDirectionRef=T`、`GPSImgDirection=1491255/5438=274.2285766826039°`。这是图像方向而非行进方向；没有由山体轮廓、太阳或地点推算。候选方向文字保留真北含义和实际来源。
- 原始公开 GPS：WGS84 纬度 `22.361994444444445`、经度 `114.37164999999999`。原 GPS 时刻是 08:57:52 UTC，与拍摄钟相差1秒；没有拿它替换 `DateTimeOriginal`，也不声称相机时钟经过独立测量校准。
- 实看原图为小巴、站牌和候车区的地面实拍。未加工、裁切、重写EXIF或创建新图片衍生物。

当前任务输入均在 `.codex/work-items/sky-map-performance-2026-10-18/tmp/h3-photo-input/`，该目录已由任务原有 tmp 规则忽略：

| 文件 | 用途 |
| --- | --- |
| `high-island-east-dam-minibus-20250502.original.jpg` | 完整原始 JPEG；小文件，不进入生产包或仓库提交 |
| `public-source-readback.json` | 当前 Commons primary API 的固定页面/文件身份、许可、来源及下载读回；仅选择本次有关字段 |
| `product-input-candidate.json` | 从原 JPEG 的 EXIF 再读取的时间/时区/真北有理数；既有 RepresentativeMedia 形状候选、拟关联边界及原文件指纹 |

原图和许可都可公开取得；候选本身不是已准入数据，也不是已允许的 WEAPP 下载域名。若后续复制/缩放或同源服务，沿现有媒体 owner 保存真实作者、出处、许可及实际改动说明，不能仅把外站 URL 填进字段就声称手机可读。

## 当前数据与消费者边界

`packages/miniapp-contracts/src/types.ts` 的 `RepresentativeMedia` 已有 `capturedAt`、`direction`、完整出处/许可和 `isSiteSpecific`。`pages/map/spot-panel.tsx` 沿现有媒体列表和 `SpotImageViewer` 显示 `sitePhotoContext`，查看器另显示作者及许可名；不需要新建照片查看器或推测元数据。

查看器并不自动显示 `RepresentativeMedia.sourceUrl/licenseUrl`；完整出处不能凭字段存在当作产品可读。现有“来源与更新时间”页显示 `SpotDetail.dataDisclosure` 等 `SourceSummary`。候选 JSON 已准备同一真实照片的 `dataDisclosureAdditionCandidate`，其拍摄钟、下载读取、当前可读与历史资料限制分别保留。后续须由资料 owner 将其沿现有来源责任接入并在目标端实看，或修复实际遗漏；本文不声称现有正值来源已显示。

`utils/spot-media.ts::sitePhotoContext` 原样保留来源提供的时间精度和方向。已使用本次真实候选调用当前生产 helper，读回：

```
拍摄时间 2025-05-02T16:57:53+08:00 · 方位 274.2285766826039°（真北；原EXIF）
```

同次缺失输入仍为 `拍摄时间未提供 · 方位未提供`。这只是当前纯呈现 helper 的结果，不替代 WEAPP/手机实看、图片可达、资料归属或正式发布验证。

普通用户投稿链不能用于补齐本次正值：`media-object-store.ts` 对 JPEG 移除 EXIF/IPTC/注释，对 PNG 只保安全图片块；表单没有采集这两个元数据字段，`public-spot-media.ts::projectPublicSpotMedia` 对授权上传的公开 DTO 明确投射 `capturedAt:null`、`direction:null`。这是现有隐私/数据合同，不应为了一个验收样本恢复照片 EXIF、冒用上传时间，或把未知变成原照片方向。

正式现场资料声明还有 `spot-completeness-policy.ts::evaluateSpotCompleteness` 的同点、时间/方向、许可/来源及 `SITE_MEDIA_PROVENANCE` 证据门槛。真实候选不能绕开这些资格，也不能覆盖受保护的旧 MEMORY_TEST 账号、未知草稿或已有正式点状态。

## 交给 root 的最小下一步

1. 沿已有现场资料 owner 审定**同点归属与媒体出处**，在明确隔离的产品输入中采用该公开原图及候选字段；保持原地点名和东坝子地点说明。不要将它挂到 `spot:test-published` 的深圳现场声明，也不要通过生产/恢复库直接写入冒充完整真实发布。若采用隔离诊断输入，报告必须注明该范围，不能认证完整发布链。
2. 用普通 Map 现有图库进入照片，实看拍摄时间、真北方向、作者/许可与来源；关闭/返回核对原正文及照片阅读位置。图片解码失败仍须让文字元数据和恢复说明可见。只需一个实际正值样本，无须再批量搜同机制照片。
3. 在同一输入保留有效照片时，用已有受控故障机制制造**独立地形轮廓**的局部缺测或读取失败；验证不画成零遮挡、有效地图/照片仍可用，恢复后能重读。此项与照片正值是两种机制，当前均不能由本次 helper 调用关闭。
4. iOS 目标运行仍需独立设备证据；当前 Android 手机不能关闭该项。照片缺口本身已不需要用户拍摄或提供，必要的人类设备动作可继续后置。

## 有界搜索与否决

只核现有 Commons 来源、当前三个代表地点的有限公开元数据。大帽山直接类别不超过50份、万宜水库25份、梧桐山首批50份及少量定点文件；另两次候选类别查询没有返回可用文件。未遍历类别树或用户上传历史。搜索页仅导航，最终依据 primary API 和原 JPEG。

大帽山类别中两个有方向的文件是在青衣/汀九桥上远眺，另一个瀑布位置和 GPS 时钟不足以归属山顶；均未当作当前点现场。`201806 High Island Reservoir.jpg` 有时间/真北方向，但为航空照片（GPS高度约2263m），未当作地面现场或设施证据。几份梧桐山实拍有日期/坐标却没有图像方向，未从地物推测。找到并核实选定东坝地面照片后停止扩搜。

本次没有新增依赖、外部联系、付费、账号授权、媒体公开发布或任何用户相册操作。输入保留到 root 完成对应验证；之后按任务资源 owner 精确清理，不影响用户原素材。
