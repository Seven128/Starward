# C04 2MASS 历史近红外银河全景：本地交付链

本轮只补一条有独立公开使用条款的**历史银河近红外图**，没有恢复 DSS、Gaia DR3/EDR3 或 ESA 成品图，也没有宣称可见光全天高清。没有使用 Android、ADB、扫码、共享 8787、云部署或采购。旧 Sky 设计稿仍失效。

## 来源、投影与限制

- [IPAC Cool Cosmos 图像记录](https://coolcosmos.ipac.caltech.edu/images/142)将 2MASS 全天银河图称作银河中心居中的等距柱状全景，供球体贴图；原件 9600×4800。图库早期带椭圆边界和文字的 Aitoff 版未采用。
- [Cool Cosmos 图像使用政策](https://coolcosmos.ipac.caltech.edu/page/image_use_policy)允许其图像在无单独例外时用于任何目的、要求来源署名并禁止暗示 NASA/JPL/Caltech 背书；[2MASS 图库](https://www.ipac.caltech.edu/2mass/gallery/showcase/copyright.html)明确宣布图库图像为公有领域，并请求 2MASS/UMass/IPAC-Caltech/NASA/NSF 致谢。此判断限定为所选图库图像，不外推到其他 2MASS Atlas 数据或第三方瓦片。
- 原件 URL、SHA-256、加工版尺寸/字节/哈希和来源链接由 `workers/miniapp-api/assets/deep-sky/galactic-2mass/manifest.json` 固定；脚本 `data-pipelines/deep-sky/publish_2mass_galactic.py`拒绝源字节变化。加工版 JPEG 703,555 B，解码 RGBA 8 MiB，额外 GPU/设备内存与流量费用未测。
- 数据是历史 J/H/K 1.2/1.6/2.2 µm **近红外伪彩色**，不是自然可见光、实测天空亮度或当前地点可见性。使用用户当前精确观察帧把 ERFA 银河坐标轴转 ENU，再取图像中心 l=0、北向上、银河经度向左增大。已核对轴向和桌面着色器像素；更细的地标注册与目标手机画质仍开放。

## 代码与验证

- 固定 BFF 服务 `GalacticImagePublicationService`只从本地清单和 JPEG 发布 `/v2/sky/galactic/manifest` 及哈希 URL，拒绝改版哈希/错误文件。客户端再检验权利、投影、字节、来源及同源 URL，使用现有 Canvas 原生图片 owner 下载、写临时文件、解码、失败与重试；页面披露原图、许可和署名。夜间广角普通模式绘图；资源缺失或 GPU 失败回退原银河方位示意，红光不画。发布镜像原有 Dockerfile 已复制整个 `workers/miniapp-api/assets`；本轮在新镜像内另作确认。
- `galactic-image-publication.test.ts`：固定字节/哈希、真实 Nest/Fastify HTTP 200 JPEG 和旧版本 404，2/2。客户端清单拒绝错误投影、权利链接及远端图 URL。`sky-galactic-band.test.ts`校验几何轴与同刻、夜间/红光边界；Canvas frame 测试确认图像传至绘制责任。定向 Mini 20/20；完整 Mini 819/819、Mini API 354 通过/11 跳过/0 失败、三工作区 typecheck、SDK 生成校验、Context 校验、diff check 全通过。原始 Mini 日志 `galactic-2mass-mini-tests-2026-09-24.log`。
- `galactic-webgl-probe.cjs`提取**生产文件原样** `artworkVertex`、`skyRay`、`galacticImageFragment`，Chromium WebGL1 上传**正式 JPEG**后按同样 additive blend 绘制；银河中心、北侧和侧方三个像素分别为 `[54,38,31]`、`[2,2,3]`、`[46,35,26]`，与源图位置和 0.24 混合强度的期望每色差≤1，无 GL 错误。原始数据 `galactic-webgl-probe-2026-09-24.json`；它证明桌面 shader/取样，不证明 WEAPP 原生 Canvas 或手机合成。
- 隔离 WEAPP build 退出 0，日志 `galactic-2mass-build-2026-09-24.log`；保留已有 CSS 顺序及包体/webpack 性能三类 warning。未在当前用户开发者工具窗口做页面验证，避免改动共享服务或占用其另一需求。
- 本地新生产镜像 `sha256:1481282a09065b086ef4d798a7ce151ff0122a9f98d472662d8df2b4e35b89e4` 构建通过，镜像内 JPEG SHA-256 `e3a70f835197c6a6965871fc4224635aa5d04a4874d2fa1c177a9a1470d1e2a0`、清单 SHA-256 `f6aeb37d4724ed296ffb4c22f242bbdc83541b54aa1cb67b83e82b9e2d91ac5e` 与工作区相同；原始 build 日志 `galactic-2mass-docker-build-2026-09-24.log`。
- 复核 W3 与 2MASS 同帧资源后，发现 12 MiB + 8 MiB 解码纹理超过当前 16 MiB 缓存预算。页面在用户开启 W3 且 FOV≥60° 时暂停 2MASS 加载；scene 也在有 W3 瓦片时拒绝同时提交 2MASS 图，缺图保留示意背景。定向 19/19、Mini typecheck、修订后 Mini 全量 819/819、隔离 WEAPP build、Context validate 和 diff check 均通过；最终原始日志为 `galactic-2mass-mini-tests-final-2026-09-24.log`、`galactic-2mass-build-final-2026-09-24.log`。Context 和页面文案同步。

### 后续独立复核（同日 Goal 续行）

- 用该**构建镜像**单独启动 512 MiB `LOCAL/MEMORY_TEST` 容器，只映射 `127.0.0.1:18791`；`galactic-image-http-probe.ps1`取得真实 HTTP 清单 200、JPEG 200/`image/jpeg`、703555B 与声明 SHA 完全一致，清单 `no-cache`、图像 immutable 一年；旧哈希与错误文件均 404。原始结果 `galactic-image-container-http-2026-09-24.json`。容器已停止并按 `--rm` 移除，共享 8787 和用户当前容器未改；此项仍不是云部署或微信原生加载。
- [SIMBAD LMC](https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=LMC) 的银河坐标 280.4652°/−32.8884°、[SMC](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Small+Magellanic+Cloud) 的 302.8084°/−44.3277°，独立于图像。按所用等距柱状式预测图上中心分别约 `(1476.46,699.10)`、`(1349.36,764.18)`；正式 JPEG 12px 邻域灰度均值分别 23.50、11.80，水平/垂直/双轴镜像点约 6.58–8.27。结果 `galactic-landmark-2026-09-24.json`，脚本 `galactic-landmark-probe.py`。这支撑大尺度经纬方向与图中两团相符；图库视觉中心、有限分辨率、Cloud 扩展形状与采样窗口仍不足以声称角秒级或微信原生绝对配准。
- `sky-galactic-band.test.ts`加入 SIMBAD 两点作为正向方位回归；后端增加同一 publication owner 的本地 JPEG 损坏拒绝→原字节恢复成功。定向 Sky 4/4、BFF 3/3 与受影响 typecheck 通过；全量 Mini 与隔离 build 是更早一次未改产品绘制逻辑的结果，新增两项仅是独立测试。

## 当前边界

银河近红外历史图的源→加工→BFF→Mini 加载→GPU 指令代码已接入；真实微信 Canvas 出图、图像相对已知天区地标的更细配准、Android/iOS 画质/性能、相邻 W3 图层同时加载峰值、上线流量/存储费用和独立审查仍需证据。C04 完整大气与真实地景以及整体 Goal 继续开放。
