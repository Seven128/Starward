# C05 新木星素材候选与数据加工（2026-09-24）

本轮完成权利、坐标、真实源图与衍生条带核验，随后接入固定 BFF 发布清单与 Mini 绘制路径，并做本地容器 HTTP 和桌面 WebGL1 读回。**目标微信原生画面与手机尚未验证，也未部署到商业环境。**

## 来源、权利与空间时间含义

- [MAST OPAL HLSP](https://archive.stsci.edu/hlsp/opal) 对 OPAL 高阶科学产品明确写 CC BY 4.0；[MAST 数据使用政策](https://archive.stsci.edu/publishing/data-use)说 HLSP 许可随第三方分发，DSS 限制是另一个条目。[CC BY 4.0 条款摘要](https://creativecommons.org/licenses/by/4.0/)明确允许商用改作、复制和再分发，条件包括署名、许可链接、标示修改且不暗示背书。需在小程序和机器清单实际履行后才算交付。
- [Cycle 31 Jupiter 2024c 官方页](https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31)提供 F395N/F467M/F658N 三滤镜合成 TIFF 与各波段 FITS；[官方 README](https://archive.stsci.edu/missions/hlsp/opal/cycle31/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2024-2_all_v1_readme.txt)标注图像 2024-11-19 至 20 观测、360° System III 西经，左缘 0° 且向右递减，行星图纬度；FITS 实测 3600×1800，10 px/deg、F395N `DATE-OBS=2024-11-19T19:39:38`。README 的“0 to +90 deg planetographic latitude”一句与 1800px/10 px per degree 及南半球图像相矛盾；[Wong 等论文的 GLOBALMAP 格式定义](https://stsci-opo.org/STScI-01EVSQQQA3VQ9Y32GQKZ0ADZ9A.pdf)明确为 360° 西经与 180° 行星图纬度，消除完整纬度范围的疑义。新衍生图不使用经度，因此不依赖 System III 经度与当前极轴配准。
- 官方 TIFF `hlsp_opal_hst_wfc3-uvis_jupiter-2024c_f395n-f467m-f658n_v1_globalmap.tif` 为 3600×1800 RGB、19,472,820 B、SHA-256 `b352755811130a1ede851f9c62de48454cc249f2047a763782870ac8d8a158e2`，保存在 ignored `artifacts/miniapp/cloud-sky-native/opal-jupiter-2024c/`；另外只取一张 F395N FITS 25,922,880 B、SHA-256 `79ff9601dc2429cf9ddc5d02be86c65e9b14f011e1e987abbde348255ad211ed` 作头验证，没有复制到生产资产。
- 原始合成图的可视预览：[2024c 整图](opal-jupiter-2024c-preview.png)。它有极区黑色无数据带和约南纬 20° 的大红斑。[NASA PDS 论文](https://pmc.ncbi.nlm.nih.gov/articles/PMC11723921/)解释大红斑经度会随时间漂移，历史图不应按今日自转轴呈现为当前红斑位置。

## 本轮处理与检查

- 新 `data-pipelines/planet-textures/publish_opal_jupiter_bands.py`校验完整 TIFF SHA 和尺寸，逐个纬度取有效经度像素 RGB 中位数；不足 90% 有效经度的纬度保持透明，再缩到 8×512。它不输出任何经度结构，因此没有 2024 年红斑的定位信息。预览：[仅历史云带](opal-jupiter-band-preview.png)。图的滤镜合成色是任意缩放，不等于自然真彩。
- 处理资产 `workers/miniapp-api/assets/jupiter/jupiter-opal-2024c-median-bands-8x512.png` 为 8×512 RGBA、1,026 B、SHA-256 `8c3e6e19f2f620581a859e5496ab0361544c3a20b1c903b0c4236e85d4d75a47`；源 1800 行中 1680 行满足有效覆盖。现在已由下述 BFF/Mini 路径使用，但用户微信原生图片解码和画面仍待验证。
- 成本尚未测云存储/流量；单次压缩衍生图只有 1,026 B，不能推断请求次数、缓存命中、云费用或设备上传/解码峰值。

用户 Android、当前微信工具窗口、共享8787及活动WEAPP构建目录未使用。Goal active。

## 实际接入与本机证据

- `workers/miniapp-api/assets/jupiter/manifest.json`明确源、CC BY 4.0 链接/署名、DOI、修改、日期、投影/缺区和精确 SHA；通用固定本体影像 owner 增加 PNG 签名/元数据校验，保留月/火/水星原校验。版本化 `/v2/sky/jupiter/manifest` 为 no-cache，图片哈希 URL 为一年 immutable，错版本/错文件为 404；合同/生成 SDK 已同步。
- Mini 经同源客户端校验许可/投影/固定哈希与路径，再复用 `useSkyNativeImages` 的 PNG 下载、解码、缓存/取消、已加载图保留与重试。仅普通模式、高倍率、有效木星轴加载；同帧条带随木星而非别的行星进入场景。片元对 1-bar 椭球求交，按椭球法线取行星图纬度；极区 PNG 透明时混回普通相位色，缺图则整盘使用旧轮廓/相位。页面折叠来源披露观测日期、非真彩/非实时、去经度加工、署名/许可/DOI、机器清单。
- 检查资料消费者时发现木星详情仍写“尚无云系纹理”；已更新为历史、无经度条带，加入该木星专有的 OPAL `OPEN_DATA` 来源与改作署名，资料编辑版本从 @3 到 @4，使旧缓存不能保留反向文案。新增定向资料断言；重建发布镜像后，实际 HTTP [木星详情输出](jupiter-bands-container-detail-2026-09-24.json)返回3项来源、CC BY 4.0 和与画面一致的历史限制。OPAL 出处与同刻几何来源分别披露，不能混为一套实时计算数据。
- 首次直接套用月火纹理的 0.3+1.2 RGB 增益使木星条带南北像素均饱和为白；据桌面 WebGL1 读回单独降低木星条带增益至 0.08+0.9，其他 JPEG 路径保持原值。当前[可重现脚本](../jupiter-bands-webgl-probe.cjs)抽取**实际生产 shader**与正式 PNG，在 Chromium WebGL1 读回：赤道面中心 RGB 169/188/158，北点149/126/107、南点150/134/116，长轴边缘 alpha220，原球面范围内而扁球外的极点为黑色背景，北极正面中心回退相位 RGB 214/194/166；探针 `ok:true`。原 [水星 shader 探针](../mercury-webgl-probe.cjs)同时重跑，五像素逐点仍与独立 JPEG 期望相同。桌面 WebGL1 不能替代 WEAPP 原生合成/色彩观察。
- 新 BFF HTTP 注入回归1/1；API全量366通过/11跳过；Mini初次826项中825通过、1项旧测试 VM fixture 未含新增帧字段而失败，修复 fixture 并为木星帧增加断言后 Mini全量827/827通过。合同29/29、SDK、三包 typecheck、Context validate、diff check通过。Docker发布镜像 `starward-miniapp-api:jupiter-bands-local` 构建成功并含正式 PNG/清单；首次短命容器因未设置显式本地测试模式按预期拒绝启动，加入 `MINIAPP_ACCEPTANCE_MODE=1` 后在隔离18796端口/512MiB用发布镜像真实HTTP获取清单200、PNG200/1026B/实际SHA等于声明、错版本与错文件404，原始[HTTP输出](jupiter-bands-container-http-2026-09-24.json)。容器已停止且18796不再监听；8787未动。
- 资料页补正后 API 全量重跑仍为366通过/11跳过、BFF类型通过，发布镜像重建成功。重建镜像的首次探针发起过早，服务尚未就绪；等待实际 Nest ready 后同一个隔离端口的清单/PNG/404 探针与详情查询均通过，容器及端口再次清理。WEAPP正式包本轮未构建，以免覆盖用户正在使用的 `dist/weapp`/`dist/weapp-check`。
- 未占用户 Android、当前微信工具窗口、活动 WEAPP 输出目录，也未云部署。新木星 PNG 在微信 Canvas 的实际出图、加载失败/前后台恢复、目标机性能和独立审查仍开放；许可证约束已在机器清单与页面文案落实，商业云端上线前仍要核查实际包和归因可见性。Goal active。
