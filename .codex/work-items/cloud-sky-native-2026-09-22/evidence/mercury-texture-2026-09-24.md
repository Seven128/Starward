# C05 水星历史表面图：来源、代码、验证边界

USGS Astrogeology 的 [MESSENGER 2013 250m 灰阶全球拼图](https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m)逐项写明 **Public domain**、`Please cite authors`、`100% coverage`，并说明 750 nm 单波段、极区填补、星心纬度、正东经 −180°～180°、等距柱状投影。官方 [WMS 图层目录](https://astrowebmaps.wr.usgs.gov/webmapatlas/Layers/maps.html)把它对应到 `MESSENGER_May2013`，不是另一个缺极区的 `MESSENGER_Color`。下载源后原样固定为 1024×512 JPEG：

`https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mercury/mercury_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MESSENGER_May2013&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg&TRANSPARENT=FALSE`

响应 200/image/jpeg、89984 bytes、SHA-256 `b782316d7458df90198d8e9664abb3902841c0709085bd20f03e46706a252d81`。原字节在任务 evidence `mercury-wms-MESSENGER_May2013-minus180-1024x512.jpg`，生产副本和清单在 `workers/miniapp-api/assets/mercury/`。已目视这张原始导出图：灰阶全球地图，极区有填补但靠近边缘仍有少量黑白/重采样伪影，不等同于无缺陷科学地图。另下载并目视 `MESSENGER_Color` 及 `MESSENGER` 对照；彩图北极白色大缺片，未加入生产。GetCapabilities 在 `mercury-wms-capabilities.xml`。源资料给“100% coverage”是原地图覆盖声明，不能从 1024 JPEG 推断每个像素精确地形。

新增 BFF 哈希绑定同源 manifest/JPEG；Mini 精确报告帧传水星 IAU 本体轴，容错旧/坏轴只回退纹理而保留位置与相位；现有球面着色器的灰阶采样、原生图片/GPU 生命周期、来源披露和失败／刷新失败重试共用月/火责任。历史 750 nm 图没有自然彩或实时表面含义。天文报告缓存标识升 v12。详情页文案和产品／架构／外部数据 Context 同步，不引用失效设计稿。

定向 API 15/15，Mini 绘制/帧/清单 25/25；第一次新增 Mercury 场景测试因传参多一个 `undefined` 而失败，修正测试入参后通过。新增报告轴坏值与放大门槛测试通过。全量 API 357 通过/11 跳过/0 失败，Mini 822/822；三包 typecheck、SDK check、Context validate、隔离 WEAPP 构建通过。构建日志 `mercury-isolated-weapp-build-2026-09-24.log` 有既有 CSS 顺序和较大 chunk 警告。生产镜像 `starward-miniapp-api:mercury-local`（manifest list `sha256:477ee9d239426c74951e242794cf30145dcee4b8ee60ac8c10b40b2803d59864`）构建成功，容器内新 JPEG/清单的字节与 SHA 同工作区。HTTP 真实字节、旧哈希 404 由 Nest/Fastify 测试证实；镜像内资源检验不是镜像对外 HTTP、商业云发布或设备出图。

`mercury-visibility-probe.mts` 用深圳大鹏样例点和 2026-09-16～10-08 的 23 个本地日期；原夜间采样未碰到水星地平线上方，另加每 2 小时精确帧后找到 10 月 8 日 18:00 本地（10:00 UTC）水星高度 +15.028235°、太阳高度 −0.127°、水星角直径 6.293484″，在 780px 高／0.15° 视场约 4.55px 半径。这个狭窄暮光时机可达现有 4px 请求门槛，但不是肉眼可见性或目标原生像素；更早的时段主要在白昼。当前可选窗口无法据此声称常见夜晚均能看到贴图。

本轮还尝试独立官方 WeChatIDE 窗口 `s4`：隔离构建指向只在本机 18791 的测试容器，HTTP 清单 200；打开 `dist/weapp-check` 后 `automation_runtime_info(currentPage)` 超过 90 秒未返回，与上一独立窗口 `s3` 同机制。终止等待并关闭 `s4`，停止自动删除的 18791 容器。没有微信原生页面状态、图片请求或水星像素结果。用户源窗口、共享 8787、Android/无线调试/二维码均未触碰。后续须先解决独立 IDE 运行时连接或在可使用目标设备时验证水星可见帧、实际贴图、来源页、失败回退与资源峰值；不重复相同无界等待。

### 2026-09-24 续行：打包镜像 HTTP 与独立 IDE 状态

对独立 `weapp-check` 项目改用 `fullMode` 后，官方截图调用可快速返回，但画面仍是开发者工具欢迎页；`simulator_open_page`、`simulator_refresh` 返回触发成功后依然如此，`currentPage` 查询曾卡住。把隔离副本临时改成唯一项目名并移除无效的 `srcMiniprogramRoot` 后，结果仍相同；已关闭该独立窗口并恢复隔离配置。截图在 `isolated-fullmode-connect-2026-09-24.png`、`isolated-refreshed-2026-09-24.png`、`isolated-unique-project-2026-09-24.png`。这些证据把失败边界缩到隔离项目未进入小程序页面，不能说正式页面编译或新图原生像素通过；用户当前微信窗口没有被接管。

已构建的 `starward-miniapp-api:mercury-local` 镜像在独立 `127.0.0.1:18792`、512 MiB、`LOCAL/MEMORY_TEST` 容器真实服务。扩展现有 `galactic-image-http-probe.ps1` 的参数后，清单 200/no-cache；哈希路径 JPEG 200/`image/jpeg`/89984 B/一年 immutable，实际 SHA-256 与清单 `b782316d7458df90198d8e9664abb3902841c0709085bd20f03e46706a252d81` 一致；旧哈希及错误文件均 404。原始输出 `mercury-image-container-http-2026-09-24.json`。容器已停止并 `--rm` 移除，18792 无监听；没有改共享 8787、手机或生产云。此项补足发布镜像的真实 HTTP 证据，仍不证明微信原生加载、贴图配准、视觉分辨率或目标机性能。

### 2026-09-24 续行：独立水星本体方向金标

用 [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) 查询 `COMMAND='199'`、`CENTER='500@399'`、`EPHEM_TYPE='OBSERVER'`、`QUANTITIES='14'`、`START_TIME='2026-10-08 10:00'`、`STOP_TIME='2026-10-08 11:00'`、`STEP_SIZE='60 min'`。实际服务回 `API VERSION: 1.2`，目标头明确水星 **West-longitude positive**；10:00/11:00 的 `ObsSub-LON` 为 195.312673°/195.521008°，换成源 WMS 的东经分别为 164.687327°/164.478992°。[Horizons 手册 quantity 14](https://ssd.jpl.nasa.gov/horizons/manual.html)说明这是考虑下行光行时的视盘中心次观测点，目标经度正方向以输出头为准。

`mercury-orientation-probe.mts` 对本地深圳 22.5°N、114.5°E、海拔20 m的真实 BFF 精确帧计算本体中心东经 164.679698°/164.471151°，分别差 0.007629°/0.007841°；原始数据在 `mercury-subobserver-2026-09-24.json`。`astronomy-golden.test.ts` 增加双时刻独立经度回归，15/15通过，BFF typecheck通过。这可检出大尺度东西翻转、错误本初子午线或过期一小时的自转帧；Horizons 使用地心，而产品样本用深圳站心，且量14纬度为 planetodetic，故不把小残差或纬度当成零误差金标。USGS JPEG 本身的地貌配准、微信 Canvas 实际纹理取样、手机像素和性能仍待验证。

同轮用 `mercury-webgl-probe.cjs` 从**当前生产源码原样提取** `imageVertex`、`skyRay` 与 `bodyTextureFragment`，用正式发布的 1024×512 JPEG 在 Chromium WebGL1/SwiftShader 绘 64px 试验圆面；中心、左右、上下五点的GPU读回灰度依次为178/180/169/129/172，与独立JS按正东经bbox、源图双线性采样和相位式算出的期望逐点相同。中心UV为约(0.95995,0.48493)，右侧越过正东经±180°接缝到u≈0.02140仍正确。原始结果 `mercury-webgl-probe-2026-09-24.json`，生成试验页 `mercury-webgl-probe-2026-09-24.html`。该有意放大的试验建立桌面WebGL1片元与源像素坐标关系，不能证明产品真实水星仅几像素时能辨地貌、微信原生图片上传/Canvas、设备色彩/性能或细地标实图配准。脚本和测试均未变动生产着色器。
