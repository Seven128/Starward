# C：SDSS 定点光学图候选（2026-09-25）

## 可用权利与准确边界

- [SDSS 官方 Image Use Policy](https://www.sdss.org/collaboration/image-use-policy/)明确允许 SDSS 网站影像下载、链接和任何用途使用，条件是保持图像署名；图像按 CC BY 提供，默认署名 Sloan Digital Sky Survey，不得暗示其为产品背书。公开 data release 数据另被该页表述为 public domain。这比从“免费 API”推商用权利更直接；但每张成品仍须证实确属 SDSS 自有影像并在显示处提供署名、许可链接和必要改作说明。
- [SDSS 官方 SkyServer JPEG 生成说明](https://www.sdss4.org/dr16/imaging/jpg-images-on-skyserver/)确认 ImgCutout 是以官方 g/r/i FITS 帧构建的 RGB JPEG，按所请求 RA/Dec、尺寸和尺度拼合裁剪，中心在所请求坐标。此处的实际样本来自官方 DR17 SkyServer `ImgCutout/getjpeg`，未选择网页标记/第三方图层。
- [DR18 Imaging](https://www.sdss.org/dr18/imaging/)称历史成像唯一覆盖面积 14,055 平方度，DR18 无新成像；不能将这些 M51 定点图宣称全天高清或任意方向可用。[DR18 Imaging Tools](https://www.sdss.org/dr18/imaging/tools/)称旧覆盖/马赛克 web app 已废弃；大量/广域加工需 CAS footprint/field 查询和 SAS 原始帧等正式路径，当前未确立公共 ImgCutout 的持续批量抓取额度、运行容量和自托管成本。

## 真实样本与数值核对

输入为本项目 OpenNGC M:51 中心 RA=202.469625°、Dec=47.1951666667°。官方 DR17 `https://skyserver.sdss.org/dr17/SkyServerWS/ImgCutout/getjpeg` 请求 `ra,dec,scale,width=512,height=512`，不加 overlay；仅取三个视场和两个微小中心偏移作有界本机研究。原始 JPEG 在 ignored `artifacts/miniapp/cloud-sky-native/legacy-surveys-trial/m104-levels/`，不在生产包或服务，下载经正常 TLS 的 PowerShell Invoke-WebRequest，未绕过证书校验。

| 文件 | 尺度 | 对应宽度 | 字节 | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `sdss-dr17-m51-512-0p4.jpg` | 0.4″/px | 3.4133′ | 19,784 | `a9f3884874773293589bedac159ac0d1d479f9cf8130e21c74ebcaf6a7cc9447` |
| `sdss-dr17-m51-512-0p8.jpg` | 0.8″/px | 6.8267′ | 24,076 | `eee315a0e76c58d5ba67072764d54c7cfa7979c8f060cce8e548150aba497de0` |
| `sdss-dr17-m51-512-1p6.jpg` | 1.6″/px | 13.6533′ | 20,492 | `c98129d2ea984cf4106b14b325f355df149f36fe30c2c8ecbcdd0d3733ff81c6` |

三张均实际解码目视：0.4″ 层清晰呈现 M51 主星系；0.8″ 层主星系较完整；1.6″ 层主星系、伴星系与周围星点可见。该结论仅限三张成品样本的视觉可辨性，不是色彩/光度真实性、原生目标画面或 SDSS 全覆盖准入。另取同尺度 RA +0.01°、Dec +0.01° 两张 512px JPEG（20,052/20,925 B），用现有 `jpeg-js` 解码灰度并以高通相位相关配准。相对于固定天空特征，请求中心 RA 正移对应影像内容 x 正移约 61px，Dec 正移对应 y 正移约 90px，与东左、北上预期的 `36 cos(47.195°)/0.4≈61`、`36/0.4=90` 一致。这个整数像素平移只核局部方向/尺度，未验证源图像中心的亚像素 CRPIX、边缘 TAN 畸变或真实微信投影；不能把中心误差臆写成零。

## 准入决定与下一链

SDSS 官方定点 JPEG 比本轮 Legacy M51 缺测中心和色差样本更适合作**M51 单目标多级光学候选**。研究阶段先要求独立出版 owner 固定源 URL/哈希/几何、随图可见署名和失败保留 W3，再进行页面接入；下节记录这一有界本地实现。扩到其他目标/连续铺瓦前须逐方向核有效图/质量、正式数据获取方式和容量/费用。PS1/SkyMapper CDS 成品与 Legacy 其它目标的未决不因 SDSS M51 候选而解除。

## 随后的本地代码/资产接入（覆盖上段“未进入普通客户端”的历史状态）

本次**仅此 M51**三张原始 JPEG 被复制到 `workers/miniapp-api/assets/deep-sky/sdss-m51/`，共 64,352 B；`manifest.json` 固定源请求 URL、中心/尺度、字节/SHA、CC BY 4.0 来源和处理说明。`SdssOpticalImageryService` 是独立于严格 AllWISE W3 出版物的 owner；校验目录身份、来源/许可、三个尺度和实际 JPEG 字节，提供 hash-bound 当前/固定清单和同源图片。资料页只给 M51 增加 SDSS 来源，原 W3 来源仍在；M31 不能领取 M51 影像。正常商业客户端已加入 M51 在 ≤0.3° 三档选择：复用现有 `useSkyNativeImages` 请求/解码/Canvas 代次/释放，光学位于 W3 上层；失败/缺图保留已独立加载的 W3，红光隐藏两层，光学 credit 在对应图片进入当前已提交 Canvas 帧后可见。来源页可复制固定清单与许可 URL。仅该层保留至多两张 512² 解码图的 2 MiB 缓存预算；GPU 纹理由共享 owner 另行管理，整页 CPU/GPU 峰值仍需量。

服务端当前源码 typecheck 和 `build:release` 退出0；编译后生产条件导入确实从部署相对路径读到 DETAIL 19,784 B，出版哈希 `5c068fae55a47444724767777532ce6af1b6555c41ca2afdcceed9e9ae762eff`。正式 Nest/Fastify 注入 HTTP 测试从 M51 资料→固定清单→三张实 JPEG 都返回200且 SHA/字节匹配，错目标/错层/错哈希404；W3资料不丢。Mini 32项相关页面/影像生命周期/光学选择与失败回退检查通过，Mini typecheck退出0；隔离正式 WEAPP 构建 `weapp-check-sdss-m51-0925` 成功，257文件、总4,418,101 B、主包原始2,070,402 B（距2MiB原始字节26,750 B），既有 CSS 顺序和两项 webpack 大块/异步建议 warning。此原始文件和不等于微信官方包体。Dockerfile现有整目录 `assets` 复制规则涵盖新文件，但没有部署或远端 API 读回。

本地编译服务直接生成的 JSON 清单序列化长 2,544 B；三档图片分别 20,492/24,076/19,784 B，全部请求总源体 64,352 B，**不含** HTTP 头、既有 W3、重试、CDN/云计费。实际普通客户端只按焦点和当前视场请求一档，跨三档的单次浏览上界在无额外重试且无缓存命中时才达到全部源体；不是人均流量或生产账单预测。每张 512² RGBA 解码约1MiB，新层两张保留预算2MiB，W3及页面其它纹理另计；目标手机峰值仍未测。

仍未验：SDSS JPEG 几何中心的亚像素原点和手机星点重合、真实 WEAPP 光学与 W3 合成/可见署名/来源返回、失败重试在微信目标运行时、0.05° 画面质量与帧/内存/流量。页面当前用官方“请求坐标居中”语义推断偶数尺寸的几何中心 CRPIX=256.5；先前 ±0.01° 相关仅支持方向与尺度，不构成此 0.5px 假设的独立精度证明。**这是一条已实现但尚未目标验收/发布的定点链**，不扩大至全天或更多目标，不把本地构建当产品完成。重大共享资源 owner 的独立审查仍属 P5。

恢复审查发现两个清单数值校验缺口：`center.raDeg/decDeg` 缺失或为数值字符串、层 `fieldDegrees` 缺失时，原 `Math.abs(... - expected) > tolerance` 会让 `NaN` 比较返回 false，错误地放行无效外部字段。Mini 回归先在坏清单上失败；现在 Mini 与 BFF 出版入口均先检查 `Number.isFinite`，再比较确切值。修后 Mini 相关场景/清单/Canvas 19项、BFF 三图真实 HTTP 1项、两包 typecheck 均通过。这个修复只证实结构拒绝，不代替目标图像配准；现有共享资源 owner 在失焦/缩出资格时已同步清空值并释放图像，额外重置补丁经复核无必要，未保留。

本轮对正式渲染又发现一个可见来源边界：切换焦点或精度时，旧 SDSS 像素可留在 Canvas 直到新帧完成，而页面原先只在当前请求图像等于旧提交图像时显示署名。现在绘制 owner 将**实际接受的** SDSS artwork 图像身份交给提交帧；页面来源状态跟随仍可见的最后一帧，GPU 拒图、无图、红光帧及 Canvas 隐藏不虚报光学图像。请求失败/加载仍在没有已绘光学帧时显示重试/载入，独立 W3 不受影响。新增场景回归覆盖成功、GPU 拒图、焦点切换、细层等待、隐藏与红光；临时恢复旧的“必须仍被请求”判断，焦点切换断言确实失败，恢复后通过。Mini 全量 877/877、类型检查、隔离正式 WEAPP 构建 `weapp-check-sdss-credit-0925` 通过；构建仍有既有 CSS 顺序和 webpack 尺寸/性能提示。尚无目标手机光学图或动态切换可见性证据，不能据本机回归宣布 C 目标验收。

2026-09-25 中心叠层窄核：按相同 DR17 M51、0.4″/px、512² 请求官方 `ImgCutout/getjpeg`，仅加 `opt=G` 一次，返回实际 JPEG 21,637 B，SHA-256 `6b5df8a8974179db2051e790a665ffb76764460586eb04edd191e12e112bb53b`。官方 [SciServer 客户端说明](https://github.com/sciserver/SciScript-Python/blob/master/py3/SciServer/SkyServer.py)写明 `G` 网格穿过请求中心；本地逐像素比较无标记正式原图与叠层图，在 x/y=80..209 段的中心亮度增量均集中于 **0-based 第256列/行**（x 第256列约7,492，邻第257列约63；y 第256行约7,990，邻第257行约-111），也目视见中心十字。由此排除整像素以上的中心偏移；但叠加笔画的栅格化及 JPEG 压缩不提供 FITS WCS CRPIX 定义，不能由绿色线把当前 **256.5** 亚像素假设判为精确。另一个 SDSS Marvin 客户端[近似 WCS 实现](https://sdss-marvin.readthedocs.io/en/2.8.2/_modules/marvin/utils/general/bundle.html)用 `size_pix/2` 并自称 nearly-correct，同样不能代替 ImgCutout 服务的精确变换。暂不改生产配准几何；下一步仍需在目标微信画面用同天体星点/中心作独立叠合或取得服务精确 WCS。私有临时网格 JPEG 仅供本次核查，未进入生产资产/普通小程序。
