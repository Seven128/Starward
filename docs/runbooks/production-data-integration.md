# Starward 生产数据对接与上线运行手册

状态：生产接入实现已完成；真实流量默认关闭。商业合同、账号/密钥、许可与目标区 POC 是激活证据，不是代码实现缺口。权威配置见 `config/data-sources/production-integration.json`，验证记录见 `artifacts/verification/production-data-integration.json`。

## 1. 固定的数据流与安全边界

动态数据统一走：`provider -> server adapter -> schema/quality gate -> ProviderRun/RouteSnapshot -> NightReport/API -> mobile`。移动端不得持有天气、路线或批处理源密钥，也不得拼接多家响应。每个响应保留 provider、产品/模型、run/epoch、issued/fetched/expires、许可版本、attribution、质量标记和缺失字段。

静态/批量数据统一走：`official object/order URL -> bounded download -> checksum -> raw-restricted immutable object -> transform/quarantine -> derived-private -> signed/versioned publish manifest -> public/offline consumers`。当前指针只在完整批次通过后原子切换；失败继续使用上一个已批准 manifest。

所有生产 carrier 均采用 fail-closed：只有 `implementationStatus=passed`、外部激活证据 confirmed、对应 source `productionEnabled=true` 三者同时成立时才能接真实流量。缺合同、密钥或 POC 时，代码仍可构建和以 fixture/staging 运行，但生产开关保持关闭。

## 2. 环境和 secret 注入

生产 Secret Manager 至少创建下列逻辑项；仓库只保存 `secret-ref`，不保存值：

| 能力 | Secret/配置 | 用法 |
| --- | --- | --- |
| QWeather | `QWEATHER_API_HOST`、`QWEATHER_CREDENTIAL_ID`、`QWEATHER_PROJECT_ID`、`QWEATHER_ED25519_PRIVATE_KEY`、`QWEATHER_LICENSE_VERSION` | 服务端用 Ed25519 私钥生成约 15 分钟 JWT；Authorization Bearer；API Host 必须是控制台分配的 `*.qweatherapi.com` |
| Open-Meteo | `OPEN_METEO_API_KEY`、`OPEN_METEO_MODELS`、`OPEN_METEO_LICENSE_VERSION` | 商业生产只允许 `customer-api.open-meteo.com`；免费 host 仅非商业 POC |
| 高德 | `AMAP_WEB_SERVICE_KEY`、`AMAP_ANDROID_KEY`、`AMAP_IOS_KEY` | Web Service key 只在 API；原生 key 分别绑定包名/签名与 Bundle ID；禁止互用 |
| CDSE | `CDSE_S3_ACCESS_KEY`、`CDSE_S3_SECRET_KEY` | worker 经 STAC 选 tile，再从 `eodata` S3 下载；凭证按到期日轮换 |
| FY-4 | `NSMC_ORDER_CREDENTIAL` 或一次性官方订单 URL | 只处理获批订单结果；不得抓网页展示图或绕过并发/日配额 |
| 对象存储 | `OBJECT_STORE_ENDPOINT`、`OBJECT_STORE_REGION`、`OBJECT_STORE_BUCKET`、`OBJECT_STORE_ACCESS`、`OBJECT_STORE_SECRET`、`OBJECT_STORE_SSE`/KMS key | `S3StagedImmutableRawSink`：staging 指向 MinIO；production 指向最终批准的单一境内 OSS/COS S3 endpoint；生产 endpoint 强制 HTTPS |

staging 与 production 的数据库、Redis、Bucket、密钥、OAuth、推送和 provider project 必须完全独立。轮换时先并行装载新凭证、执行只读健康检查，再切换别名；撤销旧凭证并保留不含 secret 的审计记录。日志、trace、异常和 URL 必须剔除 `Authorization`、`key`、`apikey`、`sig`、token 和精确敏感位置。

## 3. 动态源接入

### 3.1 QWeather

1. 在独立 production project 生成 Ed25519 密钥；公钥上传控制台，私钥进入 Secret Manager；保存 credential id、project id、独立 API Host 和公钥 SHA-256。
2. 启用前把合同中的 current/hourly/daily/warning/AQI/GeoAPI SKU、QPM、计价、SLA、attribution、缓存/历史/派生/终止边界写入 provider registry。
3. `QWeatherHttpClient` 请求 `/v7/weather/168h` 和 `/weatheralert/v1/current/{lat}/{lon}`，经 `normalizeQWeather` 转 SI/UTC 语义；预警来源完整保留。
4. 按标准格点、产品/run 和变量集 Single Flight；小时预报缓存 30–60 分钟，预警 5–20 分钟并接受事件即时失效。GeoAPI 只实时辅助搜索，不批量缓存或建索引。
5. 401/403 直接熔断并报警；429/5xx 有限退避；过期预警不得显示为当前。回滚为上一个未过期 ProviderRun，否则相关字段显示 unknown。

### 3.2 Open-Meteo

1. 先用免费端点和固定地点矩阵做非商业 POC；商业启用时购买已证明必要的最低档并注入 customer key。
2. `OpenMeteoHttpClient` 固定 GMT、SI 单位、显式变量和显式模型；请求 host 随 endpoint class 绑定，生产使用 free host 会启动失败。
3. 记录实际模型而不是只写 `best_match`；按模型/run/变量/地点格点缓存，并按变量数、时长和地点数回填加权调用。
4. 可选分层云/多模型先于主天气能力降级；到 70%/90% 告警，100% 预算门关闭可选回源，不自动升档。

### 3.3 高德路线和原生地图

1. production Web Service、Android、iOS key 分开申请和限制。SDK 初始化前完成隐私状态，保留高德 logo/法务标识。
2. 服务端 `AmapRouteHttpAdapter` 调用 v5 driving/walking/bicycling；transit 必须先由受控城市解析器提供 `city1/city2`，无城市码则明确不可用。非公交响应读取 `route.paths`，公交响应读取 `route.transits`，两种结构分别执行 contract fixture，禁止用驾车 fixture 冒充公交已接通。
3. WGS84 仅在适配器边界转换一次为 GCJ-02。保存原始权威坐标、provider version、路线生成/过期、traffic assumption、distance/duration、geometry 和 warning。
4. 失败先返回许可范围内的未过期 route snapshot；否则仅返回明确标记的直线参考，绝不称作驾车/步行路线。

### 3.4 CelesTrak OMM

服务端按选定 GROUP 请求 `gp.php?...&FORMAT=JSON`，接受 1–9 位 catalog id。每个上游更新最多取一次，最短周期两小时；任何非 200 都立即停止本轮、不重试，并报警给人。保存 OMM epoch、获取时间、内容 hash 和格式版本；过期轨道隐藏精确倒计时/凌日月结果。

## 4. 静态与批量源接入

### 4.1 EOG VIIRS Annual VNL v2.2

从官方产品页选择明确年份的 average/coverage 文件，同时保存 readme、CC BY 4.0、citation、对象 URL、size 与下载时间。worker 只接受来源 host 白名单，流式写入暂存 multipart/object，边下载边执行最大体积与 SHA-256；校验成功后才原子提交到内容地址，失败 abort 且不得发布半成品。随后用锁定 GDAL 镜像验证 EPSG:4326、nodata、coverage 与范围，裁切首发 AOI，生成压缩 COG、overviews、tiles 和点查询索引。发布 manifest 同时含 radiance 与 coverage；UI 显示年份、单位、来源和修改说明。没有区域校准时只显示 radiance/估计，不显示“实测 Bortle”。

### 4.2 Copernicus DEM GLO-30

`CopernicusDemIngestClient` 使用 STAC `https://stac.dataspace.copernicus.eu/v1/search` 查询 `cop-dem-glo-30-dged-cog` 与首发 AOI/明确 tile id，只接受 `assets.data.href` 的 `s3://eodata/` 路径；随后以 CDSE S3 credential 从 `https://eodata.dataspace.copernicus.eu` 的 `eodata` bucket 流式下载，不把 access/secret 拼进 URL。保存 STAC item、asset href、ETag/size、内部 SHA-256、许可接受版本和 GLO-30/GLO-90/nodata provenance。区域 mosaic 只作分析，移动端只发布按地点生成的 horizon profile；海洋 0、缺片和 90m 补值不当成 30m 实测。

### 4.3 Gaia DR3

保存 `_disclaimer.txt`、`_citation.txt`、`_catalogue_sizes.txt` 和目录 `_MD5SUM.txt`；按官方 level-8 HEALPix 文件范围只取所需分区。先核官方 MD5，再计算内部 SHA-256。转换任务固定字段、亮度阈值、epoch/proper-motion 规则和排序，输出按 HEALPix 分块的版本化二进制资产；包体、视锥查询、绘制和内存在发布前取证。禁止把近 20 亿源全量塞入 APP。

### 4.4 FY-4B

官方当前公开生产可依赖流程是实名审核、选择产品/时段/空间、提交订单，再通过客户端下载、FTP 或 C 类订单 URL 获取；没有可假定长期稳定的匿名实时 API。Starward 因此把“订购”与“处理”解耦：授权人员/获批自动化创建订单，短期下载 URL 进入 worker secret，`static-source-ingest` 将文件写入同一 immutable landing contract。后续解 HDF、投影、区域裁切、昼夜/通道合成和帧 manifest；订单、并发、每日容量、再展示/派生权或 30 天稳定性未确认时隐藏实况图层，回退预报云量。

## 5. 对象层、发布与回滚

- `raw-restricted`：原始文件、许可、readme、订单/对象 metadata、checksum；只写新版本，不覆盖。
- `derived-private`：COG、DEM mosaic、horizon、星表分块、轨道和内部索引；必须可追到 raw hash、工具镜像和参数。
- `public-assets`：获准公开的 tiles/manifest/缩略图；签名 manifest、CDN attribution、撤下开关。
- `user-media` 与 `audit` 不和供应商数据混用。

发布流程为 `stage -> validate -> sample diff -> sign manifest -> atomic pointer swap -> warm selected CDN -> observe`。回滚只切回上一签名 manifest；不修改旧对象。许可撤回或坏批次时先停止新发布、切回/隐藏，再按合同执行删除，并保留不含受限内容的审计墓碑。

`S3StagedImmutableRawSink` 使用 AWS SDK v3 的有限并发 multipart upload 写 `_staging/raw-ingest`；hash/体积通过后，先校验目标内容键是否已存在且 metadata/size 一致，再执行单次或 multipart server-side copy，最后删除暂存对象。失败会 abort multipart 并清理临时键；另配置 24 小时 staging lifecycle 兜底清理进程崩溃遗留，禁止该前缀成为发布来源。生产只允许 HTTPS，HTTP 仅限 staging 的 `localhost`/`127.0.0.1`/`minio`。bucket policy 仍须拒绝覆盖 `raw-restricted`、开启版本/保留和服务端加密，应用级检查不能替代云端策略。

## 6. 启用顺序与验收

1. 在 staging 用 contract fixture 运行 API、worker、JWT/host/商业 endpoint、驾车与公交响应、secret 脱敏、流式体积/checksum、暂存 abort/commit、缓存/熔断和回滚测试。
2. 创建真实 provider project/账号并保存当日合同、许可、价格、quota/SLA 与 secret 指纹；不得把本手册当作该证据。
3. 运行首发区 POC：天气 30+ 地点/多天气过程；卫星连续 30 天；路线典型城市/山区；静态源抽样；记录版本、完整度、延迟、错误和实际成本。
4. 只有通过真实性、目标区稳定性、商业许可和安全降级硬门的候选进入 TCO 比较；选择等价能力中 12 个月 TCO 最低者。
5. 把 registry 的外部状态改为 confirmed，注入 secret，先开极小 staging/canary 流量；观察 provider latency/error/freshness、预算和字段缺失。
6. 生产流量稳定后才采集 SLO；没有样本时保持 `pending-production-measurement`，不能用 fixture 延迟冒充生产数据。

## 7. 当前仍需外部完成但不阻塞代码实现的事项

商业供应商的签约/报价/账号/配额、真实 secret 颁发、数据许可与再分发确认、首发区 POC、生产 30 天样本仍需外部事实。它们继续阻止生产 promotion，但不会再被描述为“生产接入方式未知”或“实现无法继续”。
