# SDSS corrected-frame 离线 owner 与消费者接口只读核查（2026-10-02）

本报告服务唯一 PLAN 第 2 步；是接口提案和当前代码事实，不是第二计划、已采用的新出版合同、画质验收或部署证明。读取了当前 AGENTS.md、PLAN.md、global/context.toml、architecture/runtime-and-domain、maintenance-boundaries、external-capabilities，以及既有 SDSS 原始来源、配准和成本证据。未下载影像、联系来源、安装依赖、启动 IDE，未改生产代码、资产、PLAN 或 Context。商业排除与 6 项保留修改保持。具体 cached corrected-frame 输入取得/覆盖证据由本轮来源审计负责，本报告不从旧 JPEG 或中心 footprint 推断原帧已经齐备。

## 当前可以复用的责任

- `data-pipelines/deep-sky/image_quality.py:31/57/84/161` 已有完整 encoded decode、输入集合/字节绑定、catalog/north-up TAN 几何及 display diagnostics。它不生成像素、不判断质量通过。
- `allwise_finite_tan.py:42/78` 的 FITS reader/TAN renderer 仅适用已核 AllWISE 512² float32 HiPS 与 NESTED 取样，不能伪装 SDSS corrected-frame adapter；其逐级独立 percentile 灰阶 stretch 也不适合作 gri 同色 master。
- 已缓存 Astropy 8.0.1 的 `astropy/wcs/wcs.py` 有完整 WCS 坐标变换；`astropy/visualization/lupton_rgb.py:667` 有成熟 `make_lupton_rgb`。源码明确要求三输入预先配准、同大小和像素尺度；默认用 `ManualInterval(vmin=0)`，支持固定 stretch/Q/interval，不会替调用者识别覆盖、修复缺源或配准。保持 g→B、r→G、i→R 的实际声明；这是历史光学显示组合，不声称自然真彩或实时测光。`filename=None` 可返回数组，PNG 编码继续用已存在 Pillow；无需为本次试验引入新图像框架或绘图库。
- 现有 `useSkyNativeImages`、`startSkyArtworkRequest`、`sky-gpu-textures` 已接受 PNG/JPEG 和实际尺寸，拥有同 Canvas/publication 代次、双并发、迟到取消、冷文件、重解码和 GPU 释放。注册平面和 GPU artwork shader 已消费 RGBA `source.a`。

## 最小单 owner 提案：先离线真实小路径

一个来源特定的 cached SDSS corrected-frame owner 调用共同 encoded/geometry quality owner；不增每个星系自己的处理函数。来源 adapter 负责真实文件/校准/WCS/掩码解释，其后的目标 TAN、same-master、显示处理和三级导出在同一 owner 中运行。初次只处理完整、权利已核、实际覆盖足够的代表输入；拒绝未支持的源单位、校准或 WCS，不能用便利线性近似掩盖未知变换。

输入 receipt 至少绑定 release、band、run/rerun/camcol/field、URL、完整文件 bytes/SHA、实际 HDU/array shape、单位/校准与 sky subtraction 状态、实际 WCS/header 哈希和原有质量/掩码说明。完整 acquisition 集合在重投影之前验证；缺了应需文件是取得未知，不能填 NaN 再把它报告成天文缺测。SDSS 原帧可能旋转或带其它变换，应由 Astropy 的实际 WCS 转到已定义的目标 TAN，不把原帧 header 原样送到当前限定 north-up consumer。

统一目标 WCS 的浮点 gri science master 是一级事实：catalog identity/center、north-up/east-left、明确 CUNIT/CD/CRPIX、行翻转，以及实际 footprint 边界。重采样 kernel、有效邻点规则、跨 frame overlap 的选择/权重规则均需显式绑定；受 mask 或缺少所需插值邻点的输出保持不足，不跨孔洞插值成实测有效。最小试验不用未采用的复杂全空域拼接系统。

三级展示从同一 master 的一次固定颜色/动态范围 transfer 导出，记录 master 内容身份、目标 WCS、crop 和采样核；不为 overview/medium/detail 各自重新算 percentile 或归一化 RGB。可先同色 RGB master → 登记 crop → 有界降采样；RGBA 降采样需正确处理 premultiplied color，避免透明邻点颜色泄漏。science footprint/finite 的统计仍由 science master 独立生成，不能由展示 RGB/PNG 的重采样反推。细档的有限 field 之外由同出版 wider field 保留真实外围。当前 512px 只是已有消费者约束；真实分辨率按输入 scale、PSF/seeing 和完整范围评估，不拿升采样创造细节。

## 必须分开的 science sidecar 和 display contract

建议初次 task-only sidecar 用实际数组/掩码内容身份，至少包含下列独立语义，字段名仅是提案：

| 事实 | 来源与含义 | 禁止替代 |
| --- | --- | --- |
| acquisition | 计划需要的各 band/frame 文件实际齐备且完整 | 下载缺失不能成为 science NaN |
| per-band footprint | 实际源 WCS 投影可供该目标像素取样的几何范围 | 请求中心在 footprint 不证明完整 field |
| per-band sample availability | 实际取样值 finite/nonfinite；保留 finite 0 和 finite 负 flux | 黑、暗、负值不能判成缺测 |
| joint gri availability | 三波段实际支持同一 RGB 像素；缺一 band 保独立状态 | 不用其它 band 猜色补出缺 band |
| source quality | 实际提供的坏像素/饱和等标志，未知保持 unknown | finite 不等于 science-valid/artifact-free |
| display processing | Lupton/transfer 参数、展示 alpha、blend mode、edge treatment | 展示淡出不减少 science finite 数量 |

发布 science sidecar 时以其自身 bytes/SHA、WCS 和 master/source hashes 绑定。display PNG alpha 可以表示 `jointAvailability × displayOpacity`，但这样它已经不是 binary finite mask；展示 alpha 的 0/小值不能记成 missingPixels。也可保留纯 availability alpha，另在显示 contract 指定 additive transfer。两种方案都必须把 source/finite 事实完整保存。

当前 `image_quality.inspect_image(expected_finite=...)` **不能直接复用来认证含显示渐隐的 gri PNG**：它严格要求 `alpha == finite × 255`，且 `sourceFiniteMask.kind == NONFINITE_HIPS_SAMPLES`。把显示 alpha 塞入这里会破坏已核 M42 科学语义。初次离线 trial 用独立 science sidecar/数组核验，展示输出调用现有 `inspect_image` 的 encoded/geometry/diagnostics，不提交假 HIPS mask、不把其 `UNKNOWN` 改成已核覆盖。后续必要的共同 quality 扩展应区分 science availability 输入与 display alpha 输入，并保旧 HIPS 规则。

## M51 背景矩形的可验证处理

当前原 JPEG 的光学 `source-over` 会把有效黑背景覆盖到蓝天空；GPU 只是 8% 源 UV taper。扩大 taper 会剪真实外层结构，且不能解决同 master、色彩和源分辨率。既有 JPEG 不能支持真实 per-band science mask，亦不能证明 sky pedestal。

对实际已校准/去 sky 的 gri 源，先固定一次显示 transfer，比较两条 task-only 实图路径：

1. 保留 availability alpha 的 RGB，用明确的 additive 天体发光显示；黑值不改变背景，但不是 opaque 光学照片的最终颜色。
2. source-over RGB 加独立 display opacity/背景 transfer；若 opacity 依据实际去 sky signal/noise，则明确这只是显示阈值/曝光，记录参数及对微弱外围的影响，不把它称为缺测或真实天体边界。

选择必须由相同 source master/WCS/field 的真实昼、暮、夜整场及粗细 overlap 对比决定：外层旋臂/伴星系和邻近恒星不能被“消矩形”一起删除；不空填、不 AI 补纹理、不逐图抠 mask。不能只以矩形消失或图像更亮判完成。尚无足够 sky/噪声依据时保 unknown，不能再对已去 sky 的源盲目减一次背景。这个报告不提前采用其中一种方式。

## 当前 PNG/TAN 消费者的实际兼容性

底层能力够用，**当前 SDSS 端到端合同不直接兼容新 gri 派生产品**：

| 当前代码依据 | 实际限制/必要扩展 |
| --- | --- |
| contracts `sdss-optical-publication.ts:11/26/30/46/63` | registry 只承认 6 个现有固定 v1 identity、原 JPEG/request 几何；新 source/master/WCS/mask/display 元数据必须进新 schema/hash canonicalization，不能默默附加当前 hash 未绑定的字段 |
| BFF `sdss-optical-imagery.ts:15/32/75` | 每 reference 只有一个 current publication；hash 反查 current registry；get 固定 JPEG SOI/EOI 和 image/jpeg。新产物必须新不可变 identity，并保旧 hash/files/offers；需要双版本索引和 opt-in discovery，不能直接改旧 M51 默认 |
| `use-sky-sdss-optical.ts:21/28/32` | 全部资产固定 width/height512、format jpeg。新 contract 指定 PNG/实际尺寸/几何，迁移 resolver/预算与 fallback；已有 shared request 可复用，无新下载/解码队列 |
| `sky-scene-render.ts:214/225` | 固定512/CRPIX256.5。新产品可先选择相同已声明的 north-up centered TAN，仍走 `registerSkySurvey`；实际 field 必须由 `2*atan(N*abs(CDELT)*rad/2)` 绑定，不能只以 N*scale 近似充当确切 field |
| `sky-survey-registration.ts:20` | 当前限256/512和field≤4°，单一对称 CRPIX；支持目标 master 中心与 catalog center一致的 north-up产品。源任意WCS先离线重投影，不新增全 WCS runtime。更大分辨率/非对称原点需要实际消费者范围扩展和资源验证 |
| GPU `sky-gpu-renderer.ts:122/941` | alpha 与光学 source-over 已有，但只认 composite 枚举；新 display mode 要以已核产品语义映射，不能让光学和 W3 同目标同时叠加。现在提交 artwork 成功只证明 pass，不证明视口内有实际颜色/alpha贡献 |
| `sky-image-display-support.ts` / artwork eligibility | encoded RGB support 是保守显示证书，独立于 science；对 additive零RGB可复用其显示语义。新 alpha/transfer需按实际 contribution更新资格/已绘来源，不能仅看 field cap 而署名一张实际全透明图 |
| `bare-sky-resource.ts` | 路径验证允许jpg/png，但stem只允许字母数字/_-/，不允许额外点。可保持平面 hash URL/file命名，别直接复制 AllWISE 的 `name.<sha>.png` 再声称路由兼容 |
| `celestial-object-information.ts:153` / `use-celestial-information.ts:6` | SDSS 来源当前总查 reference 的 current；W3已有selected publication，SDSS尚无对应选择。增加历史/新版本后，modal/source/cache必须绑定实际 painted optical hash，不能显示 newest provenance |
| `api-client.ts:1026` | download offer只认当前registry的 exact optical sourceId。旧offer和新offer均须可解析，延续实际署名、许可、改作说明和 manifest下载 |

这些扩展均属于现有 sky publication/request/scene/information owners 的真实职责；不需要通用任意来源框架、不改设置页面、不重开来源选型。初次离线 trial 尚不需要实施整个表；应先用真实完整输入验证 same-master、science/display 分离与整场改善，再让新合同明确兼容消费者。既有旧原图和 source offer 保持原 bytes/SHA/身份。

## 本次核查的完成边界

报告依据当前实际源码和 cached Astropy 源码；没有执行新 corrected-frame 重投影、Lupton输出、原生绘制、旧/新 HTTP互操作或资源压测，不将可行接口当实际质量通过。SDSS 原始商业许可已确认的范围和未知批量/成本仍按 external-capabilities 与旧证据保留。M51精准配准、M82未取得输入、所有异常图质、目标runtime、200 DAU容量与最终完整体验仍开放。
