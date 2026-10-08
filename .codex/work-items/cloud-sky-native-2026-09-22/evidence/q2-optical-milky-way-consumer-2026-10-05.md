# Q2 条件光学银河消费者与新增 E2 静态出口

## 决定及边界

**保留为条件光学银河显示小样，未普通采用。** 2048×1024 原 PNG 沿现有 image/cache/Hook/Scene/GPU/source owner 可工作，实际 M8 方向显示银河尘埃，最大视域沿当前投影绘制；真实目录没有被删除。默认 2MASS 与普通 Prepared 空 registry 保持。它不供应任意区域高清，不修复 M82/NGC253 完整照片矩形、弱外围或一般区域背景失败。重复星点、绝对照片配准、完整图质、真实 WEAPP 与设备仍未验；producer complete processing / scientific availability 保 UNKNOWN。

素材、具体随包 grant 与名义几何见[原输入决定](q2-mature-optical-bitmap-2026-10-05.md)，本次未下载别的 bitmap、处理图片、复制 GPL/AGPL 引擎或恢复排除源。没有逐图 PSF、抹照片恒星、生成细节或通用巡天框架。原 PNG 以硬链接进入任务试验目录，未增加默认资产。

- 原图 SHA256：`95ca887ae2fd6811a202f83bccb1376819957d074eed92e4df17f9cbea83df97`；1,003,398B，2048×1024，不透明 RGB。
- 任务 manifest：`output/stellarium-optical-milky-way-publication-1005-q2-r1/manifest.json`；publicationHash `5f609f20d59133d983a55152b1da63dc5c831cc3d9044ac639447cb1b16f03f3`。
- 独立合同：`starward-mellinger-optical-milky-way-trial-v1`、TRIAL、OPTICAL_MILKY_WAY_DISPLAY、J2000 赤道 equirectangular；`u=wrap(.25-RA/360), v=.5-Dec/180`。旧 2MASS Galactic 合同不改名、不换轴。

## 实现责任

`packages/miniapp-contracts/src/galactic-image-publication.ts` 共管原 2MASS 与这个具体资产的严格身份/来源/格式/frame；不是任意图片注册入口。API 原 publication owner 的可选构造输入才能启用试验，默认资产不变；文件/version/signature/bytes/hash 核验与已校验 metadata 的防外部修改副本保持。

客户端复用原公开图片下载、encode/file、decode、Canvas generation 与退休。原 Scene 用同一次 observation transform 生成独立赤道图片轴，renderer 原 equirectangular/window 路径接收这些轴；原 Galactic 示意/fallback 轴不变，条件 PNG 不继承红外 point-source filter。只有实际 GPU 提交成功才回执该 bitmap；W3 替代或 image fallback 不冒已显示。

`spot-sky-page.tsx` 将图片出版身份与图像放在同一实际 frame 输入，核当前 image/publication/generation 后接收 completed source。当前 inline 公共天体列表里的来源披露由这份已绘 source 决定，展示具体署名、grant、processing、UNKNOWN/UNVERIFIED；不是 metadata 下载完就声称已显示。独立来源 route 的完整义务仍保留。

API 和静态导出旧 `galactic` headers 原来一律写 2MASS。新增共享 `galacticImagePublicAssetHeaders` 按严格出版身份生成格式/来源；条件光学不再被误标红外。`galacticSkyPublicAsset` 复用同一出版 owner 的 path/bytes/header；原全量 exporter 的默认 2MASS 输出保持一致。现有 test factory 转发 MiniappService 已有可选 galacticImage 输入，未来任务执行器复用这个入口，未添加产品开关。

## 实际软件 page/GPU 证据

复用现完整 React/Query/Taro 官方 page 映射、实际 Map→Sky JSX/Hook/Scene 与当前 Nest HTTP owner，515 实际构建输入；只是受控软件 WebGL 执行，不是 WXML、DevTools 或手机。每次源码/后端 graph 逐文件 before/after 绑定相等。资源、已绘 source、GL uniforms、返回状态和原 bitmap 的 HTTP body 均留输出。

| 实验 | 实际结果 | 输出目录 |
| --- | --- | --- |
| 条件光学消费者 | 冷→实际 M31 搜索定位→90°→40°→90°→来源披露→hide/show→Back；原图片一次 1,003,398B，暖回无新增 body；5 个代表 frame 有正确 J2000 source/axes；退出 decode/GPU 为 0 | `output/playwright/optical-milky-way-page-1005-q2-r2` |
| 原 2MASS 对照 | 同公共交互与来源/lifecycle，Galactic 轴和旧来源保持；一次 703,555B；退出归零 | `output/playwright/infrared-milky-way-control-1005-q2-r1` |
| 新显示检查 | 原地景/星座开关→实际 M8→90°→viewport-derived 267.875032927535°；M8 可见尘埃结构，总览 2,316 个已定位目录对象；退出归零 | `output/playwright/optical-milky-way-display-1005-q2-r1` |
| 有界坐标反例 | 任务构建仅把 renderer imageProjection 改回旧 Galactic band，原 PNG/metadata/Scene 保持；实际 float32 GPU 轴核验失败 | `output/playwright/optical-milky-way-axes-mutation-1005-q2-r1` |

两个消费者保存的 390×844 WebGL RGBA，在 90°→40°→90°的稳定回到同 observation 时均 **0 变化像素 / 最大 channel 差 0**。这里只读原像素做严格比较，没有重渲染；它不证明所有中间帧连续或全部图质。原第一轮光学 observer 错误依赖已删除 attached shaders 导致空 GL uniform，FAILED 保原；修的是任务观察谓词，第二轮实际上传/轴有证据。反例预期失败保原，不修成通过。

**原 consumer 的 `cold-whole-dome` / `software-milky-way-dome` 标签是 45° 局部，不能当总览证据。** 原文件未改；以后 helper 标签已纠正，真正总览单独在 display probe。

## 资源及完整输入限制

| 已绘场景 | 条件光学 logical GPU texture B | 2MASS control logical GPU texture B | 已解码 source RGBA 等效 B |
| --- | ---: | ---: | ---: |
| 原冷 45° | 5,238,784 | 3,289,088 | 13,369,344 |
| M31 90° | 14,344,192 | 13,606,912 | 20,774,912 |
| M31 40° | 5,251,072 | 4,513,792 | 15,269,888 |

光学与红外完整源 RGBA 均为 8MiB；新编码比原图多 299,843B。光学整场 logical GPU max 15,130,624B、source RGBA max 20,774,912B、16 decode handles、文件 logical max 2,261,416B；各 max 的同时间 sample 保存，不能相加当物理峰。独立无地景/插画的实际总览只有一个 8MiB 图像 handle / 8MiB logical texture，真实目录仍绘制。软件 window/上传/临时 copy 的成本不同，不据此宣布端上物理内存或 200DAU 通过，不盲扩缓存。

## 新增一张 PNG 的 E2 标准消费

`experience-optical-milky-way-static-2026-10-05.mts` 从严格 publication owner 输出一条，复用标准 writer/merge 与原 sealed combined 全部输入。新增 delta hash `c68b17ebe0f1645ee01ad930359416be701633938537b1f1862f17bdd95022a4`；合并 hash `d6cfbcda0a80143e01402a3aa7b985d0c9aeebc2be391cbab6ef07123ff83874`，1,740 payload 文件 / 87,304,504 logical B；原 hash `275a1aba747367ca2696bb2b7b7b6400c3a83f2e571dde63a4496dad32d1fccb` 的 1,739 文件及 12 个 Prepared 不可变 URL 完整包含。

复用已缓存 Caddy 2.11.4 Alpine，`--pull never`，只读本机挂载、独立 local CA/验证 localhost TLS、不安装全局 trust。实际 10 次 HTTPS：新 PNG 和旧 JPEG GET/HEAD/304、新 PNG 16B Range 206、TRIAL metadata API 和两错误文件 404；另一次真实 loopback HTTP 验新 PNG API 与静态格式/来源/bytes/hash一致。Caddy 10 条 `fixed_image` 隐私字段删除日志与 body bytes 逐项对齐；静态图片没有调用 API image owner，API 对照一个成功返回、两拒绝尝试分开计数。旧 12 Prepared HTTP、46 请求、Windows 分配扫描没有重跑。隔离 API/Caddy 已关闭，原 BFF/watch/IDE 未动。

现 merge owner 复制 payload；本次新增 delta+combined 共 88,307,902 logical payload B，**不是物理去重**。原 Windows 5,253 路径的分配是先前 epoch，不能代表新增目录；没有重扫描、清理或年龄删旧 URL。trusted OCI、真实 current/rollback/Sky backup 引用全集、Linux 全机盘和生产容量仍待验证。输出 `output/optical-milky-way-static-https-1005-e2-r1` 的 selected response headers 这次实际持久保存。

## 检查与时态

- 受影响客户端 60 PASS / 1 原科学实际出版条件 SKIP；contracts/client 类型通过；SDK generated check 通过。
- API 初次 4 PASS；新增出口/来源头后 API+出口 7 PASS、API 类型通过。旧 2MASS 文件、默认出口/HTTP headers 字节语义兼容；metadata caller 无法修改 cached file/format/provenance。
- 软件 page 实验在 defensive manifest copies 与 E2 来源头修复之前。后续 owner 检查及 E2 实际 HTTP 绑定这两处当前 API 修改，不把旧 page 提升为新代运行。
- 原 watch3432 16.92s 初始＋2.69s/5.56s 增量成功，当前 300 文件 / 12,969,816 logical B，tree hash `a9594c86ef7ae6504265b11db8ad8a7caf4df1bab7dd8c7d6685032a74fbf8dc`；当次有限源/当前产物读回。BFF24040/IDE13736保原；一次官方 screenshot 35s到期仍无页面证据，未新增 SDK 请求。详[当前增量身份](p1-current-watch-incremental-readback-2026-10-05.json)。

只读[机器归并](q2-optical-milky-way-consumer-readback-2026-10-05.json)核原 before/after、严格原像素、反例、新 HTTPS 结果和范围；不重复 build/HTTP/SDK。唯一后续以 PLAN 为准；所有 33 项仍完整保留。已知 FAILED、历史第三 null UNKNOWN、新版月面/Android/iOS、独审/完整交互图质、真实发布引用和物理资源/200DAU 未因本小样改变。
