# H3 同点照片隔离输入

2026-10-18。复用 [已取得的原图、EXIF 与许可](H3-PHOTO-INPUT-READINESS.md)，没有重新搜照片。本次仅准备 task-local 数据、同源媒体读取和独立地形轮廓失败输入；未激活监听、修改正式 catalog/数据锁、写数据库/账号、调用既有服务、操作开发工具/手机或用户相册。**手机与正常发布链的 H3 验收仍未完成。**

## 同点归属与可用模块

唯一隔离 ID 是 `spot:development:h3-high-island-east-dam-minibus-20261018`，名称“万宜水库东坝小巴总站（隔离开发输入）”。坐标取原图公开 WGS84 机位：`22.361994444444445, 114.37164999999999`；GCJ02 由当前 `@starward/coordinate-system` owner 生成。它不是深圳的 `spot:test-published`，也不是 `spot:hk-high-island` 水库关系几何中心。现有两点均未改变。

模块在 [tmp/h3-isolated-input/](tmp/h3-isolated-input/)。`prepare.mts` 复用 `media-object-store.ts::sanitizeContributionImage` 创建安全图片副本，`prepared.json` 保存该点、真实照片及来源声明；`adapter.mts::createH3IsolatedInput({origin})` 返回尚未挂接的 `Request → Response | null` handler、现有组件形状的 detail/source 和真实 owner 的地图点 Context。模块没有 `listen`、上游 fetch、数据库或账号依赖；调用方必须主动接入才生效。

`SpotSummary.status=DATA_INSUFFICIENT`、`siteMediaState=UNKNOWN`、`evidence=[]`，不写“已审核” `formalFacts`。高度、当前开放、合法进入、夜间安全、设施、光污染、遮挡率与路线皆保持未知/不可用；无 `PUBLISHED`、正式媒体核验或全向无遮挡声明。`RepresentativeMedia.isSiteSpecific=true` 仅指这张照片与独立的东坝机位输入同点，不是正式审核或当前场地状态。

## 正常选择的实际限制

`FORMAL_SPOT` 是 Context 的身份种类，不能单独作为发布资格。当前真实代码同时施加资格边界：

- `workers/miniapp-api/src/observation-context-service.ts:356` 的 `#formalLocation` 拒绝 `DATA_INSUFFICIENT`；本模块确实调用该 owner，结果为 `formal_spot_not_found`。
- `miniapp-service.ts:1584` 的 `getSpotOverview` 要求匹配的 `FORMAL_SPOT` Context，并再次拒绝 `DATA_INSUFFICIENT`。正式人口和 Search owner 仅筛选 `PUBLISHED/TEMPORARILY_CLOSED`。
- `apps/wechat-miniapp/src/spot/data-source/index.tsx:33` 的现有来源页也要求匹配的 `FORMAL_SPOT` Context。

因此不能靠把此输入附加进附近列表、伪造 `FORMAL_SPOT`、借 `UNPUBLISHED` 的局部实现差异或覆盖全局 Context 跑通普通正式点页。这个限制是已核实的合同边界，不是缺少照片，也没有通过改生产代码绕过。

最小合规的目标端入口是**隔离开发构建中的既有组件 fixture**：将本模块 `getDetail()` 的 spot/detail 供给现有 `SpotPanel`，沿其原图库进入 `SpotImageViewer`；独立来源阅读供给现有 `Provenance`/归因组件。继续沿当前 gallery 位置/返回 owner，不新建查看器、来源规则或正式选择状态机，不安装这些值到全局 app-store。该入口只认证相同组件的实际正值/独立失败表现；不能认证正常正式点选择或完整发布链。若要认证普通来源页面，须由原资料/发布 owner 先取得真实同点资格，不能用本准备模块代替。

## 精确路由与接入位置

全部路由使用 `http://<已有开发 bridge 的本机/LAN地址>:<port>` 同一个 origin；factory 只接受 HTTP loopback/私网 origin。媒体使用绝对同源 URL，因为当前 `mediaSource` 只会给正式 `/v2/spots/.../media/upload.../image` 相对路由补 API base；没有扩宽该生产规则。

| 路由 | 用途 |
| --- | --- |
| `GET/HEAD /__development_h3_input/media/east-dam-minibus-20250502.jpg` | 真实安全 JPEG；GET 返回已核 bytes，HEAD 无 body；`no-store`、正确 MIME/length/ETag、`nosniff`。 |
| `POST /__development_h3_input/contexts/resolve` | 仅 `{localDate, selectedAt?}`；内部固定本机位 `MAP_POINT/MAP_VIEWPORT`，复用真实 `ObservationContextService`，不接受调用方地点、账号、proposal 或 route origin。 |
| `GET /__development_h3_input/contexts/<encodeURIComponent(本模块当前 contextId)>` | 只读本模块当前内存 Context。 |
| `GET /__development_h3_input/spots/<encodeURIComponent(上述隔离 spotId)>/overview?contextId=<本模块当前 contextId>` | 组件 fixture 的 PARTIAL detail；不是生产 `spotOverviewGet` 的替代。 |
| `GET /__development_h3_input/spots/<encodeURIComponent(上述隔离 spotId)>/horizon/read-failed?contextId=<本模块当前 contextId>` | 复用 `terrainHorizonData(center,null,"READ_FAILED")`，返回 `UNAVAILABLE/HORIZON_READ_FAILED`、`model=null`、空 proof；不画零角曲线。 |

所有正常 `/v2` 请求、其他 spot/media/context ID、其他 origin 和未知 namespace 子路由均返回 `null` 供既有流程继续；没有跨请求全局点位覆盖。请求不能带 Authorization/Cookie。只有当前 1 个 Context 驻留，替换后旧 ID 失效，`close()` 关闭独立 MemoryCache；保留真实时区、night bounds、fingerprint、过期等语义，不写 8791、PostgreSQL 或现有缓存。

供 root 后续接入的位置是 `tmp/r17-phone-bridge.mts` 的既有 fallback proxy **之前**，由 root 显式初始化此 factory 并按 handler 的非 null 响应返回。构造 Request 要使用 bridge 自己的 **8795 origin**；当前文件 `oldOrigin` 是 8791，不能拿它作为本模块 origin。未命中必须继续原 proxy。模块本次未导入该 bridge、未修改它、未重启任何服务。

独立地形失败输入也没有全局覆盖 `/v2/terrain/horizon`。后续 fixture 应把此响应沿 `checkedTerrainHorizon`/现有 query 责任传给 `SpotTerrainHorizon`；实际 hook 会把全量 READ_FAILED 交给现有有界重试/错误状态。恢复时重新读取原地形 owner 的真实同点结果，本模块不编造成功曲线。有效照片/文字来源的读取与地形失败互相独立。

## 真实照片、署名与安全副本

照片作者 **LN9267**；[Commons 原始出处](https://commons.wikimedia.org/wiki/File:East_Dam_of_High_Island_Reservoir_minibus_terminus_02-05-2025.jpg)，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。固定来源 revision、原始下载身份与原 EXIF 仍在原准备证据，未改写为本次取得。拍摄时间是 `2025-05-02T16:57:53+08:00`，方向是 `274.2285766826039°（真北；原EXIF）`，没有借用上传/观测/验证时间或由地物猜测方向。原时区和相机标记不代表独立时钟/方向仪校准。

历史照片不证明当前小巴班次、停车、进入条件、夜间安全或无遮挡。`dataDisclosure` 中保留真实 HISTORICAL_RECORD 来源、作者、CC BY-SA、出处/许可链接、拍摄精度、历史资料限制及改动说明；内部 TEST_FIXTURE 来源仍由现有 `isProductSource` 排除。查看器沿当前图库映射显示 `sitePhotoContext`、作者/许可；完整链接继续由原 Provenance 来源组件提供，不声称查看器自己新增了链接。

- 原 JPEG 4032×3024、**3,050,409 B**，SHA-256 `84c3ac48ee8d54541e4e24fe0232890e970f21938de766d56541513e5191fc84`，保持原样。
- 安全副本 4032×3024、**3,038,007 B**，SHA-256 `cc96b87d972a558bf7543fd1263cb7001cc81af83e3d75e1a507fb0a0e987a39`。
- 实解码确认原图 Orientation=1，副本 EXIF 项为0；两份 RGB 像素完整相同，SHA-256 都是 `17776c6a7f293bc12f7f2d65659401b3a989af78b256402b5a59773fa4c29acd`。仅按既有 owner 移除 EXIF/IPTC/注释，没有裁切、缩放或重编码像素。对外独立字段来自公开原图的已核数据；用户上传去 EXIF 和公开 DTO 的 null 隐私合同未改变。

## 已做验证与停止范围

`verify.mts` 的 9 组有界检查通过：正常/外部请求 pass-through、真实 formal 拒绝、同点及 unknown 语义、原生产 media/source helper 正值、独立 MAP_POINT Context、严格绑定、真实 JPEG GET/HEAD bytes、地形失败不产生零曲线且照片仍可读、Context 替换/原图不变。独立 task `tsconfig.json` 类型检查通过。首次类型检查捕获缺失 `TerrainCenter.system`，补齐 GCJ02 后重跑通过；没有改生产合同。Pillow 真实解码/EXIF检查见同目录 `jpeg-decode-check.json`。

复现只运行准备/内存检查，不打开服务或设备：

```powershell
node tools/run-node.cjs --import tsx .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-isolated-input/prepare.mts
node tools/run-node.cjs --import tsx .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-isolated-input/verify.mts
node tools/run-node.cjs --bin typescript tsc --project .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-isolated-input/tsconfig.json --pretty false
```

同源 handler 尚未进入 bridge/WEAPP；目标端图片下载解码、真实图库返回位置、完整来源可读、实际地形失败与恢复、Android/iOS 和正常正式点发布/选择均未由本次检查通过。原图、声明、安全副本与代码保留到 root 完成对应目标验证后，由原资源 owner 精确清理；本次没有删除文件。
